import { getLocale, getTranslations } from "next-intl/server";

import { brand } from "@/config/brand";
import { Link } from "@/i18n/navigation";

import { LocaleSwitch } from "./locale-switch";

// Navigation links are added by the milestones that build each page (shop in M3,
// repairs in M6, sell in M7, about/contact in M8), so none point at a 404.
export async function SiteHeader() {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("LocaleSwitch")]);

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
        <LocaleSwitch label={t("other")} />
      </div>
    </header>
  );
}
