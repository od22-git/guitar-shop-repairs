import type { Category, Product, ProductImage } from "./db/schema";
import { productImageSrc, productOgImageSrc } from "./product-images";
import type { ProductSpecs } from "./product-specs";

// The only shapes public pages receive. Each is built field by field from an allowlist,
// so a column added later (cost, serials, hold notes, internal flags) stays private
// until it is deliberately added here.

/** Statuses the public can see. Drafts and archived products are never sent. */
export type PublicStatus = "available" | "reserved" | "sold";

export type PublicCategory = {
  slug: string;
  nameEn: string;
  nameAr: string;
};

export type PublicImage = {
  /** For next/image: the stored path without width or extension. */
  src: string;
  /** A 1200×630 JPEG for link previews (WhatsApp shows no WebP previews). */
  ogSrc: string;
  width: number;
  height: number;
  altEn: string | null;
  altAr: string | null;
};

/** Spec fields shown on product pages. `serial` stays admin-only. */
const publicSpecKeys = [
  "bodyStyle",
  "body",
  "finish",
  "neck",
  "fretboard",
  "frets",
  "scale",
  "pickupLayout",
  "pickups",
  "weightKg",
  "case",
  "mods",
] as const satisfies readonly (keyof ProductSpecs)[];

export type PublicSpecs = Pick<ProductSpecs, (typeof publicSpecKeys)[number]>;

export type PublicProduct = {
  slug: string;
  sku: string;
  kind: Product["kind"];
  category: PublicCategory;
  brand: string | null;
  model: string | null;
  year: number | null;
  titleEn: string;
  titleAr: string | null;
  descriptionEn: string | null;
  descriptionAr: string | null;
  techNotesEn: string | null;
  techNotesAr: string | null;
  /** Null for new, ungraded gear. */
  condition: Product["condition"];
  priceFils: number;
  compareAtFils: number | null;
  status: PublicStatus;
  specs: PublicSpecs;
  /** In display order; the first is the main photo. */
  images: PublicImage[];
  publishedAt: Date;
  soldAt: Date | null;
  updatedAt: Date;
};

const publicStatuses: readonly string[] = [
  "available",
  "reserved",
  "sold",
] satisfies PublicStatus[];

export function isPublicStatus(status: string): status is PublicStatus {
  return publicStatuses.includes(status);
}

export function toPublicCategory(category: Category): PublicCategory {
  return { slug: category.slug, nameEn: category.nameEn, nameAr: category.nameAr };
}

export function toPublicImage(image: ProductImage): PublicImage {
  return {
    src: productImageSrc(image.key),
    ogSrc: productOgImageSrc(image.key),
    width: image.width,
    height: image.height,
    altEn: image.altEn,
    altAr: image.altAr,
  };
}

function toPublicSpecs(specs: ProductSpecs): PublicSpecs {
  const result: Record<string, unknown> = {};
  for (const key of publicSpecKeys) {
    if (specs[key] !== undefined) result[key] = specs[key];
  }
  return result as PublicSpecs;
}

/**
 * The public view of a product, or null when it isn't listed (a draft, archived, or
 * missing what a listing needs). `images` must be the product's own, in display order.
 */
export function toPublicProduct(
  product: Product,
  category: Category | null,
  images: readonly ProductImage[],
): PublicProduct | null {
  const { status, priceFils, publishedAt } = product;
  if (!isPublicStatus(status) || priceFils === null || !publishedAt || !category) return null;

  return {
    slug: product.slug,
    sku: product.sku,
    kind: product.kind,
    category: toPublicCategory(category),
    brand: product.brand,
    model: product.model,
    year: product.year,
    titleEn: product.titleEn,
    titleAr: product.titleAr,
    descriptionEn: product.descriptionEn,
    descriptionAr: product.descriptionAr,
    techNotesEn: product.techNotesEn,
    techNotesAr: product.techNotesAr,
    condition: product.condition,
    priceFils,
    compareAtFils: product.compareAtFils,
    status,
    specs: toPublicSpecs(product.specs),
    images: images.map(toPublicImage),
    publishedAt,
    soldAt: product.soldAt,
    updatedAt: product.updatedAt,
  };
}
