import "server-only";

import { getTranslations } from "next-intl/server";

import { brand } from "@/config/brand";
import { getPathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { env } from "@/lib/env";
import { localized } from "@/lib/localized";
import type { PublicAddon, PublicProduct } from "@/lib/public-dto";
import { getSettings } from "@/lib/settings";

import {
  productAsk,
  productMessageValues,
  variantHasTones,
  variantMessageValues,
  type ProductAsk,
} from "./product-message";
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

/** The order link for one variant, and with the add-on when it can go with that variant. */
export type VariantLinks = { id: number; href: string; withAddon: string | null };

/**
 * A wa.me order link per variant, naming the variant (and the add-on, when ticked) as the
 * page shows them, so the owner knows exactly which bundle was picked.
 */
export async function variantWhatsAppLinks(
  locale: Locale,
  product: PublicProduct,
  addon: PublicAddon | null,
): Promise<VariantLinks[]> {
  const [t, settings] = await Promise.all([
    getTranslations({ locale, namespace: "WhatsApp" }),
    getSettings(),
  ]);
  const base = {
    title: localized(locale, product.titleEn, product.titleAr).text,
    sku: product.sku,
    url: productUrl(locale, product.slug),
  };
  const values = { brand: brand.name[locale] };
  return product.variants.map((variant) => {
    const name = localized(locale, variant.nameEn, variant.nameAr).text;
    const href = waMeUrl(
      settings.whatsapp_number,
      t("orderVariant", { ...values, ...variantMessageValues({ ...base, variant: name }) }),
    );
    const withAddon =
      addon && variantHasTones(variant)
        ? waMeUrl(
            settings.whatsapp_number,
            t("orderVariantAddon", {
              ...values,
              ...variantMessageValues({
                ...base,
                variant: name,
                addon: localized(locale, addon.titleEn, addon.titleAr).text,
              }),
            }),
          )
        : null;
    return { id: variant.id, href, withAddon };
  });
}
