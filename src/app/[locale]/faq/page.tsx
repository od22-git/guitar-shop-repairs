import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { brand } from "@/config/brand";
import { conditionFilters } from "@/lib/catalog/filters";
import { pageMetadata } from "@/lib/seo";

// The condition guide that product pages link to (#condition), and the ordering basics.
// More questions, and the final copy, come with the content pages in M8.

const questions = ["order", "hold", "delivery", "payment"] as const;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations("Faq");
  return pageMetadata(locale, "/faq", { title: t("title"), description: t("description") });
}

export default async function FaqPage() {
  const locale = await getLocale();
  const [t, tCondition] = await Promise.all([getTranslations("Faq"), getTranslations("Condition")]);

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 pb-20 sm:px-6 md:pt-10">
      <h1 className="text-4xl leading-tight font-extrabold tracking-tight text-balance sm:text-5xl rtl:leading-[1.3] rtl:tracking-normal">
        {t("title")}
      </h1>

      <section id="condition" aria-labelledby="condition-heading" className="mt-10 scroll-mt-6">
        <h2 id="condition-heading" className="text-2xl font-extrabold text-gold">
          {t("conditionHeading")}
        </h2>
        <p className="mt-3 max-w-[65ch] text-lg text-ink-subtle">{t("conditionIntro")}</p>
        <dl className="mt-6 border-t border-mist/15">
          {conditionFilters.map((grade) => (
            <div
              key={grade}
              className="grid gap-1 border-b border-mist/15 py-4 sm:grid-cols-[9rem_1fr] sm:gap-6"
            >
              <dt className="font-bold">{tCondition(grade)}</dt>
              <dd className="max-w-[60ch]">{t(`grades.${grade}`)}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="ordering-heading" className="mt-14">
        <h2 id="ordering-heading" className="text-2xl font-extrabold text-gold">
          {t("questionsHeading")}
        </h2>
        {questions.map((key) => (
          <div key={key} className="mt-6">
            <h3 className="text-lg font-bold">{t(`questions.${key}.q`)}</h3>
            <p className="mt-2 max-w-[65ch] text-ink-subtle">
              {t(`questions.${key}.a`, { location: brand.location[locale] })}
            </p>
          </div>
        ))}
      </section>
    </div>
  );
}
