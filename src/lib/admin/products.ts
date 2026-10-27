import { and, count, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";

import type { Database } from "../db/connect";
import { productCondition, productImages, productKind, products, type Product } from "../db/schema";
import { photoFileKeys } from "../images";
import { MAX_FILS, parseAedToFils } from "../money";
import { isBundledPhoto } from "../product-images";
import { bodyStyles, pickupLayouts, productSpecsSchema, type ProductSpecs } from "../product-specs";
import type { Storage } from "../storage/types";

import { uniqueViolation } from "./db-errors";
import { syncVariantPrice } from "./variants";

// Creating and editing products in the admin. Stock changes (hold, sell, restock) go
// through src/lib/inventory.ts; these only change what a product is and whether it is
// listed. Callers revalidate the catalog afterwards.

export type ProductProblem =
  | "not_found"
  | "slug_locked"
  | "slug_taken"
  | "sku_taken"
  | "listed_needs_price_and_category"
  | "guitar_single"
  | "addon_kind"
  | "not_draft"
  | "cannot_archive"
  | "not_archived"
  | "already_published";

export class ProductError extends Error {
  override name = "ProductError";
  constructor(readonly problem: ProductProblem) {
    super(problem);
  }
}

// ---------------------------------------------------------------------------------
// The product form

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SKU = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/;

/** A URL slug from a title: "Fender Strat '62 (Reissue)" → "fender-strat-62-reissue". */
export function slugify(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "");
}

const blankToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;
const optionalText = (max: number) =>
  z.preprocess(blankToUndefined, z.string().trim().max(max).optional());
const money = z.preprocess(
  blankToUndefined,
  z
    .string()
    .transform((value, ctx) => {
      const fils = parseAedToFils(value);
      if (fils === null || fils > MAX_FILS) {
        ctx.addIssue({ code: "custom", message: "Enter an amount in AED, like 1250 or 1,250.50" });
        return z.NEVER;
      }
      return fils;
    })
    .optional(),
);
const optionalInt = (min: number, max: number) =>
  z.preprocess(blankToUndefined, z.coerce.number().int().min(min).max(max).optional());

const formSchema = z
  .object({
    kind: z.enum(productKind.enumValues),
    categoryId: optionalInt(1, 2_147_483_647),
    slug: z.preprocess(
      blankToUndefined,
      z
        .string()
        .trim()
        .max(80)
        .regex(SLUG, "Use lower-case letters, digits and single hyphens")
        .optional(),
    ),
    sku: z
      .string()
      .trim()
      .transform((value) => value.toUpperCase())
      .pipe(
        z
          .string()
          .min(1, "Required")
          .max(30)
          .regex(SKU, "Use letters, digits and single hyphens, like G-0012"),
      ),
    brand: optionalText(80),
    model: optionalText(80),
    year: optionalInt(1900, 2100),
    titleEn: z.string().trim().min(1, "Required").max(120),
    titleAr: optionalText(120),
    descriptionEn: optionalText(5000),
    descriptionAr: optionalText(5000),
    techNotesEn: optionalText(3000),
    techNotesAr: optionalText(3000),
    condition: z.preprocess(blankToUndefined, z.enum(productCondition.enumValues).optional()),
    priceFils: money,
    compareAtFils: money,
    costFils: money,
    quantity: optionalInt(0, 999),
    inTheBoxEn: optionalText(1000),
    inTheBoxAr: optionalText(1000),
    // A tick box: "on" when ticked, absent otherwise.
    placeholderPhotos: z.preprocess((value) => value === "on" || value === "true", z.boolean()),
  })
  .superRefine((value, ctx) => {
    if (value.compareAtFils !== undefined) {
      if (value.priceFils === undefined || value.compareAtFils <= value.priceFils) {
        ctx.addIssue({
          code: "custom",
          path: ["compareAtFils"],
          message: "The earlier price must be higher than the price",
        });
      }
    }
    if (value.kind === "guitar" && (value.quantity ?? 1) > 1) {
      ctx.addIssue({ code: "custom", path: ["quantity"], message: "A guitar is a single item" });
    }
  });

