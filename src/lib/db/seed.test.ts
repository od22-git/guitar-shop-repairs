import { readdirSync, readFileSync } from "node:fs";

import { asc, eq } from "drizzle-orm";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { stockPhotoWidths } from "@/config/stock-photos";
import { OG_IMAGE_SIZE } from "@/lib/product-images";
import { productSpecsSchema } from "@/lib/product-specs";
import { createPgliteDatabase, type TestDatabase } from "@/test/db";
import { webpSize } from "@/test/webp";

import {
  categories,
  deliveryZones,
  productImages,
  products,
  productVariants,
  type Emirate,
} from "./schema";
import {
  SAMPLE_PHOTO_SIZE,
  samplePhotos,
  sampleProducts,
  seed,
  seedCategories,
  seedDeliveryZones,
  shopProducts,
  standInPhotos,
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

  it("adds the shop's products and the samples once, only the samples marked as samples", async () => {
    const rows = await test.db.select().from(products);
    expect(rows).toHaveLength(shopProducts.length + sampleProducts.length);
    const sampleSlugs = new Set(sampleProducts.map((p) => p.slug));
    for (const row of rows) expect(row.isSample, row.slug).toBe(sampleSlugs.has(row.slug));
    expect(sampleProducts.length).toBeGreaterThanOrEqual(8);
  });

  it("adds the NANOCORE with its three bundles at the launch prices, priced from the lowest", async () => {
    const [nanocore] = await test.db.select().from(products).where(eq(products.slug, "nanocore"));
    expect(nanocore).toMatchObject({
      kind: "device",
      status: "available",
      priceFils: 20_000,
      placeholderPhotos: true,
      isSample: false,
    });
    const variants = await test.db
      .select()
      .from(productVariants)
      .where(eq(productVariants.productId, nanocore.id))
      .orderBy(asc(productVariants.sort));
    expect(
      variants.map((v) => [v.nameEn, v.priceFils, v.includesPack, v.customToneSlots, v.featured]),
    ).toEqual([
      ["Device only", 20_000, false, 0, false],
      ["Starter Bundle", 29_900, true, 0, true],
      ["Custom Tone Bundle", 34_900, false, 3, false],
    ]);
  });

  it("adds the extra custom tone as a stockless add-on and the footswitch as a draft with no price", async () => {
    const [tone] = await test.db
      .select()
      .from(products)
      .where(eq(products.slug, "extra-custom-tone"));
    expect(tone).toMatchObject({
      kind: "service_addon",
      quantity: 0,
      status: "available",
      priceFils: 5_000,
    });
    const [footswitch] = await test.db
      .select()
      .from(products)
      .where(eq(products.slug, "nanocore-footswitch"));
    expect(footswitch).toMatchObject({ kind: "accessory", status: "draft", priceFils: null });
  });

  it("adds the shop's own products without the samples", async () => {
    const fresh = await createPgliteDatabase();
    try {
      await seed(fresh.db, { samples: false, now });
      const rows = await fresh.db.select().from(products);
      expect(rows.map((p) => p.slug).sort()).toEqual(shopProducts.map((p) => p.slug).sort());
    } finally {
      await fresh.close();
    }
  }, 30_000);

  it("dates samples from the first run", async () => {
    const [strat] = await test.db
      .select()
      .from(products)
      .where(eq(products.slug, "fender-stratocaster-sunburst"));
    expect(strat.publishedAt).toEqual(new Date("2026-10-24T08:00:00Z"));
  });

  it("covers every state the catalog has to show", async () => {
    const rows = await test.db.select().from(products).where(eq(products.isSample, true));
    const has = (predicate: (p: (typeof rows)[number]) => boolean) => rows.some(predicate);
    expect(has((p) => p.kind === "guitar" && p.status === "available")).toBe(true);
    expect(has((p) => p.status === "reserved" && p.reservedUntil !== null)).toBe(true);
    expect(has((p) => p.kind === "guitar" && p.status === "sold" && p.soldAt !== null)).toBe(true);
    expect(has((p) => p.kind !== "guitar" && p.status === "sold" && p.quantity === 0)).toBe(true);
    expect(has((p) => p.kind !== "guitar" && p.status === "available" && p.quantity > 1)).toBe(
      true,
    );
    expect(has((p) => p.placeholderPhotos)).toBe(true);
    expect(has((p) => p.status === "draft")).toBe(true);
    expect(has((p) => p.status !== "draft" && p.titleAr === null)).toBe(true);
    expect(has((p) => p.compareAtFils !== null)).toBe(true);
    // Footswitches have only the draft until they launch.
    const all = await test.db.select().from(products);
    for (const { slug } of seedCategories.filter((c) => c.slug !== "footswitches")) {
      const [category] = await test.db.select().from(categories).where(eq(categories.slug, slug));
      expect(
        all.some((p) => p.categoryId === category.id && p.status === "available"),
        slug,
      ).toBe(true);
    }
  });

  it("gives every listed product a photo (add-ons aside), and one sample a gallery", async () => {
    const rows = (await test.db.select().from(products)).filter((p) => p.kind !== "service_addon");
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
    for (const product of [...shopProducts, ...sampleProducts]) {
      expect(productSpecsSchema.safeParse(product.specs ?? {}).success, product.slug).toBe(true);
    }
  });
});

describe.each([
  {
    folder: "samples",
    photos: samplePhotos as Record<string, { unsplashId: string; author: string }>,
    used: sampleProducts.flatMap((p) => p.images.flatMap((i) => ("photo" in i ? [i.photo] : []))),
  },
  {
    folder: "stand-ins",
    photos: standInPhotos as Record<string, { unsplashId: string; author: string }>,
    used: shopProducts.flatMap((p) => p.images.flatMap((i) => ("standIn" in i ? [i.standIn] : []))),
  },
])("$folder photos", ({ folder, photos, used }) => {
  const dir = new URL(`../../../public/images/${folder}/`, import.meta.url);
  const names = Object.keys(photos);

  it("are each used by a product", () => {
    expect([...new Set(used)].sort()).toEqual([...names].sort());
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
      const { unsplashId, author } = photos[name];
      expect(credits, name).toContain(`https://unsplash.com/photos/${unsplashId}`);
      expect(credits, name).toContain(author);
    }
  });
});
