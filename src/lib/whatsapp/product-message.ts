import { isolate, isolateLtr } from "@/lib/bidi";
import type { PublicStatus } from "@/lib/public-dto";

/** What a product page asks on WhatsApp: to order it, to be told if a hold falls through, or for something similar. */
export type ProductAsk = "order" | "hold" | "similar";

export function productAsk(status: PublicStatus): ProductAsk {
  if (status === "available") return "order";
  return status === "reserved" ? "hold" : "similar";
}

/**
 * Message values for a product: the title as shown on the page, the SKU and the page URL.
 * Title and SKU are isolated so they stay whole inside Arabic text in WhatsApp.
 */
export function productMessageValues(product: { title: string; sku: string; url: string }) {
  return { title: isolate(product.title), sku: isolateLtr(product.sku), url: product.url };
}

/**
 * Message values for ordering one variant, optionally with an add-on: the product values
 * plus the variant's and add-on's names as shown on the page, isolated the same way.
 */
export function variantMessageValues(product: {
  title: string;
  sku: string;
  url: string;
  variant: string;
  addon?: string;
}) {
  return {
    ...productMessageValues(product),
    variant: isolate(product.variant),
    ...(product.addon !== undefined && { addon: isolate(product.addon) }),
  };
}

/** Whether a variant comes with tones, so a tone add-on can go with it. */
export function variantHasTones(variant: { customToneSlots: number; includesPack: boolean }) {
  return variant.customToneSlots > 0 || variant.includesPack;
}