/** Spec fields as named in the form ("spec.body"); numbers are parsed from text. */
export const specFields = [
  "bodyStyle",
  "body",
  "finish",
  "neck",
  "fretboard",
  "frets",
  "scale",
  "pickupLayout",
  "pickups",
  "weightKg",
  "serial",
  "case",
  "mods",
] as const satisfies readonly (keyof ProductSpecs)[];

export const specOptions = { bodyStyle: bodyStyles, pickupLayout: pickupLayouts } as const;

function readSpecs(form: FormData): Record<string, unknown> {
  const specs: Record<string, unknown> = {};
  for (const field of specFields) {
    const raw = form.get(`spec.${field}`);
    if (typeof raw !== "string" || raw.trim() === "") continue;
    const value = raw.trim();
    specs[field] =
      field === "frets" || field === "weightKg" ? Number(value.replace(",", ".")) : value;
  }
  return specs;
}

export type ProductInput = Omit<z.infer<typeof formSchema>, "slug"> & {
  slug: string;
  specs: ProductSpecs;
};

export type FormResult =
  { ok: true; data: ProductInput } | { ok: false; errors: Record<string, string> };

export function parseProductForm(form: FormData): FormResult {
  const fields = Object.fromEntries(
    [...form.entries()].filter(([key, value]) => !key.includes(".") && typeof value === "string"),
  );
  const parsed = formSchema.safeParse(fields);
  const specs = productSpecsSchema.safeParse(readSpecs(form));

  const errors: Record<string, string> = {};
  for (const issue of parsed.error?.issues ?? []) {
    errors[String(issue.path[0])] ??= issue.message;
  }
  for (const issue of specs.error?.issues ?? []) {
    errors[`spec.${String(issue.path[0])}`] ??= issue.message;
  }
  if (!parsed.success || !specs.success) return { ok: false, errors };

  const slug = parsed.data.slug ?? slugify(parsed.data.titleEn);
  if (!slug) return { ok: false, errors: { slug: "Add a slug: the title has no Latin letters" } };
  return { ok: true, data: { ...parsed.data, slug, specs: specs.data } };
}

// ---------------------------------------------------------------------------------
// Writes

function columns(input: ProductInput) {
  return {
    kind: input.kind,
    categoryId: input.categoryId ?? null,
    slug: input.slug,
    sku: input.sku,
    brand: input.brand ?? null,
    model: input.model ?? null,
    year: input.year ?? null,
    titleEn: input.titleEn,
    titleAr: input.titleAr ?? null,
    descriptionEn: input.descriptionEn ?? null,
    descriptionAr: input.descriptionAr ?? null,
    techNotesEn: input.techNotesEn ?? null,
    techNotesAr: input.techNotesAr ?? null,
    inTheBoxEn: input.inTheBoxEn ?? null,
    inTheBoxAr: input.inTheBoxAr ?? null,
    placeholderPhotos: input.placeholderPhotos,
    condition: input.condition ?? null,
    priceFils: input.priceFils ?? null,
    compareAtFils: input.compareAtFils ?? null,
    costFils: input.costFils ?? null,
    specs: input.specs,
  };
}

function rethrowUnique(error: unknown): never {
  const constraint = uniqueViolation(error);
  if (constraint?.includes("slug")) throw new ProductError("slug_taken");
  if (constraint?.includes("sku")) throw new ProductError("sku_taken");
  throw error;
}

/** Adds a draft. A guitar is always one item; a service add-on has no stock. */
export async function createProduct(db: Database, input: ProductInput): Promise<number> {
  const quantity =
    input.kind === "guitar" ? 1 : input.kind === "service_addon" ? 0 : (input.quantity ?? 1);
  try {
    const [row] = await db
      .insert(products)
      .values({ ...columns(input), quantity, status: "draft" })
      .returning({ id: products.id });
    return row.id;
  } catch (error) {
    rethrowUnique(error);
  }
}

export async function getProductRow(db: Database, id: number): Promise<Product> {
  const [row] = await db.select().from(products).where(eq(products.id, id));
  if (!row) throw new ProductError("not_found");
  return row;
}

const isListed = (status: Product["status"]) =>
  status === "available" || status === "reserved" || status === "sold";

/**
 * Saves the form. The slug is locked once the product has been published, so links
 * already shared keep working. Stock isn't changed here (see inventory.ts).
 */
