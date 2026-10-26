import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { formCard } from "@/components/form-parts";
import { PhotoCredits } from "@/components/photo-credits";
import { StockPhoto } from "@/components/stock-photo";
import { productCondition } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { MAX_SELL_PHOTOS } from "@/lib/inbox/sell-photos";
import { pageMetadata } from "@/lib/seo";

import { SellForm, type SellLabels } from "./sell-form";

// Sell us your guitar: how buying works, and the form (details, photos, serial and a
// proof-of-ownership tick), which lands in the admin inbox with its photos kept private.
// The final copy comes in M8.

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

const sectionHeadingClass =
  "text-3xl leading-tight font-extrabold text-balance sm:text-4xl rtl:leading-[1.3]";

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
      <section aria-labelledby="sell-title" className="md:grid md:grid-cols-2">
        <div className="relative aspect-[3/2] md:order-last md:aspect-auto md:min-h-[26rem]">
          <StockPhoto
            photo="guitars"
            alt={tPhoto("guitars")}
            sizes="(min-width: 768px) 50vw, 100vw"
            eager
          />
        </div>
        <div className="px-4 py-10 sm:px-6 md:self-center md:px-12 md:py-16 lg:px-16">
          <div className="max-w-[32rem]">
            <h1
              id="sell-title"
              className="text-4xl leading-tight font-extrabold tracking-tight text-balance sm:text-5xl rtl:leading-[1.3] rtl:tracking-normal"
            >
              {t("title")}
            </h1>
            <p className="mt-4 text-lg text-ink-subtle">{t("intro")}</p>
            <a
              href="#offer"
              className="mt-8 inline-flex min-h-12 items-center rounded-sm bg-fiesta px-5 font-semibold text-white hover:bg-fiesta-deep"
            >
              {t("cta")}
            </a>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <section aria-labelledby="how-heading" className="py-14 md:py-20">
          <h2 id="how-heading" className={sectionHeadingClass}>
            {t("howHeading")}
          </h2>
          <ol className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <li key={step}>
                <p aria-hidden="true" className="text-4xl font-extrabold text-gold tabular-nums">
                  {index + 1}
                </p>
                <h3 className="mt-2 text-xl font-bold">{t(`steps.${step}.title`)}</h3>
                <p className="mt-2 text-ink-subtle">{t(`steps.${step}.body`)}</p>
              </li>
            ))}
          </ol>
          <div className="mt-12 rounded-sm bg-rosewood p-6">
            <h3 className="text-xl font-bold text-gold">{t("ownershipHeading")}</h3>
            <p className="mt-2 max-w-[70ch]">{t("ownershipBody")}</p>
          </div>
        </section>

        <section
          id="offer"
          aria-labelledby="offer-heading"
          className="scroll-mt-6 border-t border-mist/15 py-14 md:grid md:grid-cols-[1fr_1.4fr] md:gap-12 md:py-20"
        >
          <div>
            <h2 id="offer-heading" className={sectionHeadingClass}>
              {t("formHeading")}
            </h2>
            <p className="mt-3 max-w-[45ch] text-lg text-ink-subtle">{t("formIntro")}</p>
          </div>
          <div className={`mt-8 md:mt-0 ${formCard}`}>
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
        </section>

        <div className="py-6">
          <PhotoCredits photos={["guitars"]} />
        </div>
      </div>
    </>
  );
}
