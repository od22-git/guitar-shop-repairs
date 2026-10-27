import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { PageHero } from "@/components/page-hero";
import { PhotoCredits } from "@/components/photo-credits";
import { buttonClass } from "@/components/ui/button";
import { Container, Grid, RuledColumn, Section } from "@/components/ui/layout";
import { Heading, Label } from "@/components/ui/text";
import { productCondition } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { MAX_SELL_PHOTOS } from "@/lib/inbox/sell-photos";
import { pageMetadata } from "@/lib/seo";

import { SellForm, type SellLabels } from "./sell-form";

// Sell us your guitar: how buying works, and the form (details, photos, serial and a
// proof-of-ownership tick), which lands in the admin inbox with its photos kept private.

const steps = ["send", "offer", "check", "paid"] as const;
const formLabels = [
  "name",
  "phone",
  "phoneHint",
  "guitarHeading",
  "brand",
  "model",
  "year",
  "serial",
  "serialHint",
  "condition",
  "chooseCondition",
  "conditionHint",
  "askingPrice",
  "askingPriceHint",
  "description",
  "descriptionHint",
  "optional",
  "photosHeading",
  "photosHint",
  "addPhotos",
  "removePhoto",
  "photoAlt",
  "uploading",
  "uploadingButton",
  "tooManyPhotos",
  "ownership",
  "consent",
  "honeypot",
  "submit",
  "sending",
  "fixErrors",
  "spam",
  "rateLimited",
  "photosExpired",
  "sentHeading",
  "sentBody",
] as const;
const errorCodes = [
  "required",
  "too_long",
  "phone",
  "consent",
  "ownership",
  "year",
  "amount",
  "photos",
] as const;
const photoProblems = [
  "unsupported_format",
  "not_an_image",
  "too_large",
  "rate_limited",
  "failed",
] as const;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations("Sell");
  return pageMetadata(locale, "/sell", {
    title: t("title"),
    description: t("description"),
  });
}

export default async function SellPage() {
  const locale = await getLocale();
  const [t, tForm, tCondition, tPhoto] = await Promise.all([
    getTranslations("Sell"),
    getTranslations("Sell.form"),
    getTranslations("Condition"),
    getTranslations("Photos"),
  ]);

  // Raw strings: the form fills in {n}, {total}, {max} and {file} itself.
  const labels = {
    ...Object.fromEntries(formLabels.map((key) => [key, tForm.raw(key) as string])),
    errors: Object.fromEntries(errorCodes.map((code) => [code, tForm(`errors.${code}`)])),
    photoProblems: Object.fromEntries(
      photoProblems.map((code) => [code, tForm.raw(`photoProblems.${code}`) as string]),
    ),
  } as SellLabels;

  return (
    <>
      <PageHero
        title={t("title")}
        lead={t("intro")}
        photo="knobs"
        photoAlt={tPhoto("knobs")}
        actions={
          <a href="#offer" className={buttonClass("primary")}>
            {t("cta")}
          </a>
        }
      />

      <Section aria-labelledby="how-heading" className="pt-0 md:pt-0">
        <Grid className="gap-y-12">
          <Heading level="headline" as="h2" id="how-heading" className="col-span-4">
            {t("howHeading")}
          </Heading>
          {/* Two by two on the grid's 5th and 9th columns, like the rest of the page. */}
          <ol className="col-span-4 grid grid-cols-4 gap-x-4 gap-y-12 md:col-span-8 md:col-start-5 md:grid-cols-8 md:gap-x-6">
            {steps.map((step, index) => (
              <li key={step} className="col-span-4 sm:col-span-2 md:col-span-4">
                <RuledColumn>
                  <Label as="p" aria-hidden="true" className="tabular-nums">
                    {`0${index + 1}`}
                  </Label>
                  <h3 className="mt-6 text-xl font-extrabold font-stretch-semi-expanded">
                    {t(`steps.${step}.title`)}
                  </h3>
                  <p className="mt-2 max-w-[40ch] text-grey-600">{t(`steps.${step}.body`)}</p>
                </RuledColumn>
              </li>
            ))}
          </ol>
        </Grid>
        <Grid className="mt-16 md:mt-20">
          <div className="col-span-4 bg-grey-100 p-6 md:col-span-8 md:col-start-5 md:p-8">
            <h3 className="text-title font-extrabold tracking-[-0.01em] font-stretch-semi-expanded rtl:leading-[1.4] rtl:tracking-normal">
              {t("ownershipHeading")}
            </h3>
            <p className="mt-3 max-w-[70ch]">{t("ownershipBody")}</p>
          </div>
        </Grid>
      </Section>

      <Section
        id="offer"
        aria-labelledby="offer-heading"
        className="scroll-mt-6 border-t border-black"
      >
        <Grid className="gap-y-10">
          <div className="col-span-4 md:col-span-4">
            <Heading level="headline" as="h2" id="offer-heading">
              {t("formHeading")}
            </Heading>
            <p className="mt-6 max-w-[40ch] text-lg text-grey-600">{t("formIntro")}</p>
          </div>
          <div className="col-span-4 md:col-span-8 md:col-start-5">
            <SellForm
              labels={labels}
              conditions={productCondition.enumValues.map((value) => ({
                value,
                label: tCondition(value),
              }))}
              maxPhotos={MAX_SELL_PHOTOS}
              locale={locale}
              turnstileSiteKey={env.TURNSTILE_SITE_KEY}
            />
          </div>
        </Grid>
      </Section>

      <Container className="py-6">
        <PhotoCredits photos={["knobs"]} tone="light" />
      </Container>
    </>
  );
}
