import type { Locale } from "@/i18n/routing";

import { intlLocale } from "./intl";

const weight = new Map<Locale, Intl.NumberFormat>();

/** "3.6 kg" / "3.6 كغ", with Western digits in Arabic and a no-break space before the unit. */
export function formatWeightKg(kg: number, locale: Locale): string {
  let format = weight.get(locale);
  if (!format) {
    format = new Intl.NumberFormat(intlLocale(locale), {
      style: "unit",
      unit: "kilogram",
      maximumFractionDigits: 1,
    });
    weight.set(locale, format);
  }
  return format.format(kg).replace(/ /g, "\u00a0");
}
