import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { productImages, products } from "@/lib/db/schema";
import { sampleProducts, seed } from "@/lib/db/seed";
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
      "electric-guitars",
      "pedals",
      "amps",
      "parts-accessories",
    ]);
    const expected = sampleProducts.filter((p) => p.status !== "draft");
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
      slug: "electric-guitars",
      nameEn: "Electric guitars",
      nameAr: "جيتارات كهربائية",
    });
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
