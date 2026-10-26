import { createTranslator } from "next-intl";

import { brand } from "@/config/brand";
import type { Locale } from "@/i18n/routing";
import { isolate } from "@/lib/bidi";

import ar from "../../../messages/ar.json";
import en from "../../../messages/en.json";

import { waMeUrl } from "./wa-me";

// The admin's first reply to an online repair booking or a guitar offered on /sell, in
// the language it was made in. The admin writes the rest (appointment, courier, an
// offer) in WhatsApp before sending.

const messages = { en, ar };

export function inboxReplyUrl(
  submission: { name: string; phoneE164: string; locale: Locale },
  /** For a guitar offered on /sell: its brand and model, as typed. */
  guitar?: string,
): string {
  const { locale } = submission;
  const t = createTranslator({ locale, messages: messages[locale], namespace: "InboxWhatsApp" });
  const name = isolate(submission.name);
  const text = guitar
    ? t("sellReply", { name, guitar: isolate(guitar), brand: brand.name[locale] })
    : t("repairReply", { name, brand: brand.name[locale] });
  return waMeUrl(submission.phoneE164, text);
}
