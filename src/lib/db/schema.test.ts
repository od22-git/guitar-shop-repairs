import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createPgliteDatabase, type TestDatabase } from "@/test/db";
import { insertProduct } from "@/test/products";

import type { Database } from "./connect";
import { deliveryZones, productImages, products } from "./schema";

/** The constraint a failed query broke (drizzle wraps the driver's error). */
async function violatedConstraint(query: Promise<unknown>): Promise<string | undefined> {
  const error = await query.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(error, "expected the database to refuse").toBeDefined();
  const cause = (error as { cause?: { constraint?: string } }).cause;
  return cause?.constraint;
}

describe("catalog schema constraints", () => {
  let test: TestDatabase;
  let db: Database;

  beforeAll(async () => {
    test = await createPgliteDatabase();
    db = test.db;
  }, 30_000);
  afterAll(() => test?.close());
  beforeEach(() => test.reset());

  it("accepts a complete listing and a bare draft", async () => {
    await insertProduct(db);
    await insertProduct(db, {
      status: "draft",
      priceFils: null,
      categoryId: null,
      publishedAt: null,
    });
  });

  it("keeps a guitar to one unit", async () => {
    expect(await violatedConstraint(insertProduct(db, { quantity: 2 }))).toBe(
      "products_guitar_single",
    );
  });

  it("keeps stock and status consistent", async () => {
    expect(await violatedConstraint(insertProduct(db, { quantity: 0 }))).toBe(
      "products_stock_matches_status",
    );
    expect(
      await violatedConstraint(insertProduct(db, { kind: "gear", status: "sold", quantity: 2 })),
    ).toBe("products_stock_matches_status");
    expect(await violatedConstraint(insertProduct(db, { kind: "gear", quantity: -1 }))).toBe(
      "products_quantity_non_negative",
    );
  });

  it("only holds single units", async () => {
    expect(
      await violatedConstraint(
        insertProduct(db, { kind: "gear", status: "reserved", quantity: 3 }),
      ),
    ).toBe("products_reserved_single");
  });

  it("needs a price, category and publish date for anything public", async () => {
    for (const missing of [{ priceFils: null }, { categoryId: null }, { publishedAt: null }]) {
      expect(await violatedConstraint(insertProduct(db, missing))).toBe("products_listed_complete");
    }
  });

  it("checks money and years", async () => {
    expect(await violatedConstraint(insertProduct(db, { priceFils: -1 }))).toBe(
      "products_money_non_negative",
    );
    expect(
      await violatedConstraint(insertProduct(db, { priceFils: 100_000, compareAtFils: 90_000 })),
    ).toBe("products_compare_at_above_price");
    expect(await violatedConstraint(insertProduct(db, { year: 1850 }))).toBe(
      "products_year_plausible",
    );
  });

  it("keeps slugs and SKUs unique", async () => {
    await insertProduct(db, { slug: "one", sku: "ONE" });
    expect(await violatedConstraint(insertProduct(db, { slug: "one" }))).toBe(
      "products_slug_unique",
    );
    expect(await violatedConstraint(insertProduct(db, { sku: "ONE" }))).toBe("products_sku_unique");
  });

  it("deletes a product's images with it", async () => {
    const id = await insertProduct(db);
    await db.insert(productImages).values({ productId: id, key: "p/1", width: 640, height: 800 });
    await db.delete(products);
    expect(await db.select().from(productImages)).toEqual([]);
  });

  it("needs at least one emirate per delivery zone", async () => {
    expect(
      await violatedConstraint(
        db
          .insert(deliveryZones)
          .values({ nameEn: "None", nameAr: "لا شيء", emirates: [], feeFils: 0 }),
      ),
    ).toBe("delivery_zones_has_emirates");
  });
});
