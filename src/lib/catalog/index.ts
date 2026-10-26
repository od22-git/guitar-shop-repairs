import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { db } from "@/lib/db/client";

import { loadCatalog, type Catalog } from "./load";

export type { Catalog } from "./load";

/**
 * Cache tag for everything that shows products or categories: both locales of the shop,
 * category and product pages, and the sitemap. Every admin change to a product, its
 * photos or its stock revalidates it (M4), so a sold guitar never shows as available.
 */
export const CATALOG_TAG = "catalog";

/** The public catalog, cached until an admin change revalidates CATALOG_TAG. */
export async function getCatalog(): Promise<Catalog> {
  "use cache";
  cacheLife("max");
  cacheTag(CATALOG_TAG);
  return loadCatalog(db);
}

export async function getCategory(slug: string) {
  const { categories } = await getCatalog();
  return categories.find((category) => category.slug === slug) ?? null;
}

/** A listed product, or null for unknown slugs, drafts and archived products. */
export async function getProduct(slug: string) {
  const { products } = await getCatalog();
  return products.find((product) => product.slug === slug) ?? null;
}
