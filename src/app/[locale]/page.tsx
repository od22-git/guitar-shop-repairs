import type { ReactNode } from "react";

import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { Bdi } from "@/components/bdi";
import { PhotoCredits } from "@/components/photo-credits";
import { StockPhoto } from "@/components/stock-photo";
import { Badge } from "@/components/ui/badge";
import { Arrow, buttonClass } from "@/components/ui/button";
import { Container, Grid, PriceList, PriceRow, RuledColumn, Section } from "@/components/ui/layout";
import { Price } from "@/components/ui/price";
import { Eyebrow, Heading, Highlight, Label, Lead, withHighlight } from "@/components/ui/text";
import { brand } from "@/config/brand";
import { extraToneFils, nanocoreVariants } from "@/config/nanocore";
import { policyNumbers } from "@/config/policies";
import { repairServices } from "@/config/repair-services";
import { Link } from "@/i18n/navigation";
import { formatMoney } from "@/lib/money";
import { pageAlternates } from "@/lib/seo";
import { shopWhatsAppUrl } from "@/lib/whatsapp/shop-link";

// The home page, as in the approved mockup (docs/design/m9a/mockups/): the tagline, what
// we do (gear, tones, care), the NANOCORE, why buy here rather than from Amazon, the care
// prices, and who it's for.

const index = [
  { key: "gear", href: "/shop" },
  { key: "tones", href: "/faq#tones" },
  { key: "care", href: "/repairs" },
] as const;
const reasons = ["warranty", "tested", "tones", "people"] as const;
// The services the home page lists, cheapest first; /repairs has them all.
const careServices = ["strings", "electronics", "setup", "frets"] as const;
const photosOnPage = ["bend", "workbench", "player"] as const;

const textLink =
  "inline-flex min-h-11 items-center font-bold underline decoration-blue decoration-2 underline-offset-[6px] hover:decoration-black";

export async function generateMetadata(): Promise<Metadata> {
  return { alternates: pageAlternates(await getLocale(), "/") };
}

