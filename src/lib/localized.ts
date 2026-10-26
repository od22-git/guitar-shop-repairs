import type { Locale } from "@/i18n/routing";

// Bilingual content (product titles, descriptions) in the page's language. Arabic
// fields are optional: an Arabic page falls back to the English text, marked as English
// so screen readers pronounce it right and the browser lays it out by its own direction.

export type Localized = { text: string; lang: Locale };

export function localized(locale: Locale, en: string, ar: string | null): Localized {
  if (locale === "ar" && ar?.trim()) return { text: ar, lang: "ar" };
  return { text: en, lang: "en" };
}

export function localizedOptional(
  locale: Locale,
  en: string | null,
  ar: string | null,
): Localized | null {
  if (locale === "ar" && ar?.trim()) return { text: ar, lang: "ar" };
  return en?.trim() ? { text: en, lang: "en" } : null;
}

/** `lang` and `dir` for an element showing `value` on a `locale` page. */
export function localizedAttrs(value: Localized, locale: Locale): { lang?: Locale; dir?: "auto" } {
  return value.lang === locale ? {} : { lang: value.lang, dir: "auto" };
}
