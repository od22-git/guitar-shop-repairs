import { getLocale, getTranslations } from "next-intl/server";

import { brand } from "@/config/brand";
import { Link } from "@/i18n/navigation";

import { LocaleSwitch } from "./locale-switch";
import { SiteNav } from "./site-nav";

// Phones show Shop and Repairs; the rest are in the footer, which links every page.
export async function SiteHeader() {
  const [locale, t, tNav] = await Promise.all([
    getLocale(),
    getTranslations("LocaleSwitch"),
    getTranslations("Nav"),
  ]);

  return (
    <header className="relative z-10">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="inline-flex min-h-11 min-w-0 flex-col justify-center rounded-sm hover:text-gold"
        >
          <span className="text-lg leading-tight font-extrabold" translate="no">
            {brand.name[locale]}
          </span>
          <span className="text-sm leading-tight text-ink-subtle">{brand.location[locale]}</span>
        </Link>
        <div className="flex items-center gap-1 sm:gap-3">
          <SiteNav
            label={tNav("label")}
            links={[
              { href: "/shop", label: tNav("shop") },
              { href: "/repairs", label: tNav("repairs") },
              { href: "/sell", label: tNav("sell"), from: "sm" },
              { href: "/contact", label: tNav("contact"), from: "md" },
            ]}
          />
          <LocaleSwitch label={t("other")} />
        </div>
      </div>
    </header>
  );
}
