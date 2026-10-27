import type { ReactNode } from "react";

import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { Bdi } from "@/components/bdi";
import { IntroRow, WidePhoto } from "@/components/page-hero";
import { PhotoCredits } from "@/components/photo-credits";
import { StockPhoto } from "@/components/stock-photo";
import { Badge } from "@/components/ui/badge";
import { Arrow, buttonClass } from "@/components/ui/button";
import { Container, Grid, PriceList, PriceRow, RuledColumn, Section } from "@/components/ui/layout";
import { Price } from "@/components/ui/price";
import { Eyebrow, Heading, Highlight, Label, Lead, withHighlight } from "@/components/ui/text";
import { brand } from "@/config/brand";
import { FillPhoto } from "@/components/fill-photo";
import { NANOCORE_SLUG } from "@/config/nanocore";
import { policyNumbers } from "@/config/policies";
import { repairServices } from "@/config/repair-services";
import { Link } from "@/i18n/navigation";
import { getCatalog } from "@/lib/catalog";
import { localized, localizedAttrs } from "@/lib/localized";
import { formatMoney } from "@/lib/money";
import { pageAlternates } from "@/lib/seo";
import { shopWhatsAppUrl } from "@/lib/whatsapp/shop-link";

// The home page: the tagline, what we do (gear, tones, care), the NANOCORE, why buy here
// rather than from Amazon, the care prices, and who it's for. Built from the approved
// mockup (docs/design/m9a/mockups/), with photos stacked under their text across the full
// width rather than beside it (owner decision, M9b), so no column is left empty.

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
  const [t, tRepairs, tPhoto, nanocoreUrl, { products, addons }] = await Promise.all([
    getTranslations("Home"),
    getTranslations("Repairs"),
    getTranslations("Photos"),
    shopWhatsAppUrl(locale, "nanocore"),
    getCatalog(),
  ]);
  // The NANOCORE's bundles, as listed in the shop. If it isn't listed (archived, or not
  // seeded yet), the section just asks on WhatsApp.
  const nanocore = products.find((p) => p.slug === NANOCORE_SLUG && p.variants.length > 0) ?? null;
  const [extraTone] = addons;
  // Its own photo once the owners have shot it; stand-ins stay on the product page.
  const nanocorePhoto = nanocore && !nanocore.placeholderPhotos ? nanocore.images[0] : undefined;
  const hl = (chunks: ReactNode) => <Highlight>{chunks}</Highlight>;
  const services = careServices.map((key) => repairServices.find((s) => s.key === key)!);

  return (
    <>
      <Section className="pt-10 md:pt-16">
        <Heading level="display" as="h1">
          {withHighlight(brand.tagline[locale], brand.taglineHighlight[locale])}
        </Heading>
        <IntroRow
          lead={t("intro", { location: brand.location[locale] })}
          actions={
            <>
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
            </>
          }
        />
        <WidePhoto photo="bend" alt={tPhoto("bend")} eager />
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
          <div className="col-span-4 md:col-span-6">
            <Label as="p" className="text-grey-600">
              {t("nanocore.label")}
            </Label>
            <Heading level="headline" as="h2" id="nanocore-heading" className="mt-4">
              <span translate="no">NANOCORE</span>
            </Heading>
            <Lead wide className="mt-6 text-grey-600">
              {t("nanocore.body", { count: nanocore?.variants.length ?? 3 })}
            </Lead>
          </div>
          <div className="col-span-4 md:col-span-6">
            {nanocore && (
              <PriceList>
                {nanocore.variants.map((variant) => {
                  const name = localized(locale, variant.nameEn, variant.nameAr);
                  return (
                    <PriceRow
                      key={variant.id}
                      name={
                        <>
                          <span {...localizedAttrs(name, locale)}>{name.text}</span>
                          {variant.featured && <Badge className="ms-2">{t("nanocore.pick")}</Badge>}
                        </>
                      }
                      price={<Price fils={variant.priceFils} />}
                    />
                  );
                })}
                {extraTone && (
                  <PriceRow
                    name={
                      <span className="text-grey-600">
                        {t("nanocore.extraTone", {
                          addon: localized(locale, extraTone.titleEn, extraTone.titleAr).text,
                        })}
                      </span>
                    }
                    price={<Price fils={extraTone.priceFils} prefix="+" />}
                  />
                )}
              </PriceList>
            )}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
              {nanocore && (
                <Label as="p" className="text-grey-600">
                  {t("nanocore.note")}
                </Label>
              )}
              {nanocore ? (
                <Link href={`/product/${nanocore.slug}`} className={buttonClass("primary")}>
                  {t("nanocore.cta")}
                  <Arrow />
                </Link>
              ) : (
                <a
                  href={nanocoreUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonClass("primary")}
                >
                  {t("nanocore.ask")}
                  <Arrow />
                </a>
              )}
            </div>
          </div>
        </Grid>
        {nanocorePhoto ? (
          <div className="relative mt-10 aspect-[4/3] bg-grey-100 md:mt-12 md:aspect-[3/1]">
            <FillPhoto
              src={nanocorePhoto.src}
              alt={localized(locale, nanocorePhoto.altEn ?? "NANOCORE", nanocorePhoto.altAr).text}
              sizes="(min-width: 1600px) 1504px, 100vw"
            />
          </div>
        ) : (
          <div className="mt-10 flex aspect-[4/3] items-center justify-center bg-grey-100 p-6 md:mt-12 md:aspect-[3/1]">
            <Label as="p" className="text-center text-grey-600">
              {t("nanocore.photo")}
            </Label>
          </div>
        )}
      </Section>

      <Section aria-labelledby="why-heading" className="pt-0 md:pt-0">
        <Heading level="headline" as="h2" id="why-heading">
          {t.rich("why.heading", { hl, brand: brand.name[locale] })}
        </Heading>
        <Grid className="mt-12 gap-y-10 md:mt-16">
          {reasons.map((key, i) => (
            <RuledColumn key={key} className="col-span-4 sm:col-span-2 md:col-span-3">
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
          <div className="col-span-4 md:col-span-6">
            <Label as="p" className="text-grey-600">
              {t("care.label")}
            </Label>
            <Heading level="headline" as="h2" id="care-heading" className="mt-4">
              {t("care.heading")}
            </Heading>
          </div>
          <div className="col-span-4 md:col-span-6">
            <PriceList>
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
            <div className="mt-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
              <Label as="p" className="text-grey-600">
                {t("care.note")}
              </Label>
              <Link href="/repairs#book" className={buttonClass("secondary")}>
                {t("careCta")}
                <Arrow />
              </Link>
            </div>
          </div>
        </Grid>
        <WidePhoto photo="workbench" alt={tPhoto("workbench")} />
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