export default async function HomePage() {
  const locale = await getLocale();
  const [t, tRepairs, tPhoto, nanocoreUrl] = await Promise.all([
    getTranslations("Home"),
    getTranslations("Repairs"),
    getTranslations("Photos"),
    shopWhatsAppUrl(locale, "nanocore"),
  ]);
  const hl = (chunks: ReactNode) => <Highlight>{chunks}</Highlight>;
  const services = careServices.map((key) => repairServices.find((s) => s.key === key)!);

  return (
    <>
      <Section className="pt-10 md:pt-16">
        <Heading level="display" as="h1">
          {withHighlight(brand.tagline[locale], brand.taglineHighlight[locale])}
        </Heading>
        <Grid className="mt-10 gap-y-8 md:mt-16">
          <div className="relative col-span-4 aspect-[3/2] md:order-last md:col-span-8 md:col-start-5">
            <StockPhoto
              photo="bend"
              alt={tPhoto("bend")}
              sizes="(min-width: 1600px) 1000px, (min-width: 768px) 64vw, 100vw"
              className="grayscale"
              eager
            />
          </div>
          <div className="col-span-4 flex flex-col justify-end md:col-span-4">
            <Lead>{t("intro", { location: brand.location[locale] })}</Lead>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link href="/shop" className={`${buttonClass("primary", { block: true })} sm:w-auto`}>
                {t("shopCta")}
                <Arrow />
              </Link>
              <Link
                href="/repairs"
                className={`${buttonClass("secondary", { block: true })} sm:w-auto`}
              >
                {t("careCta")}
                <Arrow />
              </Link>
            </div>
          </div>
        </Grid>
        <Grid className="mt-16 gap-y-12 md:mt-24">
          {index.map(({ key, href }, i) => (
            <RuledColumn key={key} className="col-span-4">
              <Eyebrow number={`0${i + 1}`}>{t(`index.${key}.name`)}</Eyebrow>
              <Heading level="title" as="h2" className="mt-6 md:mt-8">
                {t(`index.${key}.title`)}
              </Heading>
              <p className="mt-3 max-w-[40ch] text-grey-600">{t(`index.${key}.body`)}</p>
              <Link href={href} className={`mt-4 ${textLink}`}>
                {t(`index.${key}.link`)}
              </Link>
            </RuledColumn>
          ))}
        </Grid>
      </Section>

      <Section aria-labelledby="nanocore-heading" className="pt-0 md:pt-0">
        <Grid className="gap-y-10">
          <div className="col-span-4 flex aspect-[4/3] items-center justify-center bg-grey-100 p-6 md:col-span-8 md:aspect-[3/2]">
            <Label as="p" className="text-center text-grey-600">
              {t("nanocore.photo")}
            </Label>
          </div>
          <div className="col-span-4 md:col-span-4 md:col-start-9">
            <Label as="p" className="text-grey-600">
              {t("nanocore.label")}
            </Label>
            <Heading level="headline" as="h2" id="nanocore-heading" className="mt-4">
              <span translate="no">NANOCORE</span>
            </Heading>
            <p className="mt-4 max-w-[45ch] text-grey-600">{t("nanocore.body")}</p>
            <PriceList className="mt-8">
              {nanocoreVariants.map((variant) => (
                <PriceRow
                  key={variant.key}
                  name={
                    <>
                      {t(`nanocore.variants.${variant.key}`)}
                      {"pick" in variant && <Badge className="ms-2">{t("nanocore.pick")}</Badge>}
                    </>
                  }
                  price={<Price fils={variant.fils} />}
                />
              ))}
              <PriceRow
                name={<span className="text-grey-600">{t("nanocore.extraTone")}</span>}
                price={<Price fils={extraToneFils} prefix="+" />}
              />
            </PriceList>
            <Label as="p" className="mt-4 text-grey-600">
              {t("nanocore.note")}
            </Label>
            <a
              href={nanocoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`mt-8 ${buttonClass("primary")}`}
            >
              {t("nanocore.cta")}
              <Arrow />
            </a>
          </div>
        </Grid>
      </Section>

      <Section aria-labelledby="why-heading" className="pt-0 md:pt-0">
        <Grid className="gap-y-10 md:gap-y-16">
          {/* A headline a step smaller than the others: it shares the row with the reasons. */}
          <h2
            id="why-heading"
            className="col-span-4 mb-2 text-[clamp(2.25rem,3.4vw,3.25rem)] leading-[0.95] font-black tracking-[-0.02em] text-balance font-stretch-semi-expanded md:row-span-2 md:mb-0 rtl:leading-[1.3] rtl:tracking-normal"
          >
            {t.rich("why.heading", { hl, brand: brand.name[locale] })}
          </h2>
          {reasons.map((key, i) => (
            <RuledColumn
              key={key}
              className={`col-span-4 sm:col-span-2 md:col-span-4 ${i % 2 === 0 ? "md:col-start-5" : ""}`}
            >
              <Label as="p" className="tabular-nums">{`0${i + 1}`}</Label>
              <h3 className="mt-6 text-xl font-extrabold font-stretch-semi-expanded">
                {t(`why.${key}.title`)}
              </h3>
              <p className="mt-2 max-w-[40ch] text-grey-600">
                {t(`why.${key}.body`, policyNumbers)}
              </p>
            </RuledColumn>
          ))}
        </Grid>
      </Section>

      <Section aria-labelledby="care-heading" className="pt-0 md:pt-0">
        <Grid className="gap-y-10">
          <div className="relative col-span-4 aspect-[4/3] md:col-span-4 md:aspect-[4/5]">
            <StockPhoto
              photo="workbench"
              alt={tPhoto("workbench")}
              sizes="(min-width: 1600px) 480px, (min-width: 768px) 32vw, 100vw"
              className="grayscale"
            />
          </div>
          <div className="col-span-4 md:col-span-8 md:col-start-5">
            <Label as="p" className="text-grey-600">
              {t("care.label")}
            </Label>
            <Heading level="headline" as="h2" id="care-heading" className="mt-4">
              {t("care.heading")}
            </Heading>
            <PriceList className="mt-10 max-w-xl">
              {services.map((service) => (
                <PriceRow
                  key={service.key}
                  name={tRepairs(`services.${service.key}.name`)}
                  price={
                    <span className="font-extrabold whitespace-nowrap font-stretch-semi-expanded tabular-nums">
                      {tRepairs.rich("from", {
                        price: formatMoney(service.fromFils, locale),
                        bdi: (chunks) => <Bdi>{chunks}</Bdi>,
                      })}
                    </span>
                  }
                />
              ))}
            </PriceList>
            <Label as="p" className="mt-4 text-grey-600">
              {t("care.note")}
            </Label>
            <Link href="/repairs#book" className={`mt-8 ${buttonClass("secondary")}`}>
              {t("careCta")}
              <Arrow />
            </Link>
          </div>
        </Grid>
      </Section>

      <Section tone="dark" aria-labelledby="statement-heading">
        <Label as="p" className="text-grey-400">
          {t("statement.label")}
        </Label>
        <Heading
          level="display"
          as="h2"
          id="statement-heading"
          className="mt-6 max-w-[15ch] text-[clamp(2.5rem,6vw,5.75rem)]"
        >
          {t("statement.heading")}
        </Heading>
        <div className="relative mt-12 aspect-[4/3] md:mt-16 md:aspect-[21/9]">
          <StockPhoto
            photo="player"
            alt={tPhoto("player")}
            sizes="(min-width: 1600px) 1504px, 100vw"
            className="grayscale"
          />
        </div>
      </Section>

      <Container className="py-6">
        <PhotoCredits photos={photosOnPage} tone="light" />
      </Container>
    </>
  );
}
