import { and, asc, eq, min, ne, sql } from "drizzle-orm";
import { z } from "zod";

import type { Database } from "../db/connect";
import { products, productVariants, type ProductVariant } from "../db/schema";
import { MAX_FILS, parseAedToFils } from "../money";

// A product's variants (M10): the ways to buy it, such as the NANOCORE's Device only,
// Starter Bundle and Custom Tone Bundle. They share the product's stock and status, so
// there's nothing to hold or sell per variant. The product's own price is kept equal to
// its lowest active variant price, so the shop's cards, filters and sorting ("from")
// work unchanged. Callers revalidate the catalog afterwards.

export type VariantProblem = "not_found" | "product_not_found" | "kind";

export class VariantError extends Error {
  override name = "VariantError";
  constructor(readonly problem: VariantProblem) {
    super(problem);
  }
}

/** Guitars are one instrument and add-ons one service: neither has variants. */
export const kindHasVariants = (kind: string) => kind !== "guitar" && kind !== "service_addon";

const blankToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;
const money = z.string().transform((value, ctx) => {
  const fils = parseAedToFils(value);
  if (fils === null || fils > MAX_FILS) {
    ctx.addIssue({ code: "custom", message: "Enter an amount in AED, like 299 or 1,250.50" });
    return z.NEVER;
  }
  return fils;
});
const tick = z.preprocess((value) => value === "on" || value === "true", z.boolean());

const variantSchema = z
  .object({
    nameEn: z.string().trim().min(1, "Required").max(80),
    nameAr: z.preprocess(blankToUndefined, z.string().trim().max(80).optional()),
    priceFils: z.preprocess(
      (value) => blankToUndefined(value) ?? "",
      money.refine((fils) => fils >= 0),
    ),
    compareAtFils: z.preprocess(blankToUndefined, money.optional()),
    customToneSlots: z.preprocess(
      (value) => blankToUndefined(value) ?? "0",
      z.coerce.number().int("Whole numbers only").min(0).max(10),
    ),
    includesPack: tick,
    featured: tick,
    active: tick,
    sort: z.preprocess(
      (value) => blankToUndefined(value) ?? "0",
      z.coerce.number().int().min(0).max(10_000),
    ),
  })
  .superRefine((value, ctx) => {
    if (value.compareAtFils !== undefined && value.compareAtFils <= value.priceFils) {
      ctx.addIssue({
        code: "custom",
        path: ["compareAtFils"],
        message: "The earlier price must be higher than the price",
      });
    }
  });

export type VariantInput = z.infer<typeof variantSchema>;

export type VariantFormResult =
  { ok: true; data: VariantInput } | { ok: false; errors: Record<string, string> };

/** Reads the variant editor's fields. Tick boxes that are absent are false. */
export function parseVariantForm(form: FormData): VariantFormResult {
  const fields = Object.fromEntries(
    [...form.entries()].filter(([, value]) => typeof value === "string"),
  );
  const parsed = variantSchema.safeParse(fields);
  if (parsed.success) return { ok: true, data: parsed.data };
  const errors: Record<string, string> = {};
  for (const issue of parsed.error.issues) errors[String(issue.path[0])] ??= issue.message;
  return { ok: false, errors };
}

function columns(input: VariantInput) {
  return {
    nameEn: input.nameEn,
    nameAr: input.nameAr ?? null,
    priceFils: input.priceFils,
    compareAtFils: input.compareAtFils ?? null,
    customToneSlots: input.customToneSlots,
    includesPack: input.includesPack,
    featured: input.featured,
    active: input.active,
    sort: input.sort,
  };
}

/**
 * Sets the product's price to its lowest active variant price, with no earlier price
 * (each variant has its own). A product with no active variants keeps its price.
 */
export async function syncVariantPrice(db: Database, productId: number): Promise<void> {
  const [{ lowest }] = await db
    .select({ lowest: min(productVariants.priceFils) })
    .from(productVariants)
    .where(and(eq(productVariants.productId, productId), eq(productVariants.active, true)));
  if (lowest === null) return;
  await db
    .update(products)
    .set({ priceFils: lowest, compareAtFils: null })
    .where(eq(products.id, productId));
}

/** Only one variant of a product is "Our pick". */
async function clearOtherFeatured(db: Database, productId: number, keepId: number) {
  await db
    .update(productVariants)
    .set({ featured: false })
    .where(
      and(
        eq(productVariants.productId, productId),
        ne(productVariants.id, keepId),
        eq(productVariants.featured, true),
      ),
    );
}

export async function listVariants(db: Database, productId: number): Promise<ProductVariant[]> {
  return db
    .select()
    .from(productVariants)
    .where(eq(productVariants.productId, productId))
    .orderBy(asc(productVariants.sort), asc(productVariants.id));
}

export async function createVariant(
  db: Database,
  productId: number,
  input: VariantInput,
): Promise<number> {
  return db.transaction(async (tx) => {
    // Locked, so the price sync can't interleave with an edit of the product.
    const [product] = await tx
      .select({ kind: products.kind })
      .from(products)
      .where(eq(products.id, productId))
      .for("update");
    if (!product) throw new VariantError("product_not_found");
    if (!kindHasVariants(product.kind)) throw new VariantError("kind");

    const [{ next }] = await tx
      .select({ next: sql<number>`coalesce(max(${productVariants.sort}), 0) + 10` })
      .from(productVariants)
      .where(eq(productVariants.productId, productId));
    const [row] = await tx
      .insert(productVariants)
      .values({ ...columns(input), productId, sort: input.sort || next })
      .returning({ id: productVariants.id });
    if (input.featured) await clearOtherFeatured(tx, productId, row.id);
    await syncVariantPrice(tx, productId);
    return row.id;
  });
}

export async function updateVariant(
  db: Database,
  variantId: number,
  input: VariantInput,
): Promise<void> {
  await db.transaction(async (tx) => {
    const [row] = await tx
      .update(productVariants)
      .set(columns(input))
      .where(eq(productVariants.id, variantId))
      .returning({ productId: productVariants.productId });
    if (!row) throw new VariantError("not_found");
    if (input.featured) await clearOtherFeatured(tx, row.productId, variantId);
    await syncVariantPrice(tx, row.productId);
  });
}

/**
 * Removes a variant. Until online orders name variants (M13), nothing refers to one;
 * after that, switch it off (`active`) instead, so past orders keep it.
 */
export async function deleteVariant(db: Database, variantId: number): Promise<void> {
  await db.transaction(async (tx) => {
    const [row] = await tx
      .delete(productVariants)
      .where(eq(productVariants.id, variantId))
      .returning({ productId: productVariants.productId });
    if (!row) throw new VariantError("not_found");
    await syncVariantPrice(tx, row.productId);
  });
}
