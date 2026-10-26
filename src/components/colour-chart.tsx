import { getLocale, getTranslations } from "next-intl/server";

import { finishes } from "@/config/finishes";

import { Ltr } from "./bdi";

/** The 1960s-style custom colour chart card: one chip per finish in the palette. */
export async function ColourChart() {
  const [t, tFinish, tFinishEn, locale] = await Promise.all([
    getTranslations("Home"),
    getTranslations("Finishes"),
    getTranslations({ locale: "en", namespace: "Finishes" }),
    getLocale(),
  ]);

  return (
    <figure className="rounded-sm bg-paper p-5 shadow-[0_1px_0_var(--color-ink),0_12px_32px_-16px_var(--color-ink)] sm:p-7">
      <figcaption className="mb-5 border-b-2 border-ink pb-3 text-xl font-extrabold">
        {t("chartTitle")}
      </figcaption>
      <ul className="grid grid-cols-3 gap-x-3 gap-y-5 sm:gap-x-4">
        {finishes.map((finish) => (
          <li key={finish.key}>
            <div
              className={`aspect-[4/3] rounded-[2px] ring-1 ring-ink/20 ring-inset ${finish.swatch}`}
            />
            <p className="mt-2 text-sm leading-tight font-semibold" translate="no">
              {tFinish(finish.key)}
            </p>
            {/* The original English names, as printed on the period charts. */}
            {locale !== "en" && (
              <p className="mt-0.5 text-xs text-ink-muted" lang="en" translate="no">
                <Ltr>{tFinishEn(finish.key)}</Ltr>
              </p>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-6 text-sm text-ink-muted">{t("chartNote")}</p>
    </figure>
  );
}
