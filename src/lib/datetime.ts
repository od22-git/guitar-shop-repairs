import type { Locale } from "@/i18n/routing";

import { intlLocale } from "./intl";

// Servers run in UTC; every time shown to anyone is in the shop's time zone.
export const TIME_ZONE = "Asia/Dubai";

const dateOptions: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "long",
  year: "numeric",
};

const dateTimeOptions: Intl.DateTimeFormatOptions = {
  ...dateOptions,
  hour: "numeric",
  minute: "2-digit",
};

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(locale: Locale, kind: "date" | "dateTime"): Intl.DateTimeFormat {
  const key = `${locale}:${kind}`;
  let cached = formatters.get(key);
  if (!cached) {
    cached = new Intl.DateTimeFormat(intlLocale(locale), {
      ...(kind === "date" ? dateOptions : dateTimeOptions),
      timeZone: TIME_ZONE,
    });
    formatters.set(key, cached);
  }
  return cached;
}

/** "27 October 2026" / "27 أكتوبر 2026", as the calendar date in Dubai. */
export function formatDate(date: Date, locale: Locale): string {
  return formatter(locale, "date").format(date);
}

/** "27 October 2026 at 1:30 AM" / "27 أكتوبر 2026 في 1:30 ص", in Dubai time. */
export function formatDateTime(date: Date, locale: Locale): string {
  return formatter(locale, "dateTime").format(date);
}

/** Dubai is UTC+4 all year (no daylight saving). */
const DUBAI_OFFSET_MS = 4 * 60 * 60 * 1000;

/**
 * The last moment of a calendar day in Dubai, from a date input's "YYYY-MM-DD", or null
 * if it isn't a real date. A hold "until 3 November" lasts all of 3 November.
 */
export function endOfDubaiDay(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  const utc = Date.UTC(year, month - 1, day, 23, 59, 59, 999);
  if (new Date(utc).getUTCDate() !== day) return null;
  return new Date(utc - DUBAI_OFFSET_MS);
}

/** "YYYY-MM-DD" of a moment's calendar date in Dubai, for a date input's value. */
export function dubaiDateInputValue(date: Date): string {
  return new Date(date.getTime() + DUBAI_OFFSET_MS).toISOString().slice(0, 10);
}

/** The date input value for `days` from now, in Dubai. */
export function dubaiDateInputValueInDays(days: number): string {
  return dubaiDateInputValue(new Date(Date.now() + days * 24 * 60 * 60 * 1000));
}
