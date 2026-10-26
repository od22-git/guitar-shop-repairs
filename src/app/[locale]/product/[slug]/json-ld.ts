import { filsToDecimalString } from "@/lib/money";
import type { PublicProduct, PublicStatus } from "@/lib/public-dto";

// schema.org Product data for search engines, with the offer's current availability.

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
  page: { name: string; description: string | null; url: string; siteUrl: string },
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
    offers: {
      "@type": "Offer",
      url: page.url,
      price: filsToDecimalString(product.priceFils),
      priceCurrency: "AED",
      availability: availability[product.status],
      itemCondition,
    },
  };
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
