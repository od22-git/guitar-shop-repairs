import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { Bdi } from "@/components/bdi";
import { PageHero } from "@/components/page-hero";
import { PhotoCredits } from "@/components/photo-credits";
import { buttonClass } from "@/components/ui/button";
import { Container, Grid, PriceList, PriceRow, RuledColumn, Section } from "@/components/ui/layout";
import { Heading, Label } from "@/components/ui/text";
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
        <Grid className="gap-y-10">
          <div className="col-span-4 md:col-span-4">
            <Heading level="headline" as="h2" id="services-heading">
              {t("servicesHeading")}
            </Heading>
            <p className="mt-6 max-w-[40ch] text-grey-600">{t("servicesNote")}</p>
          </div>
          <PriceList className="col-span-4 md:col-span-8 md:col-start-5">
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
        </Grid>
      </Section>

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
                  {/* The list is numbered already; this is the visible number. */}
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
        <Grid className="mt-16 gap-y-6 md:mt-20">
          {(["dropOff", "courier"] as const).map((key, i) => (
            <div
              key={key}
              className={`col-span-4 bg-grey-100 p-6 md:p-8 ${i === 0 ? "md:col-start-5" : ""}`}
            >
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
        <Grid className="gap-y-10">
          <div className="col-span-4 md:col-span-4">
            <Heading level="headline" as="h2" id="book-heading">
              {t("bookHeading")}
            </Heading>
            <p className="mt-6 max-w-[40ch] text-lg text-grey-600">{t("bookIntro")}</p>
          </div>
          <div className="col-span-4 md:col-span-8 md:col-start-5">
            <BookingForm
              labels={labels}
              emirates={emirate.enumValues.map((value) => ({ value, label: tEmirate(value) }))}
              locale={locale}
              turnstileSiteKey={env.TURNSTILE_SITE_KEY}
            />
          </div>
        </Grid>
      </Section>

      <Container className="py-6">
        <PhotoCredits photos={["workbench"]} tone="light" />
      </Container>
    </>
  );
}
