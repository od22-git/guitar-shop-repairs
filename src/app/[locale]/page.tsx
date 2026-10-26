import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { PhotoCredits } from "@/components/photo-credits";
import { StockPhoto } from "@/components/stock-photo";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import { brand } from "@/config/brand";
import { Link } from "@/i18n/navigation";
import { pageAlternates } from "@/lib/seo";
import { shopWhatsAppUrl } from "@/lib/whatsapp/shop-link";

// The home page shows what the shop sells and repairs; repairs lead to /repairs, where
// the booking form is. The final copy comes in M8.

// Each home category, with its shop category (slugs from src/lib/db/seed.ts).
const categories = {
  guitars: "electric-guitars",
  pedals: "pedals",
  amps: "amps",
  parts: "parts-accessories",
} as const;
const categoryKeys = Object.keys(categories) as (keyof typeof categories)[];
const services = ["setup", "frets", "electronics", "hardware"] as const;
const photosOnPage = ["hero", ...categoryKeys, "bench", "strings"] as const;

const buttonClass =
  "inline-flex min-h-12 items-center gap-2.5 rounded-sm bg-fiesta px-5 font-semibold text-white hover:bg-fiesta-deep";
const sectionHeadingClass =
  "text-3xl leading-tight font-extrabold text-balance sm:text-4xl rtl:leading-[1.3]";

export async function generateMetadata(): Promise<Metadata> {
  return { alternates: pageAlternates(await getLocale(), "/") };
}

export default async function HomePage() {
  const locale = await getLocale();
  const [t, tPhoto, tWhatsApp, whatsappUrl] = await Promise.all([
    getTranslations("Home"),
    getTranslations("Photos"),
    getTranslations("WhatsApp"),
    shopWhatsAppUrl(locale),
  ]);

  return (
    <>
      {/* The guitar runs off the inline-end edge on wide screens and leads on phones. */}
      <section className="relative overflow-hidden">
        <div className="relative aspect-[4/5] max-h-[72svh] w-full md:absolute md:inset-y-0 md:end-0 md:aspect-auto md:max-h-none md:w-[58%]">
          <StockPhoto
            photo="hero"
            alt={tPhoto("hero")}
            sizes="(min-width: 768px) 58vw, 100vw"
            eager
          />
          {/* Blend the photo's black into the page so no edge shows: below it on phones,
              on its inner side and under the header on wide screens. */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-linear-to-t from-ink to-transparent to-25% md:to-30% md:ltr:bg-linear-to-r md:rtl:bg-linear-to-l"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 hidden bg-linear-to-b from-ink to-transparent to-15% md:block"
          />
        </div>
        <div className="relative mx-auto -mt-10 max-w-6xl px-4 pb-16 sm:px-6 md:mt-0 md:flex md:min-h-[min(84svh,50rem)] md:items-center md:py-20">
          <div className="md:max-w-[29rem] lg:max-w-[33rem]">
            <h1 className="text-5xl leading-[1.02] font-extrabold tracking-tight text-balance sm:text-6xl lg:text-7xl rtl:text-4xl rtl:leading-[1.3] rtl:tracking-normal sm:rtl:text-5xl lg:rtl:text-6xl">
              {brand.tagline[locale]}
            </h1>
            <p className="mt-6 max-w-[55ch] text-lg text-ink-subtle">
              {t("intro", { location: brand.location[locale] })}
            </p>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`mt-8 ${buttonClass}`}
            >
              <WhatsAppIcon className="size-5" />
              {tWhatsApp("cta")}
            </a>
          </div>
        </div>
      </section>

      <section aria-labelledby="shop-heading" className="bg-rosewood">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
          <h2 id="shop-heading" className={sectionHeadingClass}>
            {t("shopHeading")}
          </h2>
          <p className="mt-3 max-w-[55ch] text-lg text-ink-subtle">{t("shopIntro")}</p>
          {/* Every other photo hangs lower, like guitars on a shop wall. */}
          <ul className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-6">
            {categoryKeys.map((key, i) => (
              <li key={key} className={i % 2 ? "mt-8 md:mt-14" : undefined}>
                <Link href={`/shop/${categories[key]}`} className="group block">
                  <div className="relative aspect-[3/4] overflow-hidden rounded-sm">
                    <StockPhoto
                      photo={key}
                      alt={tPhoto(key)}
                      sizes="(min-width: 1152px) 270px, (min-width: 768px) 23vw, 46vw"
                    />
                  </div>
                  <h3 className="mt-4 text-lg leading-snug font-bold text-gold underline-offset-4 group-hover:underline">
                    {t(`categories.${key}.name`)}
                  </h3>
                  <p className="mt-1 text-ink-subtle">{t(`categories.${key}.detail`)}</p>
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/shop" className={`mt-12 ${buttonClass}`}>
            {t("shopCta")}
          </Link>
        </div>
      </section>

      <section aria-labelledby="repairs-heading" className="md:grid md:grid-cols-2">
        <div className="relative aspect-[3/2] md:aspect-auto md:min-h-[34rem]">
          <StockPhoto photo="bench" alt={tPhoto("bench")} sizes="(min-width: 768px) 50vw, 100vw" />
        </div>
        <div className="px-4 py-14 sm:px-6 md:self-center md:px-12 md:py-20 lg:px-16">
          <div className="max-w-[30rem]">
            <h2 id="repairs-heading" className={sectionHeadingClass}>
              {t("repairsHeading")}
            </h2>
            <p className="mt-3 text-lg text-ink-subtle">{t("repairsIntro")}</p>
            <ul className="mt-6 border-t border-mist/15">
              {services.map((key) => (
                <li key={key} className="border-b border-mist/15 py-3">
                  {t(`services.${key}`)}
                </li>
              ))}
            </ul>
            <Link href="/repairs" className={`mt-8 ${buttonClass}`}>
              {t("repairsCta")}
            </Link>
          </div>
        </div>
      </section>

      <section aria-labelledby="visit-heading" className="relative isolate">
        <div className="absolute inset-0 -z-10">
          <StockPhoto photo="strings" alt={tPhoto("strings")} sizes="100vw" />
        </div>
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-32">
          <div className="max-w-[28rem] rounded-sm bg-ink p-6 sm:p-8">
            <h2
              id="visit-heading"
              className="text-2xl leading-tight font-extrabold text-balance text-gold"
            >
              {t("visitHeading")}
            </h2>
            <p className="mt-3">{t("visitBody", { location: brand.location[locale] })}</p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <PhotoCredits photos={photosOnPage} />
      </div>
    </>
  );
}
