import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { PageHero, SectionIntro } from "@/components/page-hero";
import { PhotoCredits } from "@/components/photo-credits";
import { Steps } from "@/components/steps";
import { buttonClass } from "@/components/ui/button";
import { Container, Section } from "@/components/ui/layout";
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
        <SectionIntro id="how-heading" heading={t("howHeading")} />
        <Steps
          steps={steps.map((step) => ({
            title: t(`steps.${step}.title`),
            body: t(`steps.${step}.body`),
          }))}
        />
        <div className="mt-16 bg-grey-100 p-6 md:mt-20 md:p-8">
          <h3 className="text-title font-extrabold tracking-[-0.01em] font-stretch-semi-expanded rtl:leading-[1.4] rtl:tracking-normal">
            {t("ownershipHeading")}
          </h3>
          <p className="mt-3 max-w-[70ch]">{t("ownershipBody")}</p>
        </div>
      </Section>

      <Section
        id="offer"
        aria-labelledby="offer-heading"
        className="scroll-mt-6 border-t border-black"
      >
        <SectionIntro id="offer-heading" heading={t("formHeading")} note={t("formIntro")} />
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
      </Section>

      <Container className="py-6">
        <PhotoCredits photos={["knobs"]} tone="light" />
      </Container>
    </>
  );
}
