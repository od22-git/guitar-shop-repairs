import { readdirSync, readFileSync } from "node:fs";

import { asc, eq } from "drizzle-orm";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { stockPhotoWidths } from "@/config/stock-photos";
import { OG_IMAGE_SIZE } from "@/lib/product-images";
import { productSpecsSchema } from "@/lib/product-specs";
import { createPgliteDatabase, type TestDatabase } from "@/test/db";
import { webpSize } from "@/test/webp";

import { categories, deliveryZones, productImages, products, type Emirate } from "./schema";
import {
  SAMPLE_PHOTO_SIZE,
  samplePhotos,
  sampleProducts,
  seed,
  seedCategories,
  seedDeliveryZones,
} from "./seed";

const now = new Date("2026-10-26T08:00:00Z");

describe("seed", () => {
  let test: TestDatabase;

  beforeAll(async () => {
    test = await createPgliteDatabase();
    // Twice: a second run must change nothing.
    await seed(test.db, { now });
    await seed(test.db, { now: new Date("2026-12-01T08:00:00Z") });
  }, 30_000);
  afterAll(() => test?.close());

  it("adds the categories and delivery zones once", async () => {
    const rows = await test.db.select().from(categories).orderBy(asc(categories.sort));
    expect(rows.map((c) => c.slug)).toEqual(seedCategories.map((c) => c.slug));
    expect(await test.db.select().from(deliveryZones)).toHaveLength(seedDeliveryZones.length);
  });

  it("covers every emirate with exactly one delivery zone", () => {
    const emirates = seedDeliveryZones.flatMap((zone) => zone.emirates);
    const all: Emirate[] = [
      "abu_dhabi",
      "dubai",
      "sharjah",
      "ajman",
      "umm_al_quwain",
      "ras_al_khaimah",
      "fujairah",
    ];
    expect([...emirates].sort()).toEqual([...all].sort());
  });

  it("adds the sample products once, all marked as samples", async () => {
    const rows = await test.db.select().from(products);
    expect(rows).toHaveLength(sampleProducts.length);
    expect(rows.every((p) => p.isSample)).toBe(true);
    expect(rows.length).toBeGreaterThanOrEqual(8);
  });

  it("dates samples from the first run", async () => {
    const [strat] = await test.db
      .select()
      .from(products)
      .where(eq(products.slug, "fender-stratocaster-sunburst"));
    expect(strat.publishedAt).toEqual(new Date("2026-10-24T08:00:00Z"));
  });

  it("covers every state the catalog has to show", async () => {
    const rows = await test.db.select().from(products);
    const has = (predicate: (p: (typeof rows)[number]) => boolean) => rows.some(predicate);
    expect(has((p) => p.kind === "guitar" && p.status === "available")).toBe(true);
    expect(has((p) => p.status === "reserved" && p.reservedUntil !== null)).toBe(true);
    expect(has((p) => p.kind === "guitar" && p.status === "sold" && p.soldAt !== null)).toBe(true);
    expect(has((p) => p.kind === "gear" && p.status === "sold" && p.quantity === 0)).toBe(true);
    expect(has((p) => p.kind === "gear" && p.status === "available" && p.quantity > 1)).toBe(true);
    expect(has((p) => p.status === "draft")).toBe(true);
    expect(has((p) => p.status !== "draft" && p.titleAr === null)).toBe(true);
    expect(has((p) => p.compareAtFils !== null)).toBe(true);
    for (const { slug } of seedCategories) {
      const [category] = await test.db.select().from(categories).where(eq(categories.slug, slug));
      expect(
        has((p) => p.categoryId === category.id && p.status === "available"),
        slug,
      ).toBe(true);
    }
  });

  it("gives every listed sample a photo, and one sample a gallery", async () => {
    const rows = await test.db.select().from(products);
    const images = await test.db.select().from(productImages);
    for (const product of rows.filter((p) => p.status !== "draft")) {
      expect(
        images.some((i) => i.productId === product.id),
        product.slug,
      ).toBe(true);
    }
    const perProduct = Map.groupBy(images, (i) => i.productId);
    expect(Math.max(...[...perProduct.values()].map((list) => list.length))).toBeGreaterThan(1);
    for (const image of images) {
      expect(image.altEn && image.altAr, image.key).toBeTruthy();
    }
  });

  it("has valid specs", () => {
    for (const product of sampleProducts) {
      expect(productSpecsSchema.safeParse(product.specs ?? {}).success, product.slug).toBe(true);
    }
  });
});

describe("sample photos", () => {
  const dir = new URL("../../../public/images/samples/", import.meta.url);
  const names = Object.keys(samplePhotos) as (keyof typeof samplePhotos)[];

  it("are each used by a sample product", () => {
    const used = new Set(sampleProducts.flatMap((p) => p.images.map((i) => i.photo)));
    expect([...used].sort()).toEqual([...names].sort());
  });

  it("are stored at every width, cropped to 4:5, and nothing else is in the folder", () => {
    const expected: string[] = [];
    for (const name of names) {
      for (const width of stockPhotoWidths) {
        const file = `${name}-${width}.webp`;
        expected.push(file);
        expect(webpSize(readFileSync(new URL(file, dir))), file).toEqual({
          width,
          height: (width * SAMPLE_PHOTO_SIZE.height) / SAMPLE_PHOTO_SIZE.width,
        });
      }
      expected.push(`${name}-og.jpg`);
    }
    expect(readdirSync(dir).sort()).toEqual(expected.sort());
  });

  it("each have a 1200×630 JPEG link preview (scripts/sample-og-images.mts)", async () => {
    for (const name of names) {
      const file = `${name}-og.jpg`;
      const { format, width, height } = await sharp(readFileSync(new URL(file, dir))).metadata();
      expect({ format, width, height }, file).toEqual({ format: "jpeg", ...OG_IMAGE_SIZE });
    }
  });

  it("are each credited in docs/IMAGE_CREDITS.md", () => {
    const credits = readFileSync(
      new URL("../../../docs/IMAGE_CREDITS.md", import.meta.url),
      "utf8",
    );
    for (const name of names) {
      const { unsplashId, author } = samplePhotos[name];
      expect(credits, name).toContain(`https://unsplash.com/photos/${unsplashId}`);
      expect(credits, name).toContain(author);
    }
  });
});
