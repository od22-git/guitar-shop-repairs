import { eq } from "drizzle-orm";
import sharp from "sharp";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { categories, productImages, products } from "@/lib/db/schema";
import { loadCatalog } from "@/lib/catalog/load";
import { createPgliteDatabase, type TestDatabase } from "@/test/db";
import { insertProduct } from "@/test/products";

import type { Database } from "../db/connect";
import type { Storage } from "../storage/types";

import { addProductPhoto, deleteProductPhoto, moveProductPhoto, PhotoError } from "./photos";
import {
  archiveProduct,
  createProduct,
  deleteDraft,
  getProductRow,
  parseProductForm,
  ProductError,
  publishProduct,
  PublishError,
  slugify,
  unarchiveProduct,
  updateProduct,
  type ProductInput,
} from "./products";

let test: TestDatabase;
let db: Database;

beforeAll(async () => {
  test = await createPgliteDatabase();
  db = test.db;
}, 30_000);
afterAll(() => test?.close());
beforeEach(() => test.reset());

/** Storage in memory, to see what was stored and removed. */
function memoryStorage() {
  const files = new Map<string, Buffer>();
  const storage: Storage = {
    put: async (bucket, key, body) => void files.set(`${bucket}:${key}`, body),
    get: async (bucket, key) => files.get(`${bucket}:${key}`) ?? null,
    delete: async (bucket, keys) => keys.forEach((key) => files.delete(`${bucket}:${key}`)),
  };
  return { storage, files };
}

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

async function category() {
  const [row] = await db
    .insert(categories)
    .values({ slug: "electric-guitars", nameEn: "Electric guitars", nameAr: "جيتارات" })
    .returning();
  return row.id;
}

function input(overrides: Partial<ProductInput> = {}): ProductInput {
  return {
    kind: "guitar",
    slug: "fender-jaguar",
    sku: "G-0001",
    titleEn: "Fender Jaguar",
    specs: {},
    ...overrides,
  };
}

const photo = () =>
  sharp({ create: { width: 800, height: 600, channels: 3, background: "#c8a55a" } })
    .jpeg()
    .toBuffer();

describe("parseProductForm", () => {
  it("parses a complete form, with money in AED and specs", () => {
    const result = parseProductForm(
      form({
        kind: "guitar",
        categoryId: "3",
        slug: "",
        sku: "g-0012",
        titleEn: "Fender Jaguar '66",
        titleAr: "",
        year: "1966",
        condition: "very_good",
        priceFils: "4,250.50",
        compareAtFils: "4500",
        costFils: "",
        "spec.bodyStyle": "offset",
        "spec.frets": "22",
        "spec.weightKg": "3,6",
        "spec.serial": "L12345",
      }),
    );
    expect(result).toEqual({
      ok: true,
      data: expect.objectContaining({
        kind: "guitar",
        categoryId: 3,
        slug: "fender-jaguar-66",
        sku: "G-0012",
        year: 1966,
        priceFils: 425_050,
        compareAtFils: 450_000,
        costFils: undefined,
        titleAr: undefined,
        specs: { bodyStyle: "offset", frets: 22, weightKg: 3.6, serial: "L12345" },
      }),
    });
  });

  it("names each problem by field", () => {
    const result = parseProductForm(
      form({
        kind: "guitar",
        sku: "bad sku!",
        titleEn: "",
        priceFils: "12.345",
        compareAtFils: "",
        slug: "Not A Slug",
        "spec.bodyStyle": "banjo",
      }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.errors).sort()).toEqual(
      ["priceFils", "sku", "slug", "spec.bodyStyle", "titleEn"].sort(),
    );
  });

  it("keeps a guitar to one item", () => {
    const result = parseProductForm(
      form({ kind: "guitar", sku: "G-1", titleEn: "Jaguar", quantity: "2" }),
    );
    expect(result).toMatchObject({ ok: false, errors: { quantity: expect.any(String) } });
  });

  it("wants the earlier price above the price", () => {
    const result = parseProductForm(
      form({ kind: "gear", sku: "A-1", titleEn: "Strap", priceFils: "100", compareAtFils: "90" }),
    );
    expect(result).toMatchObject({ ok: false, errors: { compareAtFils: expect.any(String) } });
  });
});

describe("slugify", () => {
  it("keeps Latin letters and digits", () => {
    expect(slugify("Fender Strat '62 (Reissue) — Café")).toBe("fender-strat-62-reissue-cafe");
    expect(slugify("جيتار")).toBe("");
  });
});

