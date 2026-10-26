import { getLocale, getTranslations } from "next-intl/server";

import { shopWhatsAppUrl } from "@/lib/whatsapp/shop-link";

import { WhatsAppIcon } from "./whatsapp-icon";

/**
 * Floating "Message us on WhatsApp" button at the inline end of the viewport.
 * It never hides content: the page reserves space below the footer for it, and
 * `scroll-padding` in globals.css keeps focused elements scrolled clear of it.
 */
export async function WhatsAppButton() {
  const locale = await getLocale();
  const [t, href] = await Promise.all([getTranslations("WhatsApp"), shopWhatsAppUrl(locale)]);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("cta")}
      data-testid="whatsapp-button"
      className="fixed end-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 inline-flex min-h-14 min-w-14 items-center justify-center gap-2 rounded-full bg-sherwood px-4 font-semibold text-white ring-2 ring-mist hover:brightness-110 sm:px-5"
    >
      <WhatsAppIcon className="size-6 shrink-0" />
      {/* Icon only on phones; the aria-label names it either way. */}
      <span className="hidden sm:inline">{t("short")}</span>
    </a>
  );
}
