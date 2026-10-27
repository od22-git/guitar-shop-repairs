import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { products, productVariants } from "@/lib/db/schema";
import { createPgliteDatabase, type TestDatabase } from "@/test/db";
import { insertProduct } from "@/test/products";

import type { Database } from "../db/connect";

import { updateProduct, type ProductInput } from "./products";
import {
  createVariant,
  deleteVariant,
  listVariants,
  parseVariantForm,
  updateVariant,
  VariantError,
  type VariantInput,
} from "./variants";

let test: TestDatabase;
let db: Database;

beforeAll(async () => {
  test = await createPgliteDatabase();
  db = test.db;
}, 30_000);
afterAll(() => test?.close());
beforeEach(() => test.reset());

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

function variant(overrides: Partial<VariantInput> = {}): VariantInput {
  return {
    nameEn: "Device only",
    priceFils: 20_000,
    customToneSlots: 0,
    includesPack: false,
    featured: false,
    active: true,
    sort: 0,
    ...overrides,
  };
}

const device = (overrides = {}) =>
  insertProduct(db, { kind: "device", condition: null, quantity: 10, ...overrides });

async function price(id: number) {
  const [row] = await db
    .select({ priceFils: products.priceFils, compareAtFils: products.compareAtFils })
    .from(products)
    .where(eq(products.id, id));
  return row;
}

describe("parseVariantForm", () => {
  it("reads names, AED prices, tone slots and tick boxes", () => {
    const parsed = parseVariantForm(
      form({
        nameEn: " Custom Tone Bundle ",
        nameAr: "باقة النغمات المخصصة",
        priceFils: "349",
        compareAtFils: "399",
        customToneSlots: "3",
        featured: "on",
        active: "on",
        sort: "",
      }),
    );
    expect(parsed).toEqual({
      ok: true,
      data: {
        nameEn: "Custom Tone Bundle",
        nameAr: "باقة النغمات المخصصة",
        priceFils: 34_900,
        compareAtFils: 39_900,
        customToneSlots: 3,
        includesPack: false,
        featured: true,
        active: true,
        sort: 0,
      },
    });
  });

  it("needs a name and a price, and an earlier price above the price", () => {
    const parsed = parseVariantForm(form({ nameEn: "", priceFils: "", compareAtFils: "1" }));
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(Object.keys(parsed.errors).sort()).toEqual(["nameEn", "priceFils"]);
    const low = parseVariantForm(form({ nameEn: "A", priceFils: "300", compareAtFils: "200" }));
    expect(low).toMatchObject({ ok: false, errors: { compareAtFils: expect.any(String) } });
  });

  it("keeps tone slots between 0 and 10", () => {
    expect(parseVariantForm(form({ nameEn: "A", priceFils: "1", customToneSlots: "11" })).ok).toBe(
      false,
    );
    expect(parseVariantForm(form({ nameEn: "A", priceFils: "1", customToneSlots: "1.5" })).ok).toBe(
      false,
    );
  });
});

describe("variants", () => {
  it("price the product from its lowest active variant, with no earlier price", async () => {
    const id = await device({ priceFils: 50_000, compareAtFils: 60_000 });
    await createVariant(db, id, variant({ nameEn: "Starter Bundle", priceFils: 29_900 }));
    expect(await price(id)).toEqual({ priceFils: 29_900, compareAtFils: null });

    const cheaper = await createVariant(db, id, variant({ priceFils: 20_000 }));
    expect(await price(id)).toMatchObject({ priceFils: 20_000 });

    await updateVariant(db, cheaper, variant({ priceFils: 20_000, active: false }));
    expect(await price(id)).toMatchObject({ priceFils: 29_900 });

    await updateVariant(db, cheaper, variant({ priceFils: 15_000 }));
    expect(await price(id)).toMatchObject({ priceFils: 15_000 });
    await deleteVariant(db, cheaper);
    expect(await price(id)).toMatchObject({ priceFils: 29_900 });
  });

  it("keep the product's price when the last one goes", async () => {
    const id = await device({ priceFils: 50_000 });
    const only = await createVariant(db, id, variant({ priceFils: 30_000 }));
    await deleteVariant(db, only);
    expect(await price(id)).toMatchObject({ priceFils: 30_000 });
  });

  it("go after the last one unless given an order, and have one pick at most", async () => {
    const id = await device();
    const a = await createVariant(db, id, variant({ nameEn: "A", featured: true }));
    const b = await createVariant(db, id, variant({ nameEn: "B", featured: true }));
    await createVariant(db, id, variant({ nameEn: "First", sort: 5 }));
    const rows = await listVariants(db, id);
    expect(rows.map((v) => [v.nameEn, v.featured])).toEqual([
      ["First", false],
      ["A", false],
      ["B", true],
    ]);
    await updateVariant(db, a, variant({ nameEn: "A", featured: true, sort: 10 }));
    const after = await listVariants(db, id);
    expect(after.filter((v) => v.featured).map((v) => v.id)).toEqual([a]);
    expect(b).toBeGreaterThan(a);
  });

  it("don't belong on guitars or service add-ons", async () => {
    const guitar = await insertProduct(db);
    await expect(createVariant(db, guitar, variant())).rejects.toEqual(new VariantError("kind"));
    const addon = await insertProduct(db, { kind: "service_addon", quantity: 0 });
    await expect(createVariant(db, addon, variant())).rejects.toEqual(new VariantError("kind"));
    await expect(createVariant(db, 999, variant())).rejects.toEqual(
      new VariantError("product_not_found"),
    );
  });

  it("refuse unknown ids", async () => {
    await expect(updateVariant(db, 999, variant())).rejects.toEqual(new VariantError("not_found"));
    await expect(deleteVariant(db, 999)).rejects.toEqual(new VariantError("not_found"));
  });

  it("set the price again when the product form is saved", async () => {
    const id = await device({ slug: "nanocore", sku: "NANOCORE", titleEn: "NANOCORE" });
    await createVariant(db, id, variant({ priceFils: 20_000 }));
    const [row] = await db.select().from(products).where(eq(products.id, id));
    const input: ProductInput = {
      kind: "device",
      slug: row.slug,
      sku: row.sku,
      titleEn: row.titleEn,
      categoryId: row.categoryId!,
      priceFils: 99_900,
      specs: {},
      placeholderPhotos: true,
    };
    await updateProduct(db, id, input);
    expect(await price(id)).toMatchObject({ priceFils: 20_000 });
    const [saved] = await db.select().from(products).where(eq(products.id, id));
    expect(saved.placeholderPhotos).toBe(true);
  });

  it("go with their product when it's deleted", async () => {
    const id = await device({ status: "draft", publishedAt: null });
    await createVariant(db, id, variant());
    await db.delete(products).where(eq(products.id, id));
    expect(await db.select().from(productVariants)).toEqual([]);
  });
});
