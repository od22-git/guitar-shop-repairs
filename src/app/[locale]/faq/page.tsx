import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { brand } from "@/config/brand";
import { policies, policyNumbers } from "@/config/policies";
import { Link } from "@/i18n/navigation";
import { getContentText } from "@/lib/content-text";
import { conditionFilters } from "@/lib/catalog/filters";
import { pageMetadata } from "@/lib/seo";

// The condition guide that product pages link to (#condition), then questions by topic.
// The groups and questions are those in messages/*.json ("Faq.groups"), in order. Answers
// quote the numbers in src/config/policies.ts, so they match the policies.

const linkClass =
  "inline-flex min-h-11 items-center underline decoration-gold underline-offset-4 hover:text-gold";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations("Faq");
  return pageMetadata(locale, "/faq", { title: t("title"), description: t("description") });
}

export default async function FaqPage() {
  const locale = await getLocale();
  const [t, text, tCondition, tPolicies] = await Promise.all([
    getTranslations("Faq"),
    getContentText("Faq"),
    getTranslations("Condition"),
    getTranslations("Policies"),
  ]);
  const values = { location: brand.location[locale], ...policyNumbers };

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

      {text.keys("groups").map((group) => (
        <section
          key={group}
          id={group}
          aria-labelledby={`${group}-heading`}
          className="mt-14 scroll-mt-6"
        >
          <h2 id={`${group}-heading`} className="text-2xl font-extrabold text-gold">
            {text(`groups.${group}.heading`)}
          </h2>
          {text.keys(`groups.${group}.questions`).map((key) => (
            <div key={key} className="mt-6">
              <h3 className="text-lg font-bold">{text(`groups.${group}.questions.${key}.q`)}</h3>
              <p className="mt-2 max-w-[65ch] text-ink-subtle">
                {text(`groups.${group}.questions.${key}.a`, values)}
              </p>
            </div>
          ))}
        </section>
      ))}

      <nav aria-labelledby="policies-heading" className="mt-14 border-t border-mist/15 pt-6">
        <h2 id="policies-heading" className="font-bold">
          {t("policiesHeading")}
        </h2>
        <ul className="mt-2 flex flex-wrap gap-x-6">
          {policies.map((policy) => (
            <li key={policy}>
              <Link href={`/policies/${policy}`} className={linkClass}>
                {tPolicies(`${policy}.title`)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
