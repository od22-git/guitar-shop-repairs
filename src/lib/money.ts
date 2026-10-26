import type { Locale } from "@/i18n/routing";

import { intlLocale } from "./intl";

// Money is stored as integer fils: 1 AED = 100 fils.
export const FILS_PER_AED = 100;

const formatters = new Map<string, Intl.NumberFormat>();

function formatter(locale: Locale, fractionDigits: 0 | 2): Intl.NumberFormat {
  const key = `${locale}:${fractionDigits}`;
  let cached = formatters.get(key);
  if (!cached) {
    cached = new Intl.NumberFormat(intlLocale(locale), {
      style: "currency",
      currency: "AED",
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
    formatters.set(key, cached);
  }
  return cached;
}

/**
 * Formats integer fils as AED: "AED 12,500" in English, "12,500 د.إ." in Arabic.
 * Whole dirhams show no decimals; anything else shows two. Wrap the result in <Bdi>
 * inside running Arabic text.
 */
export function formatMoney(fils: number, locale: Locale): string {
  if (!Number.isSafeInteger(fils)) {
    throw new RangeError(`Money must be a whole number of fils, got ${fils}`);
  }
  const fractionDigits = fils % FILS_PER_AED === 0 ? 0 : 2;
  return formatter(locale, fractionDigits).format(fils / FILS_PER_AED);
}
