import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { PageHero } from "@/components/page-hero";
import { PhotoCredits } from "@/components/photo-credits";
import { Prose } from "@/components/prose";
import { Arrow, buttonClass } from "@/components/ui/button";
import { Container, Grid, Section } from "@/components/ui/layout";
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
        {sections.map((key) => (
          <section key={key} aria-labelledby={`${key}-heading`} className="border-t border-black">
            <Grid className="gap-y-6 py-12 md:py-16">
              <Heading
                level="title"
                as="h2"
                id={`${key}-heading`}
                className="col-span-4 md:col-span-4"
              >
                {t(`sections.${key}.heading`)}
              </Heading>
              <Prose
                text={t(`sections.${key}.body`, values)}
                className="col-span-4 text-lg md:col-span-7 md:col-start-6"
              />
            </Grid>
          </section>
        ))}

        <div className="flex flex-col gap-3 border-t border-black pt-12 sm:flex-row">
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
