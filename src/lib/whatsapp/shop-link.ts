import { getTranslations } from "next-intl/server";

import { brand } from "@/config/brand";
import { waMeUrl } from "./wa-me";

import type { Locale } from "@/i18n/routing";

/** The opening messages the site can prefill, in the WhatsApp message namespace. */
export type ShopGreeting = "greeting" | "repairGreeting";

/** wa.me link to the shop with a short opening message in the visitor's language. */
export async function shopWhatsAppUrl(
  locale: Locale,
  message: ShopGreeting = "greeting",
): Promise<string> {
  const t = await getTranslations({ locale, namespace: "WhatsApp" });
  return waMeUrl(brand.whatsappE164, t(message, { brand: brand.name[locale] }));
}
