import { createTranslator } from "next-intl";

import { brand } from "@/config/brand";
import type { Locale } from "@/i18n/routing";
import { isolate } from "@/lib/bidi";

import ar from "../../../messages/ar.json";
import en from "../../../messages/en.json";

import { waMeUrl } from "./wa-me";

// The admin's first reply to an online repair booking, in the language it was made in.
// The admin writes the rest (appointment, courier) in WhatsApp before sending.

const messages = { en, ar };

export function inboxReplyUrl(submission: {
  name: string;
  phoneE164: string;
  locale: Locale;
}): string {
  const { locale } = submission;
  const t = createTranslator({ locale, messages: messages[locale], namespace: "InboxWhatsApp" });
  const text = t("repairReply", { name: isolate(submission.name), brand: brand.name[locale] });
  return waMeUrl(submission.phoneE164, text);
}
