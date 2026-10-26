import "server-only";

import { getTranslations } from "next-intl/server";

import { brand } from "@/config/brand";
import { getPathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { env } from "@/lib/env";
import { localized } from "@/lib/localized";
import type { PublicProduct } from "@/lib/public-dto";
import { getSettings } from "@/lib/settings";

import { productAsk, productMessageValues, type ProductAsk } from "./product-message";
import { waMeUrl } from "./wa-me";

/** The absolute URL of a product page, as shared in messages and previews. */
export function productUrl(locale: Locale, slug: string): string {
  return new URL(getPathname({ href: `/product/${slug}`, locale }), env.SITE_URL).toString();
}

/**
 * The product page's WhatsApp link: an order for an available item, otherwise a question
 * about the hold or about something similar. The message names the item and its SKU, so
 * the owner can tell which one even if it has sold since.
 */
export async function productWhatsAppLink(
  locale: Locale,
  product: PublicProduct,
): Promise<{ ask: ProductAsk; href: string }> {
  const [t, settings] = await Promise.all([
    getTranslations({ locale, namespace: "WhatsApp" }),
    getSettings(),
  ]);
  const ask = productAsk(product.status);
  const text = t(ask, {
    brand: brand.name[locale],
    ...productMessageValues({
      title: localized(locale, product.titleEn, product.titleAr).text,
      sku: product.sku,
      url: productUrl(locale, product.slug),
    }),
  });
  return { ask, href: waMeUrl(settings.whatsapp_number, text) };
}
