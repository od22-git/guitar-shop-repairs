import { filsToDecimalString } from "@/lib/money";
import type { PublicProduct, PublicStatus } from "@/lib/public-dto";

// schema.org Product data for search engines, with the offer's current availability. A
// product sold in variants (the NANOCORE's bundles) has an AggregateOffer: the lowest and
// highest price, and one Offer per variant, all with the product's one availability.

const availability: Record<PublicStatus, string> = {
  available: "https://schema.org/InStock",
  reserved: "https://schema.org/Reserved",
  sold: "https://schema.org/SoldOut",
};

/** The largest stored width (see stockPhotoWidths), as an absolute URL. */
const imageUrl = (src: string, siteUrl: string) => new URL(`${src}-1920.webp`, siteUrl).toString();

/**
 * The page's JSON-LD, as text safe to put in a <script>: "<" is escaped so no value can
 * close the script element.
 */
export function productJsonLd(
  product: PublicProduct,
  page: {
    name: string;
    description: string | null;
    url: string;
    siteUrl: string;
    /** Variant names as the page shows them, by variant id. */
    variantNames?: ReadonlyMap<number, string>;
  },
): string {
  const itemCondition =
    product.condition === null
      ? "https://schema.org/NewCondition"
      : "https://schema.org/UsedCondition";
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: page.name,
    ...(page.description && { description: page.description }),
    sku: product.sku,
    ...(product.brand && { brand: { "@type": "Brand", name: product.brand } }),
    ...(product.model && { model: product.model }),
    category: product.category.nameEn,
    image: product.images.map((image) => imageUrl(image.src, page.siteUrl)),
    itemCondition,
    offers: product.variants.length > 0 ? aggregateOffer() : offer(product.priceFils),
  };
  function offer(fils: number, name?: string) {
    return {
      "@type": "Offer",
      ...(name && { name }),
      url: page.url,
      price: filsToDecimalString(fils),
      priceCurrency: "AED",
      availability: availability[product.status],
      itemCondition,
    };
  }
  function aggregateOffer() {
    const prices = product.variants.map((variant) => variant.priceFils);
    return {
      "@type": "AggregateOffer",
      lowPrice: filsToDecimalString(Math.min(...prices)),
      highPrice: filsToDecimalString(Math.max(...prices)),
      offerCount: product.variants.length,
      priceCurrency: "AED",
      availability: availability[product.status],
      offers: product.variants.map((variant) =>
        offer(variant.priceFils, page.variantNames?.get(variant.id) ?? variant.nameEn),
      ),
    };
  }
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
