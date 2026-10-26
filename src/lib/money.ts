import type { Locale } from "@/i18n/routing";

import { toWesternDigits } from "./digits";
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

/** UAE VAT is 5%. Rates are stored in basis points (1 bps = 0.01%). */
export const UAE_VAT_RATE_BPS = 500;

/** The largest amount a money column (Postgres integer) holds: about AED 21.4 million. */
export const MAX_FILS = 2_147_483_647;

/**
 * The VAT already inside a VAT-inclusive amount: amount × rate / (100% + rate), which
 * is amount × 5/105 at 5%. Rounded to whole fils, half away from zero, in integer
 * arithmetic. Apply it per order line (unit price × quantity) and sum the lines.
 */
export function vatIncludedFils(amountFils: number, rateBps: number = UAE_VAT_RATE_BPS): number {
  if (!Number.isSafeInteger(amountFils) || !Number.isSafeInteger(rateBps) || rateBps < 0) {
    throw new RangeError("VAT needs whole fils and a whole, non-negative rate in basis points");
  }
  const numerator = Math.abs(amountFils) * rateBps;
  if (!Number.isSafeInteger(numerator)) throw new RangeError("Amount too large for VAT");
  const denominator = 10_000 + rateBps;
  const quotient = Math.floor(numerator / denominator);
  const remainder = numerator - quotient * denominator;
  const rounded = remainder * 2 >= denominator ? quotient + 1 : quotient;
  return amountFils < 0 ? -rounded : rounded;
}

// "12500", "12,500", "12500.5", "12,500.50"; separators already normalised.
const AED_INPUT = /^(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?$/;

/**
 * Parses an amount in dirhams as typed in a form into fils, without floating point
 * (so "19.99" is exactly 1999). Accepts Arabic-Indic digits and the Arabic decimal and
 * thousands separators. Returns null for anything else: negatives, more than two
 * decimals, stray text, or more than MAX_FILS.
 */
export function parseAedToFils(input: string): number | null {
  const normalised = toWesternDigits(input.trim())
    .replace(/\u066b/g, ".")
    .replace(/\u066c/g, ",");
  if (!AED_INPUT.test(normalised)) return null;
  const [whole, fraction = ""] = normalised.replace(/,/g, "").split(".");
  const fils = Number(whole) * FILS_PER_AED + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(fils) && fils <= MAX_FILS ? fils : null;
}

/** Fils as a plain decimal amount in dirhams, "3450.00", for structured data (JSON-LD). */
export function filsToDecimalString(fils: number): string {
  if (!Number.isSafeInteger(fils) || fils < 0) {
    throw new RangeError(`Money must be a whole, non-negative number of fils, got ${fils}`);
  }
  return `${Math.trunc(fils / FILS_PER_AED)}.${String(fils % FILS_PER_AED).padStart(2, "0")}`;
}
