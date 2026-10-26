import { getTranslations } from "next-intl/server";

import { brand } from "@/config/brand";
import { waMeUrl } from "./wa-me";

import type { Locale } from "@/i18n/routing";

/** wa.me link to the shop with a short greeting in the visitor's language. */
export async function shopWhatsAppUrl(locale: Locale): Promise<string> {
  const t = await getTranslations({ locale, namespace: "WhatsApp" });
  return waMeUrl(brand.whatsappE164, t("greeting", { brand: brand.name[locale] }));
}
