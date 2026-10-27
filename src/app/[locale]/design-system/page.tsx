import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getLocale, getTranslations } from "next-intl/server";

import { PhotoCredits } from "@/components/photo-credits";
import { StockPhoto } from "@/components/stock-photo";
import { Badge } from "@/components/ui/badge";
import { Arrow, buttonClass } from "@/components/ui/button";
import {
  Checkbox,
  Field,
  fieldProps,
  inputClass,
  OptionCard,
  selectClass,
} from "@/components/ui/field";
import { Grid, PriceList, PriceRow, RuledColumn, Section } from "@/components/ui/layout";
import { Price } from "@/components/ui/price";
import { ProductCard } from "@/components/ui/product-card";
import { Eyebrow, Heading, Highlight, Label, Lead } from "@/components/ui/text";
import { Wordmark } from "@/components/wordmark";
import type { StockPhotoKey } from "@/config/stock-photos";
import { Link } from "@/i18n/navigation";
import { localized } from "@/lib/localized";

// The design system (M9a) on one page: every token and core component, in both languages,
// so they can be reviewed, screenshotted and checked with axe. Not linked from the site and
// not in the sitemap.

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("DesignSystem");
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

// Literal class names, so Tailwind generates them.
const swatches = [
  ["black", "bg-black"],
  ["white", "bg-white"],
  ["blue", "bg-blue"],
  ["grey-100", "bg-grey-100"],
  ["grey-300", "bg-grey-300"],
  ["grey-400", "bg-grey-400"],
  ["grey-600", "bg-grey-600"],
  ["grey-800", "bg-grey-800"],
  ["red", "bg-red"],
] as const;

const levels = ["display", "headline", "title", "lead", "body", "label"] as const;

const cards = [
  { key: "strat", photo: "/images/samples/strat-sunburst", fils: 420_000, compareAt: 465_000 },
  { key: "knobs", photo: "/images/samples/knobs", fils: 3_500, badge: "outline" },
  { key: "cable", photo: "/images/samples/cable", fils: 6_000, sold: true },
  { key: "picks", photo: "/images/samples/picks", fils: 6_000, badge: "highlight" },
] as const;

const bundles = [
  ["device", 20_000],
  ["starter", 29_900],
  ["custom", 34_900],
] as const;

const indexColumns = ["gear", "tones", "care"] as const;
const services = [
  ["strings", 6_000],
  ["basic", 15_000],
  ["full", 25_000],
] as const;
const photos = [
  "bend",
  "player",
  "gig",
  "knobs",
  "workbench",
  "jam",
] as const satisfies readonly StockPhotoKey[];

function SectionIntro({
  number,
  heading,
  note,
}: {
  number: string;
  heading: string;
  note?: string;
}) {
  return (
    <div className="mb-12 md:mb-16">
      <Eyebrow number={number}>{heading}</Eyebrow>
      <Heading level="headline" as="h2" className="mt-4">
        {heading}
      </Heading>
      {note && <p className="mt-4 max-w-[60ch] text-grey-600">{note}</p>}
    </div>
  );
}

