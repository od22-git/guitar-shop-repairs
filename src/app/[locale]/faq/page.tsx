import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getLocale, getTranslations } from "next-intl/server";

import { Container } from "@/components/ui/layout";
import { Heading, Label, Lead } from "@/components/ui/text";
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
  "inline-flex min-h-11 items-center font-medium underline decoration-blue decoration-2 underline-offset-4 hover:decoration-black";

/** A topic: its heading, then the content across the width. */
function Topic({ id, heading, children }: { id: string; heading: string; children: ReactNode }) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className="scroll-mt-6 border-t border-black py-12 md:py-16"
    >
      <Heading level="title" as="h2" id={`${id}-heading`}>
        {heading}
      </Heading>
      <div className="mt-6">{children}</div>
    </section>
  );
}

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
    <Container className="pt-10 pb-20 md:pt-16 md:pb-section">
      <Heading level="headline" as="h1">
        {t("title")}
      </Heading>
      <Lead wide className="mt-6 mb-12 text-grey-600 md:mb-20">
        {t("description")}
      </Lead>

      <Topic id="condition" heading={t("conditionHeading")}>
        <p className="max-w-[60ch] text-lg">{t("conditionIntro")}</p>
        <dl className="mt-8 border-t border-grey-300">
          {conditionFilters.map((grade) => (
            <div
              key={grade}
              className="grid gap-1 border-b border-grey-300 py-4 sm:grid-cols-[9rem_1fr] sm:gap-6"
            >
              <dt className="font-bold">{tCondition(grade)}</dt>
              <dd className="max-w-[60ch] text-grey-600">{t(`grades.${grade}`)}</dd>
            </div>
          ))}
        </dl>
      </Topic>

      {text.keys("groups").map((group) => (
        <Topic key={group} id={group} heading={text(`groups.${group}.heading`)}>
          {/* Two columns of questions on wide screens. */}
          <div className="grid border-t border-grey-300 md:grid-cols-2 md:gap-x-6">
            {text.keys(`groups.${group}.questions`).map((key) => (
              <div key={key} className="border-b border-grey-300 py-6">
                <h3 className="text-lg font-bold">{text(`groups.${group}.questions.${key}.q`)}</h3>
                <p className="mt-2 max-w-[60ch] text-grey-600">
                  {text(`groups.${group}.questions.${key}.a`, values)}
                </p>
              </div>
            ))}
          </div>
        </Topic>
      ))}

      <nav aria-labelledby="policies-heading" className="border-t border-black pt-8">
        <Label as="h2" id="policies-heading" className="text-grey-600">
          {t("policiesHeading")}
        </Label>
        <ul className="mt-3 flex flex-wrap gap-x-8">
          {policies.map((policy) => (
            <li key={policy}>
              <Link href={`/policies/${policy}`} className={linkClass}>
                {tPolicies(`${policy}.title`)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </Container>
  );
}
