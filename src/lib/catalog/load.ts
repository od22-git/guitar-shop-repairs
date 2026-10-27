import { asc, desc, inArray } from "drizzle-orm";

import type { Database } from "../db/connect";
import {
  categories,
  productImages,
  products,
  productVariants,
  type ProductImage,
  type ProductVariant,
} from "../db/schema";
import {
  toPublicAddon,
  toPublicCategory,
  toPublicProduct,
  type PublicAddon,
  type PublicCategory,
  type PublicProduct,
  type PublicStatus,
} from "../public-dto";

/** Everything the public catalog shows. The shop has under 50 products, so it's one read. */
export type Catalog = {
  /** In menu order. */
  categories: PublicCategory[];
  /** Listed products, newest first. Service add-ons aren't products with a page. */
  products: PublicProduct[];
  /** Listed service add-ons (an extra custom tone), offered with bundles. */
  addons: PublicAddon[];
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

  const ids = productRows.map((p) => p.id);
  const [imageRows, variantRows] =
    ids.length === 0
      ? [[], []]
      : await Promise.all([
          db
            .select()
            .from(productImages)
            .where(inArray(productImages.productId, ids))
            .orderBy(asc(productImages.sort), asc(productImages.id)),
          db
            .select()
            .from(productVariants)
            .where(inArray(productVariants.productId, ids))
            .orderBy(asc(productVariants.sort), asc(productVariants.id)),
        ]);

  const categoryById = new Map(categoryRows.map((c) => [c.id, c]));
  const imagesByProduct = Map.groupBy(imageRows, (image) => image.productId);
  const variantsByProduct = Map.groupBy(variantRows, (variant) => variant.productId);
  const noImages: ProductImage[] = [];
  const noVariants: ProductVariant[] = [];

  return {
    categories: categoryRows.map(toPublicCategory),
    products: productRows.flatMap((product) => {
      const category = product.categoryId === null ? null : categoryById.get(product.categoryId);
      const result = toPublicProduct(
        product,
        category ?? null,
        imagesByProduct.get(product.id) ?? noImages,
        variantsByProduct.get(product.id) ?? noVariants,
      );
      return result ? [result] : [];
    }),
    addons: productRows.flatMap((product) => {
      const addon = toPublicAddon(product);
      return addon ? [addon] : [];
    }),
  };
}
