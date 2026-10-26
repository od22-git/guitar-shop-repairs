import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { Bdi } from "@/components/bdi";
import { Prose } from "@/components/prose";
import { Container, Grid } from "@/components/ui/layout";
import { Heading, Label, Lead } from "@/components/ui/text";
import { brand } from "@/config/brand";
import { isPolicySlug, policies, policiesUpdated, policyNumbers } from "@/config/policies";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { getContentText } from "@/lib/content-text";
import { formatDate } from "@/lib/datetime";
import { formatMoney } from "@/lib/money";
import { pageMetadata } from "@/lib/seo";
import { getDeliveryZones } from "@/lib/settings";

// The shop's policies, one page each. The text is in messages/*.json ("Policies"): each
// section's body is long-form text for <Prose>. The delivery policy also lists the
// delivery zones and their fees from Settings, after its "fees" section.

// Fully static, like product pages: an unknown policy waits for the page rather than
// streaming, so it answers with a real 404.
export const ensureStatic = "navigation";

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => policies.map((policy) => ({ locale, policy })));
}

async function policyFromParams(params: Promise<{ policy: string }>) {
  const { policy } = await params;
  if (!isPolicySlug(policy)) notFound();
  return policy;
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/policies/[policy]">): Promise<Metadata> {
  const [locale, policy] = await Promise.all([getLocale(), policyFromParams(params)]);
  const t = await getTranslations("Policies");
  return pageMetadata(locale, `/policies/${policy}`, {
    title: t(`${policy}.title`),
    description: t(`${policy}.description`),
  });
}

export default async function PolicyPage({ params }: PageProps<"/[locale]/policies/[policy]">) {
  const [locale, policy] = await Promise.all([getLocale(), policyFromParams(params)]);
  const [text, tPolicies] = await Promise.all([
    getContentText("Policies"),
    getTranslations("Policies"),
  ]);
  const t = (key: string, values?: Record<string, string | number>) =>
    text(`${policy}.${key}`, values);
  const sections = text.keys(`${policy}.sections`);
  const values = {
    brand: brand.name[locale],
    location: brand.location[locale],
    ...policyNumbers,
  };

  return (
    <Container className="pt-10 pb-20 md:pt-16 md:pb-section">
      <Label as="p" className="text-grey-600">
        {tPolicies("updated", { date: formatDate(policiesUpdated, locale) })}
      </Label>
      <Heading level="headline" as="h1" className="mt-4">
        {t("title")}
      </Heading>
      <Lead wide className="mt-6 mb-12 text-grey-600 md:mb-20">
        {t("intro", values)}
      </Lead>

      {sections.map((key) => (
        <section
          key={key}
          aria-labelledby={`${key}-heading`}
          className="border-t border-black py-10 md:py-14"
        >
          <Grid className="gap-y-4">
            <Heading
              level="title"
              as="h2"
              id={`${key}-heading`}
              className="col-span-4 md:col-span-4"
            >
              {t(`sections.${key}.heading`, values)}
            </Heading>
            <div className="col-span-4 md:col-span-7 md:col-start-6">
              <Prose text={t(`sections.${key}.body`, values)} className="text-lg" />
              {policy === "delivery" && key === "fees" && <DeliveryZones />}
            </div>
          </Grid>
        </section>
      ))}

      <nav aria-labelledby="other-policies" className="border-t border-black pt-8">
        <Label as="h2" id="other-policies" className="text-grey-600">
          {tPolicies("others")}
        </Label>
        <ul className="mt-3 flex flex-wrap gap-x-8">
          {policies
            .filter((other) => other !== policy)
            .map((other) => (
              <li key={other}>
                <Link
                  href={`/policies/${other}`}
                  className="inline-flex min-h-11 items-center font-medium underline decoration-blue decoration-2 underline-offset-4 hover:decoration-black"
                >
                  {tPolicies(`${other}.title`)}
                </Link>
              </li>
            ))}
        </ul>
      </nav>
    </Container>
  );
}

async function DeliveryZones() {
  const locale = await getLocale();
  const [t, zones] = await Promise.all([getTranslations("Policies"), getDeliveryZones()]);
  if (zones.length === 0) return null;

  return (
    <table className="mt-8 w-full max-w-md border-t border-black">
      <caption className="sr-only">{t("zonesCaption")}</caption>
      <thead>
        <tr className="border-b border-grey-300">
          <th scope="col" className="py-3 text-start font-bold">
            {t("zone")}
          </th>
          <th scope="col" className="py-3 text-end font-bold">
            {t("fee")}
          </th>
        </tr>
      </thead>
      <tbody>
        {zones.map((zone) => (
          <tr key={zone.nameEn} className="border-b border-grey-300">
            <td className="py-3">{locale === "ar" ? zone.nameAr : zone.nameEn}</td>
            <td className="py-3 text-end font-bold tabular-nums">
              <Bdi>{zone.feeFils === 0 ? t("free") : formatMoney(zone.feeFils, locale)}</Bdi>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
