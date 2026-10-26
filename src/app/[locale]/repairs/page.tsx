import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { Bdi } from "@/components/bdi";
import { formCard } from "@/components/form-parts";
import { PhotoCredits } from "@/components/photo-credits";
import { StockPhoto } from "@/components/stock-photo";
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

const sectionHeadingClass =
  "text-3xl leading-tight font-extrabold text-balance sm:text-4xl rtl:leading-[1.3]";

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
      <section aria-labelledby="repairs-title" className="md:grid md:grid-cols-2">
        <div className="relative aspect-[3/2] md:order-last md:aspect-auto md:min-h-[28rem]">
          <StockPhoto
            photo="bench"
            alt={tPhoto("bench")}
            sizes="(min-width: 768px) 50vw, 100vw"
            eager
          />
        </div>
        <div className="px-4 py-10 sm:px-6 md:self-center md:px-12 md:py-16 lg:px-16">
          <div className="max-w-[32rem]">
            <h1
              id="repairs-title"
              className="text-4xl leading-tight font-extrabold tracking-tight text-balance sm:text-5xl rtl:leading-[1.3] rtl:tracking-normal"
            >
              {t("title")}
            </h1>
            <p className="mt-4 text-lg text-ink-subtle">{t("intro", { location })}</p>
            <a
              href="#book"
              className="mt-8 inline-flex min-h-12 items-center rounded-sm bg-fiesta px-5 font-semibold text-white hover:bg-fiesta-deep"
            >
              {t("bookCta")}
            </a>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <section aria-labelledby="services-heading" className="py-14 md:py-20">
          <h2 id="services-heading" className={sectionHeadingClass}>
            {t("servicesHeading")}
          </h2>
          <p className="mt-3 max-w-[60ch] text-lg text-ink-subtle">{t("servicesNote")}</p>
          <ul className="mt-8 grid border-t border-mist/15 md:grid-cols-2 md:gap-x-12">
            {repairServices.map((service) => (
              <li
                key={service.key}
                className="flex items-baseline justify-between gap-4 border-b border-mist/15 py-4"
              >
                <div>
                  <p className="font-bold">{t(`services.${service.key}.name`)}</p>
                  <p className="mt-1 text-ink-subtle">{t(`services.${service.key}.detail`)}</p>
                </div>
                <p className="shrink-0 font-semibold text-gold">
                  {t.rich("from", {
                    price: formatMoney(service.fromFils, locale),
                    bdi: (chunks) => <Bdi>{chunks}</Bdi>,
                  })}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="how-heading" className="border-t border-mist/15 py-14 md:py-20">
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
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <div className="rounded-sm bg-rosewood p-6">
              <h3 className="text-xl font-bold text-gold">{t("dropOffHeading")}</h3>
              <p className="mt-2">{t("dropOffBody", { location })}</p>
            </div>
            <div className="rounded-sm bg-rosewood p-6">
              <h3 className="text-xl font-bold text-gold">{t("courierHeading")}</h3>
              <p className="mt-2">{t("courierBody")}</p>
            </div>
          </div>
        </section>

        <section
          id="book"
          aria-labelledby="book-heading"
          className="scroll-mt-6 border-t border-mist/15 py-14 md:grid md:grid-cols-[1fr_1.4fr] md:gap-12 md:py-20"
        >
          <div>
            <h2 id="book-heading" className={sectionHeadingClass}>
              {t("bookHeading")}
            </h2>
            <p className="mt-3 max-w-[45ch] text-lg text-ink-subtle">{t("bookIntro")}</p>
          </div>
          <div className={`mt-8 md:mt-0 ${formCard}`}>
            <BookingForm
              labels={labels}
              emirates={emirate.enumValues.map((value) => ({ value, label: tEmirate(value) }))}
              locale={locale}
              turnstileSiteKey={env.TURNSTILE_SITE_KEY}
            />
          </div>
        </section>

        <div className="py-6">
          <PhotoCredits photos={["bench"]} />
        </div>
      </div>
    </>
  );
}
