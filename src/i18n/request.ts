import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";

import { TIME_ZONE } from "@/lib/datetime";

import { routing } from "./routing";

export default getRequestConfig(async ({ locale: explicit }) => {
  // Server Components read the [locale] root param, which keeps pages static.
  // Server Actions can't read root params, so they pass the locale explicitly.
  const requested = explicit ?? (await rootLocale());
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  return {
    locale,
    timeZone: TIME_ZONE,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