export async function updateProduct(db: Database, id: number, input: ProductInput): Promise<void> {
  const current = await getProductRow(db, id);
  if (current.publishedAt && input.slug !== current.slug) throw new ProductError("slug_locked");
  if (isListed(current.status) && (input.priceFils === undefined || !input.categoryId)) {
    throw new ProductError("listed_needs_price_and_category");
  }
  if (input.kind === "guitar" && current.quantity > 1) throw new ProductError("guitar_single");
  // An add-on has no stock, so a product becomes one only with none, and stops being one
  // only as a draft (a listed product needs stock).
  const toAddon = input.kind === "service_addon" && current.kind !== "service_addon";
  const fromAddon = current.kind === "service_addon" && input.kind !== "service_addon";
  if ((toAddon && current.quantity > 0) || (fromAddon && current.status !== "draft")) {
    throw new ProductError("addon_kind");
  }

  try {
    await db.transaction(async (tx) => {
      await tx.update(products).set(columns(input)).where(eq(products.id, id));
      // With variants, the price comes from them.
      await syncVariantPrice(tx, id);
    });
  } catch (error) {
    rethrowUnique(error);
  }
}

export async function photoCount(db: Database, productId: number): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(productImages)
    .where(eq(productImages.productId, productId));
  return row.n;
}

/**
 * What stops a product from being published; empty when it's ready. A service add-on
 * has no page, photos or stock, only a title, price and category.
 */
export function publishProblems(product: Product, photos: number): string[] {
  const addon = product.kind === "service_addon";
  const problems: string[] = [];
  if (!product.titleEn.trim()) problems.push("Add an English title.");
  if (product.priceFils === null) problems.push("Add a price.");
  if (product.categoryId === null) problems.push("Choose a category.");
  if (!addon && photos < 1) problems.push("Add at least one photo.");
  if (!addon && product.quantity < 1) problems.push("Add stock: the quantity is 0.");
  return problems;
}

export class PublishError extends Error {
  override name = "PublishError";
  constructor(readonly problems: string[]) {
    super(problems.join(" "));
  }
}

/** Lists a draft for sale. Its slug is locked from now on. */
export async function publishProduct(db: Database, id: number): Promise<void> {
  const product = await getProductRow(db, id);
  if (product.status !== "draft") throw new ProductError("not_draft");
  const problems = publishProblems(product, await photoCount(db, id));
  if (problems.length > 0) throw new PublishError(problems);

  const updated = await db
    .update(products)
    .set({ status: "available", publishedAt: sql`coalesce(${products.publishedAt}, now())` })
    .where(and(eq(products.id, id), eq(products.status, "draft")))
    .returning({ id: products.id });
  if (updated.length === 0) throw new ProductError("not_draft");
}

/** Hides a product from the shop, keeping it for history. A held item is released first. */
export async function archiveProduct(db: Database, id: number): Promise<void> {
  const updated = await db
    .update(products)
    .set({ status: "archived" })
    .where(and(eq(products.id, id), sql`${products.status} in ('draft', 'available', 'sold')`))
    .returning({ id: products.id });
  if (updated.length === 0) throw new ProductError("cannot_archive");
}

/** Brings an archived product back as a draft, to edit and publish again. */
export async function unarchiveProduct(db: Database, id: number): Promise<void> {
  const updated = await db
    .update(products)
    .set({ status: "draft" })
    .where(and(eq(products.id, id), eq(products.status, "archived")))
    .returning({ id: products.id });
  if (updated.length === 0) throw new ProductError("not_archived");
}

/**
 * Deletes a product that was never published, with its photos. Anything that was ever
 * listed is archived instead, so shared links and order history stay intact.
 */
export async function deleteDraft(db: Database, storage: Storage, id: number): Promise<void> {
  const deleted = await db.transaction(async (tx) => {
    const images = await tx
      .select({ key: productImages.key })
      .from(productImages)
      .where(eq(productImages.productId, id));
    const rows = await tx
      .delete(products)
      .where(and(eq(products.id, id), isNull(products.publishedAt)))
      .returning({ id: products.id });
    return rows.length === 0 ? null : images;
  });
  if (!deleted) throw new ProductError("already_published");
  const keys = deleted
    .filter((image) => !isBundledPhoto(image.key))
    .flatMap((i) => photoFileKeys(i.key));
  await storage.delete("public", keys);
}