export default async function DesignSystemPage() {
  const locale = await getLocale();
  const [t, tPhoto] = await Promise.all([
    getTranslations("DesignSystem"),
    getTranslations("Photos"),
  ]);
  const highlight = (chunks: ReactNode) => <Highlight>{chunks}</Highlight>;

  return (
    <>
      <Section className="border-b border-black">
        <Eyebrow>{t("eyebrow")}</Eyebrow>
        <Heading level="display" as="h1" className="mt-6">
          {t.rich("title", { hl: highlight })}
        </Heading>
        <Lead className="mt-8 text-grey-600">{t("lead")}</Lead>
      </Section>

      <Section>
        <SectionIntro number="01" heading={t("wordmarkHeading")} note={t("wordmarkNote")} />
        <div className="grid gap-6 md:grid-cols-2">
          <div className="flex min-h-48 items-center justify-center bg-grey-100 p-6 sm:p-8">
            <Wordmark className="text-xl sm:text-5xl" />
          </div>
          <div className="flex min-h-48 items-center justify-center bg-black p-6 text-white sm:p-8">
            <Wordmark className="text-xl sm:text-5xl" />
          </div>
        </div>
      </Section>

      <Section>
        <SectionIntro number="02" heading={t("typeHeading")} note={t("typeNote")} />
        <ul className="border-t border-black">
          {levels.map((level) => (
            <li
              key={level}
              className="grid gap-3 border-b border-grey-300 py-8 md:grid-cols-12 md:gap-6"
            >
              <Label as="p" className="text-grey-600 md:col-span-3">
                {t(`levels.${level}`)}
              </Label>
              <div className="md:col-span-9">
                {level === "display" || level === "headline" || level === "title" ? (
                  <Heading level={level} as="p">
                    {t(`samples.${level}`)}
                  </Heading>
                ) : level === "lead" ? (
                  <Lead>{t("samples.lead")}</Lead>
                ) : level === "label" ? (
                  <Label as="p">{t("samples.label")}</Label>
                ) : (
                  <p className="max-w-[60ch] text-lg">{t("samples.body")}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section>
        <SectionIntro number="03" heading={t("colourHeading")} note={t("colourNote")} />
        <ul className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
          {swatches.map(([name, bg]) => (
            <li key={name}>
              <div className={`aspect-[4/3] ${bg} inset-ring-1 inset-ring-grey-300`} />
              <Label as="p" className="mt-3">
                {name}
              </Label>
              <p className="mt-1 text-sm text-grey-600">{t(`colours.${name}`)}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section>
        <SectionIntro number="04" heading={t("buttonsHeading")} />
        <div className="flex flex-wrap gap-3">
          <Link href="/shop" className={buttonClass("primary")}>
            {t("primary")}
            <Arrow />
          </Link>
          <Link href="/repairs" className={buttonClass("secondary")}>
            {t("secondary")}
            <Arrow />
          </Link>
        </div>
        <div className="mt-6 max-w-md">
          <Link href="/shop" className={buttonClass("primary", { block: true })}>
            {t("primary")}
            <Arrow />
          </Link>
        </div>
        <div className="mt-6 bg-black p-8">
          <Link href="/shop" className={buttonClass("inverse")}>
            {t("inverse")}
            <Arrow />
          </Link>
        </div>
      </Section>

      <Section>
        <SectionIntro number="05" heading={t("badgesHeading")} />
        <div className="flex flex-wrap items-center gap-4">
          <Badge variant="highlight">{t("badgeHighlight")}</Badge>
          <Badge variant="outline">{t("badgeOutline")}</Badge>
          <Badge variant="solid">{t("badgeSolid")}</Badge>
        </div>
        <div className="mt-10 flex flex-col gap-6">
          <Price fils={29_900} size="lg" />
          <Price fils={420_000} compareAtFils={465_000} size="md" />
          <Price fils={5_000} prefix="+" />
        </div>
      </Section>

      <Section>
        <SectionIntro number="06" heading={t("cardsHeading")} note={t("cardsNote")} />
        <ul className="grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-4 md:gap-x-6">
          {cards.map((card) => (
            <li key={card.key}>
              <ProductCard
                href="/shop"
                locale={locale}
                title={localized(locale, t(`cards.${card.key}.title`), null)}
                photo={card.photo}
                detail={t(`cards.${card.key}.detail`)}
                muted={"sold" in card}
                price={
                  "sold" in card ? (
                    <Label className="text-grey-600">{t("soldOut")}</Label>
                  ) : (
                    <Price
                      fils={card.fils}
                      compareAtFils={"compareAt" in card ? card.compareAt : null}
                      size="md"
                    />
                  )
                }
                badge={
                  "sold" in card ? (
                    <Badge variant="solid">{t("badgeSolid")}</Badge>
                  ) : "badge" in card ? (
                    card.badge === "highlight" ? (
                      <Badge variant="highlight">{t("badgeHighlight")}</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-white">
                        {t("badgeOutline")}
                      </Badge>
                    )
                  ) : undefined
                }
              />
            </li>
          ))}
        </ul>
      </Section>

      <Section>
        <SectionIntro number="07" heading={t("formsHeading")} />
        <Grid className="gap-y-12">
          <form className="col-span-4 flex flex-col gap-6 md:col-span-5" action="#">
            <Field label={t("nameLabel")} name="ds-name">
              <input
                type="text"
                autoComplete="name"
                className={inputClass}
                {...fieldProps("ds-name")}
              />
            </Field>
            <Field
              label={t("phoneLabel")}
              name="ds-phone"
              hint={t("phoneHint")}
              error={t("phoneError")}
            >
              <input
                type="tel"
                autoComplete="tel"
                dir="ltr"
                defaultValue="050 12"
                className={`${inputClass} text-start`}
                {...fieldProps("ds-phone", t("phoneError"), true)}
              />
            </Field>
            <Field label={t("emirateLabel")} name="ds-emirate">
              <select className={selectClass} {...fieldProps("ds-emirate")}>
                {(t.raw("emirates") as string[]).map((emirate) => (
                  <option key={emirate}>{emirate}</option>
                ))}
              </select>
            </Field>
            <Checkbox name="ds-consent" label={t("consent")} detail={t("consentDetail")} />
          </form>
          <fieldset className="col-span-4 md:col-span-6 md:col-start-7">
            <legend className="mb-4 font-bold">{t("bundleLegend")}</legend>
            <div className="flex flex-col gap-2">
              {bundles.map(([key, fils]) => (
                <OptionCard
                  key={key}
                  name="ds-bundle"
                  value={key}
                  defaultChecked={key === "starter"}
                  label={
                    <>
                      {t(`bundles.${key}.name`)}
                      {key === "starter" && <Badge className="ms-2">{t("badgeHighlight")}</Badge>}
                    </>
                  }
                  detail={t(`bundles.${key}.detail`)}
                  aside={<Price fils={fils} />}
                />
              ))}
            </div>
            <OptionCard
              type="checkbox"
              name="ds-addon"
              className="mt-4"
              label={t("addon")}
              detail={t("addonDetail")}
              aside={<Price fils={5_000} prefix="+" />}
            />
          </fieldset>
        </Grid>
      </Section>

      <Section>
        <SectionIntro number="08" heading={t("layoutsHeading")} note={t("layoutsNote")} />
        <Grid className="gap-y-10">
          {indexColumns.map((key, i) => (
            <RuledColumn key={key} className="col-span-4">
              <Eyebrow number={`0${i + 1}`}>{t(`index.${key}.name`)}</Eyebrow>
              <Heading level="title" as="h3" className="mt-8">
                {t(`index.${key}.title`)}
              </Heading>
              <p className="mt-3 text-grey-600">{t(`index.${key}.body`)}</p>
            </RuledColumn>
          ))}
        </Grid>
        <Grid className="mt-20 gap-y-10">
          <div className="relative col-span-4 aspect-[4/5] md:col-span-5">
            <StockPhoto
              photo="workbench"
              alt={tPhoto("workbench")}
              sizes="(min-width: 768px) 40vw, 100vw"
              className="grayscale"
            />
          </div>
          <div className="col-span-4 md:col-span-6 md:col-start-7">
            <Heading level="headline" as="h3" className="mb-10">
              {t("servicesHeading")}
            </Heading>
            <PriceList>
              {services.map(([key, fils]) => (
                <PriceRow key={key} name={t(`services.${key}`)} price={<Price fils={fils} />} />
              ))}
            </PriceList>
            <Label as="p" className="mt-4 text-grey-600">
              {t("samples.label")}
            </Label>
          </div>
        </Grid>
      </Section>

      <Section tone="dark">
        <Label as="p" className="text-grey-400">
          {t("statementLabel")}
        </Label>
        <Heading
          level="display"
          as="h2"
          className="mt-6 max-w-[15ch] text-[clamp(2.5rem,6vw,5.75rem)]"
        >
          {t("statement")}
        </Heading>
        <div className="relative mt-16 aspect-[4/3] md:aspect-[21/9]">
          <StockPhoto photo="player" alt={tPhoto("player")} sizes="100vw" className="grayscale" />
        </div>
      </Section>

      <Section>
        <SectionIntro number="09" heading={t("photosHeading")} note={t("photosNote")} />
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
          {photos.map((key) => (
            <li key={key} className={`relative ${key === "knobs" ? "row-span-2" : "aspect-[3/2]"}`}>
              <StockPhoto
                photo={key}
                alt={tPhoto(key)}
                sizes="(min-width: 768px) 30vw, 46vw"
                className={key === "gig" ? "" : "grayscale"}
              />
            </li>
          ))}
        </ul>
        <div className="mt-8">
          <PhotoCredits photos={photos} tone="light" />
        </div>
      </Section>
    </>
  );
}
