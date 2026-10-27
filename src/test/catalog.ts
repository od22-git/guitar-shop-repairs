import type { PublicProduct } from "@/lib/public-dto";

let counter = 0;

/** A listed product as public pages see it, for tests that need no database. */
export function publicProduct(overrides: Partial<PublicProduct> = {}): PublicProduct {
  counter += 1;
  return {
    slug: `product-${counter}`,
    sku: `SKU-${counter}`,
    kind: "guitar",
    category: { slug: "used-guitars", nameEn: "Used guitars", nameAr: "جيتارات مستعملة" },
    brand: null,
    model: null,
    year: null,
    titleEn: `Product ${counter}`,
    titleAr: null,
    descriptionEn: null,
    descriptionAr: null,
    techNotesEn: null,
    techNotesAr: null,
    condition: "good",
    priceFils: 100_000,
    compareAtFils: null,
    status: "available",
    specs: {},
    images: [],
    placeholderPhotos: false,
    inTheBoxEn: null,
    inTheBoxAr: null,
    variants: [],
    publishedAt: new Date("2026-10-01T00:00:00Z"),
    soldAt: null,
    updatedAt: new Date("2026-10-01T00:00:00Z"),
    ...overrides,
  };
}
