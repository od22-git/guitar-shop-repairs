import { getTranslations } from "next-intl/server";

import { brand } from "@/config/brand";
import { getSettings } from "@/lib/settings";

import { waMeUrl } from "./wa-me";

import type { Locale } from "@/i18n/routing";

/** The opening messages the site can prefill, in the WhatsApp message namespace. */
export type ShopGreeting = "greeting" | "repairGreeting" | "stock";

/** wa.me link to the shop with a short opening message in the visitor's language. */
export async function shopWhatsAppUrl(
  locale: Locale,
  message: ShopGreeting = "greeting",
): Promise<string> {
  const [t, settings] = await Promise.all([
    getTranslations({ locale, namespace: "WhatsApp" }),
    getSettings(),
  ]);
  return waMeUrl(settings.whatsapp_number, t(message, { brand: brand.name[locale] }));
}
