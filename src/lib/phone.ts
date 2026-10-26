import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js/max";

import { toWesternDigits } from "./digits";

// Phone numbers are stored in E.164 ("+971501234567") and matched on that, so a
// returning customer is found however they typed their number.

/** Numbers without a country code are read as UAE numbers. */
export const DEFAULT_PHONE_COUNTRY: CountryCode = "AE";

// Longer than any real number with spacing; anything beyond is not a phone number.
const MAX_INPUT_LENGTH = 40;

// Direction marks and isolates that come along when a number is copied from WhatsApp
// or from Arabic text (U+200E/F, U+202A–E, U+2066–9).
const BIDI_CONTROLS = /[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g;

export type NormalizePhoneOptions = {
  defaultCountry?: CountryCode;
  /** Reject numbers that can only be landlines (for WhatsApp, which needs a mobile). */
  mobileOnly?: boolean;
};

/**
 * Reads a phone number as people type it and returns it in E.164, or null if it isn't
 * a valid number. Accepts local UAE numbers ("050 123 4567"), "+971…" and "00971…",
 * other countries with "+" or "00", spaces, dashes, dots and brackets, and Arabic-Indic
 * digits ("٠٥٠١٢٣٤٥٦٧").
 */
export function normalizePhone(
  input: string,
  { defaultCountry = DEFAULT_PHONE_COUNTRY, mobileOnly = false }: NormalizePhoneOptions = {},
): string | null {
  if (input.length > MAX_INPUT_LENGTH) return null;
  const cleaned = toWesternDigits(input.replace(BIDI_CONTROLS, "")).trim();
  if (!/^[+\d(][\d\s\-.()]*$/.test(cleaned)) return null;

  const phone = parsePhoneNumberFromString(cleaned, { defaultCountry, extract: false });
  if (!phone?.isValid()) return null;
  if (mobileOnly) {
    const type = phone.getType();
    // Some countries (e.g. the US) don't tell mobiles and landlines apart.
    if (type !== "MOBILE" && type !== "FIXED_LINE_OR_MOBILE") return null;
  }
  return phone.number;
}

/** "+971 50 123 4567": an E.164 number spaced for reading. Wrap it in <Ltr> in the UI. */
export function formatPhone(e164: string): string {
  const phone = parsePhoneNumberFromString(e164);
  if (!phone || phone.number !== e164) {
    throw new RangeError("Expected a phone number in E.164 format, e.g. +971501234567");
  }
  return phone.formatInternational();
}
