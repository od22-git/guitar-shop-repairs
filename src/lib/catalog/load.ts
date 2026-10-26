import { asc, desc, inArray } from "drizzle-orm";

import type { Database } from "../db/connect";
import { categories, productImages, products, type ProductImage } from "../db/schema";
import {
  toPublicCategory,
  toPublicProduct,
  type PublicCategory,
  type PublicProduct,
  type PublicStatus,
} from "../public-dto";

/** Everything the public catalog shows. The shop has under 50 products, so it's one read. */
export type Catalog = {
  /** In menu order. */
  categories: PublicCategory[];
  /** Listed products, newest first. */
  products: PublicProduct[];
};

const listed: PublicStatus[] = ["available", "reserved", "sold"];

export async function loadCatalog(db: Database): Promise<Catalog> {
  const [categoryRows, productRows] = await Promise.all([
    db.select().from(categories).orderBy(asc(categories.sort), asc(categories.id)),
    db
      .select()
      .from(products)
      .where(inArray(products.status, listed))
      .orderBy(desc(products.publishedAt), desc(products.id)),
  ]);

  const imageRows =
    productRows.length === 0
      ? []
      : await db
          .select()
          .from(productImages)
          .where(
            inArray(
              productImages.productId,
              productRows.map((p) => p.id),
            ),
          )
          .orderBy(asc(productImages.sort), asc(productImages.id));

  const categoryById = new Map(categoryRows.map((c) => [c.id, c]));
  const imagesByProduct = Map.groupBy(imageRows, (image) => image.productId);
  const noImages: ProductImage[] = [];

  return {
    categories: categoryRows.map(toPublicCategory),
    products: productRows.flatMap((product) => {
      const category = product.categoryId === null ? null : categoryById.get(product.categoryId);
      const result = toPublicProduct(
        product,
        category ?? null,
        imagesByProduct.get(product.id) ?? noImages,
      );
      return result ? [result] : [];
    }),
  };
}
