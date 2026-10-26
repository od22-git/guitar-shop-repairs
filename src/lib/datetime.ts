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
