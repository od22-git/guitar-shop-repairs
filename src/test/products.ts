import type { Database } from "@/lib/db/connect";
import { categories, products, type NewProduct } from "@/lib/db/schema";

let counter = 0;

/**
 * Inserts a listed product (an available guitar unless overridden) in a test category
 * and returns its id. Each call gets a unique slug and SKU.
 */
export async function insertProduct(
  db: Database,
  overrides: Partial<NewProduct> = {},
): Promise<number> {
  const [category] = await db
    .insert(categories)
    .values({ slug: "test-category", nameEn: "Test", nameAr: "اختبار" })
    .onConflictDoUpdate({ target: categories.slug, set: { nameEn: "Test" } })
    .returning({ id: categories.id });
  counter += 1;
  const [product] = await db
    .insert(products)
    .values({
      kind: "guitar",
      categoryId: category.id,
      slug: `test-product-${counter}`,
      sku: `TEST-${counter}`,
      titleEn: `Test product ${counter}`,
      priceFils: 100_000,
      quantity: 1,
      status: "available",
      publishedAt: new Date(),
      ...overrides,
    })
    .returning({ id: products.id });
  return product.id;
}
