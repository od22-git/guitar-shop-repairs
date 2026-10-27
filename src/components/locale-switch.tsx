"use client";

import { useLocale } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";

/**
 * Links to the same page in the other language. Slugs are shared between locales,
 * so only the prefix changes. next-intl's Link also updates the language cookie.
 */
export function LocaleSwitch({ label }: { label: string }) {
  const locale = useLocale();
  const pathname = usePathname();
  const other = locale === "en" ? "ar" : "en";

  return (
    <Link
      href={pathname}
      locale={other}
      lang={other}
      hrefLang={other}
      className="inline-flex min-h-11 items-center px-1 font-medium underline decoration-blue decoration-2 underline-offset-[6px] hover:decoration-black md:px-2"
    >
      {label}
    </Link>
  );
}
