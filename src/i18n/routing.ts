import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "ar"],
  // Crawlers and browsers asking for any other language get English (also the x-default).
  defaultLocale: "en",
  localePrefix: "always",
  // Remember a chosen language for a year. The proxy only writes the cookie when the
  // choice differs from what the browser's Accept-Language would pick anyway.
  localeCookie: { maxAge: 60 * 60 * 24 * 365 },
});

export type Locale = (typeof routing.locales)[number];

export function localeDirection(locale: Locale): "ltr" | "rtl" {
  return locale === "ar" ? "rtl" : "ltr";
}
