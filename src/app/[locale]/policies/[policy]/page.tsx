import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { Bdi } from "@/components/bdi";
import { Prose } from "@/components/prose";
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
    <div className="mx-auto max-w-3xl px-4 pt-6 pb-20 sm:px-6 md:pt-10">
      <h1 className="text-4xl leading-tight font-extrabold tracking-tight text-balance sm:text-5xl rtl:leading-[1.3] rtl:tracking-normal">
        {t("title")}
      </h1>
      <p className="mt-3 text-ink-subtle">
        {tPolicies("updated", { date: formatDate(policiesUpdated, locale) })}
      </p>
      <p className="mt-6 max-w-[65ch] text-lg text-ink-subtle">{t("intro", values)}</p>

      {sections.map((key) => (
        <section key={key} aria-labelledby={`${key}-heading`} className="mt-10">
          <h2 id={`${key}-heading`} className="text-2xl font-extrabold text-gold">
            {t(`sections.${key}.heading`, values)}
          </h2>
          <Prose text={t(`sections.${key}.body`, values)} className="mt-3" />
          {policy === "delivery" && key === "fees" && <DeliveryZones />}
        </section>
      ))}

      <nav aria-labelledby="other-policies" className="mt-14 border-t border-mist/15 pt-6">
        <h2 id="other-policies" className="font-bold">
          {tPolicies("others")}
        </h2>
        <ul className="mt-2 flex flex-wrap gap-x-6">
          {policies
            .filter((other) => other !== policy)
            .map((other) => (
              <li key={other}>
                <Link
                  href={`/policies/${other}`}
                  className="inline-flex min-h-11 items-center underline decoration-gold underline-offset-4 hover:text-gold"
                >
                  {tPolicies(`${other}.title`)}
                </Link>
              </li>
            ))}
        </ul>
      </nav>
    </div>
  );
}

async function DeliveryZones() {
  const locale = await getLocale();
  const [t, zones] = await Promise.all([getTranslations("Policies"), getDeliveryZones()]);
  if (zones.length === 0) return null;

  return (
    <table className="mt-6 w-full max-w-md border-t border-mist/15">
      <caption className="sr-only">{t("zonesCaption")}</caption>
      <thead>
        <tr className="border-b border-mist/15">
          <th scope="col" className="py-2 text-start font-bold">
            {t("zone")}
          </th>
          <th scope="col" className="py-2 text-end font-bold">
            {t("fee")}
          </th>
        </tr>
      </thead>
      <tbody>
        {zones.map((zone) => (
          <tr key={zone.nameEn} className="border-b border-mist/15">
            <td className="py-2">{locale === "ar" ? zone.nameAr : zone.nameEn}</td>
            <td className="py-2 text-end tabular-nums">
              <Bdi>{zone.feeFils === 0 ? t("free") : formatMoney(zone.feeFils, locale)}</Bdi>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
