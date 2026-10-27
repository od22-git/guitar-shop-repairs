import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { Bdi } from "@/components/bdi";
import { PageHero, SectionIntro } from "@/components/page-hero";
import { PhotoCredits } from "@/components/photo-credits";
import { Steps } from "@/components/steps";
import { buttonClass } from "@/components/ui/button";
import { Container, Grid, PriceList, PriceRow, Section } from "@/components/ui/layout";
import { brand } from "@/config/brand";
import { repairServices } from "@/config/repair-services";
import { emirate } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { formatMoney } from "@/lib/money";
import { pageMetadata } from "@/lib/seo";

import { BookingForm, type BookingLabels } from "./booking-form";

// Repairs: services and starting prices, how drop-off and courier pickup work, and the
// Book-a-repair form, which lands in the admin inbox.

const steps = ["book", "arrive", "quote", "track"] as const;
const formLabels = [
  "name",
  "phone",
  "phoneHint",
  "instrumentHeading",
  "instrumentBrand",
  "instrumentModel",
  "optional",
  "issue",
  "issueHint",
  "intakeMethod",
  "drop_off",
  "courier",
  "emirate",
  "chooseEmirate",
  "consent",
  "honeypot",
  "submit",
  "sending",
  "fixErrors",
  "spam",
  "rateLimited",
  "sentHeading",
  "sentBody",
] as const;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations("Repairs");
  return pageMetadata(locale, "/repairs", {
    title: t("title"),
    description: t("description", { location: brand.location[locale] }),
  });
}

export default async function RepairsPage() {
  const locale = await getLocale();
  const [t, tForm, tEmirate, tPhoto] = await Promise.all([
    getTranslations("Repairs"),
    getTranslations("Repairs.form"),
    getTranslations("Emirate"),
    getTranslations("Photos"),
  ]);
  const location = brand.location[locale];

  const labels = {
    ...Object.fromEntries(formLabels.map((key) => [key, tForm(key)])),
    errors: {
      required: tForm("errors.required"),
      too_long: tForm("errors.too_long"),
      phone: tForm("errors.phone"),
      consent: tForm("errors.consent"),
    },
  } as BookingLabels;

  return (
    <>
      <PageHero
        title={t("title")}
        lead={t("intro", { location })}
        photo="workbench"
        photoAlt={tPhoto("workbench")}
        actions={
          <a href="#book" className={buttonClass("primary")}>
            {t("bookCta")}
          </a>
        }
      />

      <Section aria-labelledby="services-heading" className="pt-0 md:pt-0">
        <SectionIntro
          id="services-heading"
          heading={t("servicesHeading")}
          note={t("servicesNote")}
        />
        {/* Two columns of services on wide screens, so the list fills the width. */}
        <PriceList className="md:grid md:grid-cols-2 md:gap-x-6">
          {repairServices.map((service) => (
            <PriceRow
              key={service.key}
              name={
                <>
                  <span className="block text-lg font-bold">
                    {t(`services.${service.key}.name`)}
                  </span>
                  <span className="mt-1 block max-w-[46ch] text-grey-600">
                    {t(`services.${service.key}.detail`)}
                  </span>
                </>
              }
              price={
                <span className="font-extrabold whitespace-nowrap font-stretch-semi-expanded tabular-nums">
                  {t.rich("from", {
                    price: formatMoney(service.fromFils, locale),
                    bdi: (chunks) => <Bdi>{chunks}</Bdi>,
                  })}
                </span>
              }
            />
          ))}
        </PriceList>
      </Section>

      <Section aria-labelledby="how-heading" className="pt-0 md:pt-0">
        <SectionIntro id="how-heading" heading={t("howHeading")} />
        <Steps
          steps={steps.map((step) => ({
            title: t(`steps.${step}.title`),
            body: t(`steps.${step}.body`),
          }))}
        />
        <Grid className="mt-16 gap-y-6 md:mt-20">
          {(["dropOff", "courier"] as const).map((key) => (
            <div key={key} className="col-span-4 bg-grey-100 p-6 md:col-span-6 md:p-8">
              <h3 className="text-title font-extrabold tracking-[-0.01em] font-stretch-semi-expanded rtl:leading-[1.4] rtl:tracking-normal">
                {t(`${key}Heading`)}
              </h3>
              <p className="mt-3 max-w-[50ch]">{t(`${key}Body`, { location })}</p>
            </div>
          ))}
        </Grid>
      </Section>

      <Section
        id="book"
        aria-labelledby="book-heading"
        className="scroll-mt-6 border-t border-black"
      >
        <SectionIntro id="book-heading" heading={t("bookHeading")} note={t("bookIntro")} />
        <BookingForm
          labels={labels}
          emirates={emirate.enumValues.map((value) => ({ value, label: tEmirate(value) }))}
          locale={locale}
          turnstileSiteKey={env.TURNSTILE_SITE_KEY}
        />
      </Section>

      <Container className="py-6">
        <PhotoCredits photos={["workbench"]} tone="light" />
      </Container>
    </>
  );
}
