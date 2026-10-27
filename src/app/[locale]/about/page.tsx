import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { PageHero } from "@/components/page-hero";
import { PhotoCredits } from "@/components/photo-credits";
import { Prose } from "@/components/prose";
import { Arrow, buttonClass } from "@/components/ui/button";
import { Container, RuledColumn, Section } from "@/components/ui/layout";
import { Heading } from "@/components/ui/text";
import { brand } from "@/config/brand";
import { policyNumbers } from "@/config/policies";
import { Link } from "@/i18n/navigation";
import { pageMetadata } from "@/lib/seo";

// Who we are and how we work: three players, gear we'd use ourselves, tones built for the
// music you play, care at our bench, and online first, with the workshop by appointment.

const sections = ["gear", "tones", "care", "online"] as const;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations("About");
  return pageMetadata(locale, "/about", {
    title: t("title"),
    description: t("description", { brand: brand.name[locale], location: brand.location[locale] }),
  });
}

export default async function AboutPage() {
  const locale = await getLocale();
  const [t, tPhoto] = await Promise.all([getTranslations("About"), getTranslations("Photos")]);
  const values = { brand: brand.name[locale], location: brand.location[locale], ...policyNumbers };

  return (
    <>
      <PageHero
        title={t("heading")}
        lead={t("intro", values)}
        photo="jam"
        photoAlt={tPhoto("jam")}
      />

      <Section className="pt-0 md:pt-0">
        {/* Two by two: each topic a column opening with a black rule. */}
        <div className="grid gap-x-6 gap-y-12 md:grid-cols-2 md:gap-y-16">
          {sections.map((key) => (
            <RuledColumn key={key}>
              <section aria-labelledby={`${key}-heading`}>
                <Heading level="title" as="h2" id={`${key}-heading`}>
                  {t(`sections.${key}.heading`)}
                </Heading>
                <Prose text={t(`sections.${key}.body`, values)} className="mt-4 text-lg" />
              </section>
            </RuledColumn>
          ))}
        </div>

        <div className="mt-16 flex flex-col gap-3 border-t border-black pt-12 sm:flex-row">
          <Link href="/shop" className={buttonClass("primary")}>
            {t("shopCta")}
            <Arrow />
          </Link>
          <Link href="/contact" className={buttonClass("secondary")}>
            {t("contactCta")}
            <Arrow />
          </Link>
        </div>
      </Section>

      <Container className="py-6">
        <PhotoCredits photos={["jam"]} tone="light" />
      </Container>
    </>
  );
}
