import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { productImages, products, productVariants } from "@/lib/db/schema";
import { sampleProducts, seed, shopProducts } from "@/lib/db/seed";
import { createPgliteDatabase, type TestDatabase } from "@/test/db";
import { insertProduct } from "@/test/products";

import { loadCatalog } from "./load";

describe("loadCatalog", () => {
  let test: TestDatabase;

  beforeAll(async () => {
    test = await createPgliteDatabase();
  }, 30_000);
  afterAll(() => test?.close());
  beforeEach(() => test.reset());

  it("lists every listed sample, newest first, and leaves out the draft", async () => {
    await seed(test.db, { now: new Date("2026-10-26T08:00:00Z") });
    const { categories, products: listed } = await loadCatalog(test.db);

    expect(categories.map((c) => c.slug)).toEqual([
      "devices-bundles",
      "footswitches",
      "parts-knobs",
      "used-guitars",
    ]);
    // Drafts aren't listed, and an add-on is offered with bundles rather than listed.
    const expected = [...shopProducts, ...sampleProducts].filter(
      (p) => p.status !== "draft" && p.kind !== "service_addon",
    );
    expect(listed.map((p) => p.slug).sort()).toEqual(expected.map((p) => p.slug).sort());
    expect(listed.some((p) => p.slug === "ibanez-rg550-draft")).toBe(false);
    const published = listed.map((p) => p.publishedAt.getTime());
    expect(published).toEqual(published.toSorted((a, b) => b - a));
  });

  it("gives each product its own photos in order, with paths and preview images", async () => {
    await seed(test.db);
    const { products: listed } = await loadCatalog(test.db);
    const sg = listed.find((p) => p.slug === "epiphone-sg-standard-ebony")!;
    expect(sg.images.map((i) => i.src)).toEqual([
      "/images/samples/sg-ebony-1",
      "/images/samples/sg-ebony-2",
    ]);
    expect(sg.images[0].ogSrc).toBe("/images/samples/sg-ebony-1-og.jpg");
    expect(sg.category).toEqual({
      slug: "used-guitars",
      nameEn: "Used guitars",
      nameAr: "جيتارات مستعملة",
    });
  });

  it("gives the NANOCORE its active bundles in order, priced from the lowest, and lists the add-on apart", async () => {
    await seed(test.db);
    const { products: listed, addons } = await loadCatalog(test.db);
    const nanocore = listed.find((p) => p.slug === "nanocore")!;
    expect(nanocore.variants.map((v) => [v.nameEn, v.priceFils])).toEqual([
      ["Device only", 20_000],
      ["Starter Bundle", 29_900],
      ["Custom Tone Bundle", 34_900],
    ]);
    expect(nanocore).toMatchObject({ priceFils: 20_000, compareAtFils: null });
    expect(nanocore.placeholderPhotos).toBe(true);
    expect(nanocore.images[0].src).toBe("/images/stand-ins/nanocore-player");
    expect(listed.some((p) => p.kind === "service_addon")).toBe(false);
    expect(addons).toEqual([
      expect.objectContaining({ slug: "extra-custom-tone", priceFils: 5_000 }),
    ]);

    // A switched-off bundle isn't offered, and the "from" price follows what is.
    await test.db
      .update(productVariants)
      .set({ active: false })
      .where(eq(productVariants.nameEn, "Device only"));
    const after = (await loadCatalog(test.db)).products.find((p) => p.slug === "nanocore")!;
    expect(after.variants.map((v) => v.nameEn)).toEqual(["Starter Bundle", "Custom Tone Bundle"]);
    expect(after.priceFils).toBe(29_900);
  });

  it("never includes archived products", async () => {
    await insertProduct(test.db, { slug: "archived-one", status: "archived" });
    await insertProduct(test.db, { slug: "listed-one" });
    const { products: listed } = await loadCatalog(test.db);
    expect(listed.map((p) => p.slug)).toEqual(["listed-one"]);
  });

  it("keeps cost, serials and hold notes out of what it returns", async () => {
    const id = await insertProduct(test.db, {
      slug: "held",
      costFils: 123_456,
      reservedNote: "Deposit from Ahmed, +971501234567",
      specs: { serial: "SECRET-SERIAL", body: "Alder" },
    });
    await test.db
      .update(products)
      .set({ status: "reserved", reservedUntil: new Date("2026-11-01T00:00:00Z") })
      .where(eq(products.id, id));
    await test.db
      .insert(productImages)
      .values({ productId: id, key: "samples/cable", width: 1920, height: 2400 });

    const { products: listed } = await loadCatalog(test.db);
    const serialised = JSON.stringify(listed);
    expect(listed[0].status).toBe("reserved");
    expect(listed[0].specs).toEqual({ body: "Alder" });
    for (const secret of ["123456", "SECRET-SERIAL", "Ahmed", "+971501234567", "2026-11-01"]) {
      expect(serialised).not.toContain(secret);
    }
    for (const field of [
      "costFils",
      "reservedNote",
      "reservedUntil",
      "isSample",
      "quantity",
      "id",
    ]) {
      expect(listed[0]).not.toHaveProperty(field);
    }
  });
});
