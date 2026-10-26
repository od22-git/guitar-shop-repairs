import type { Locale } from "@/i18n/routing";

// BCP 47 tags for Intl formatters. Arabic uses Western digits (nu-latn) and the
// Gregorian calendar, as is usual in the UAE; browsers default `ar` to Arabic-Indic
// digits, so this is spelled out rather than left to the runtime.
const tags: Record<Locale, string> = {
  en: "en-AE",
  ar: "ar-AE-u-nu-latn-ca-gregory",
};

export function intlLocale(locale: Locale): string {
  return tags[locale];
}