describe("products", () => {
  it("creates a draft, which the public catalog doesn't show", async () => {
    const id = await createProduct(db, input({ categoryId: await category(), priceFils: 100 }));
    expect(await getProductRow(db, id)).toMatchObject({ status: "draft", quantity: 1 });
    expect((await loadCatalog(db)).products).toHaveLength(0);
  });

  it("reports a taken slug or SKU", async () => {
    await createProduct(db, input());
    await expect(createProduct(db, input({ sku: "G-0002" }))).rejects.toMatchObject({
      problem: "slug_taken",
    });
    await expect(createProduct(db, input({ slug: "other" }))).rejects.toMatchObject({
      problem: "sku_taken",
    });
  });

  it("refuses to publish until title, price, category, photo and stock are there", async () => {
    const id = await createProduct(db, input());
    const error = await publishProduct(db, id).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(PublishError);
    expect((error as PublishError).problems).toEqual([
      "Add a price.",
      "Choose a category.",
      "Add at least one photo.",
    ]);
  });

  it("publishes, then locks the slug while the rest stays editable", async () => {
    const { storage } = memoryStorage();
    const categoryId = await category();
    const id = await createProduct(db, input({ categoryId, priceFils: 500_000 }));
    // Before publishing, the slug can still change.
    await updateProduct(db, id, input({ categoryId, priceFils: 500_000, slug: "fender-jag" }));
    await addProductPhoto(db, storage, id, await photo());
    await publishProduct(db, id);

    const published = await getProductRow(db, id);
    expect(published).toMatchObject({ status: "available", slug: "fender-jag" });
    expect(published.publishedAt).toBeInstanceOf(Date);

    await expect(
      updateProduct(db, id, input({ categoryId, priceFils: 500_000, slug: "renamed" })),
    ).rejects.toMatchObject({ problem: "slug_locked" });
    await expect(
      updateProduct(db, id, input({ categoryId, slug: "fender-jag" })),
    ).rejects.toMatchObject({ problem: "listed_needs_price_and_category" });

    await updateProduct(db, id, input({ categoryId, priceFils: 450_000, slug: "fender-jag" }));
    const [listed] = (await loadCatalog(db)).products;
    expect(listed).toMatchObject({ slug: "fender-jag", priceFils: 450_000 });
  });

  it("keeps the slug locked after archiving and restoring", async () => {
    const id = await insertProduct(db);
    await archiveProduct(db, id);
    await unarchiveProduct(db, id);
    const row = await getProductRow(db, id);
    expect(row.status).toBe("draft");
    await expect(
      updateProduct(db, id, input({ slug: "something-else", sku: row.sku })),
    ).rejects.toMatchObject({ problem: "slug_locked" });
  });

  it("won't archive a held item", async () => {
    const id = await insertProduct(db, { status: "reserved" });
    await expect(archiveProduct(db, id)).rejects.toBeInstanceOf(ProductError);
  });

  it("deletes a draft and its stored photos, but never a published product", async () => {
    const { storage, files } = memoryStorage();
    const draft = await createProduct(db, input());
    await addProductPhoto(db, storage, draft, await photo());
    expect(files.size).toBe(4);
    await deleteDraft(db, storage, draft);
    expect(files.size).toBe(0);
    expect(await db.select().from(products)).toHaveLength(0);

    const listed = await insertProduct(db);
    await expect(deleteDraft(db, storage, listed)).rejects.toMatchObject({
      problem: "already_published",
    });
  });
});

describe("photos", () => {
  it("stores each width and a preview under one key, in upload order", async () => {
    const { storage, files } = memoryStorage();
    const id = await createProduct(db, input());
    const first = await addProductPhoto(db, storage, id, await photo());
    const second = await addProductPhoto(db, storage, id, await photo());

    expect(first.key).toMatch(/^products\/\d+\/[0-9a-f]{20}$/);
    expect([...files.keys()].filter((k) => k.includes(first.key)).sort()).toEqual(
      [
        `public:${first.key}-640.webp`,
        `public:${first.key}-1280.webp`,
        `public:${first.key}-1920.webp`,
        `public:${first.key}-og.jpg`,
      ].sort(),
    );
    expect([first.sort, second.sort]).toEqual([0, 1]);
    expect({ width: first.width, height: first.height }).toEqual({ width: 800, height: 600 });
  });

  it("reorders photos", async () => {
    const { storage } = memoryStorage();
    const id = await createProduct(db, input());
    const a = await addProductPhoto(db, storage, id, await photo());
    const b = await addProductPhoto(db, storage, id, await photo());
    await moveProductPhoto(db, b.id, -1);
    const order = await db
      .select({ id: productImages.id, sort: productImages.sort })
      .from(productImages)
      .where(eq(productImages.productId, id))
      .orderBy(productImages.sort);
    expect(order.map((row) => row.id)).toEqual([b.id, a.id]);
    // Moving the first one earlier does nothing.
    await moveProductPhoto(db, b.id, -1);
  });

  it("keeps the last photo of a listed product", async () => {
    const { storage, files } = memoryStorage();
    const id = await insertProduct(db);
    const only = await addProductPhoto(db, storage, id, await photo());
    const error = await deleteProductPhoto(db, storage, only.id).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(PhotoError);

    const extra = await addProductPhoto(db, storage, id, await photo());
    await deleteProductPhoto(db, storage, extra.id);
    expect([...files.keys()].some((key) => key.includes(extra.key))).toBe(false);
  });
});
