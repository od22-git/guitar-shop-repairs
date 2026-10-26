import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { PhotoCredits } from "@/components/photo-credits";
import { Prose } from "@/components/prose";
import { StockPhoto } from "@/components/stock-photo";
import { brand } from "@/config/brand";
import { Link } from "@/i18n/navigation";
import { pageMetadata } from "@/lib/seo";

// Who the shop is and how it works: checked and honestly graded gear, repairs that
// start only after a quote, and a home workshop, so visits are by appointment.

const sections = ["shop", "repairs", "home"] as const;

const buttonClass =
  "inline-flex min-h-12 items-center rounded-sm bg-fiesta px-5 font-semibold text-white hover:bg-fiesta-deep";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations("About");
  return pageMetadata(locale, "/about", {
    title: t("title"),
    description: t("description", { location: brand.location[locale] }),
  });
}

export default async function AboutPage() {
  const locale = await getLocale();
  const [t, tPhoto] = await Promise.all([getTranslations("About"), getTranslations("Photos")]);
  const values = { brand: brand.name[locale], location: brand.location[locale] };

  return (
    <>
      <section aria-labelledby="about-title" className="md:grid md:grid-cols-2">
        <div className="relative aspect-[3/2] md:order-last md:aspect-auto md:min-h-[28rem]">
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
              id="about-title"
              className="text-4xl leading-tight font-extrabold tracking-tight text-balance sm:text-5xl rtl:leading-[1.3] rtl:tracking-normal"
            >
              {t("title")}
            </h1>
            <p className="mt-4 text-lg text-ink-subtle">{t("intro", values)}</p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {sections.map((key) => (
          <section
            key={key}
            aria-labelledby={`${key}-heading`}
            className="grid gap-4 border-t border-mist/15 py-12 first:border-t-0 md:grid-cols-[1fr_2fr] md:gap-12 md:py-16"
          >
            <h2
              id={`${key}-heading`}
              className="text-2xl leading-tight font-extrabold text-balance text-gold sm:text-3xl rtl:leading-[1.3]"
            >
              {t(`sections.${key}.heading`)}
            </h2>
            <Prose text={t(`sections.${key}.body`, values)} className="text-lg" />
          </section>
        ))}

        <div className="flex flex-wrap gap-4 border-t border-mist/15 py-12">
          <Link href="/shop" className={buttonClass}>
            {t("shopCta")}
          </Link>
          <Link
            href="/contact"
            className="inline-flex min-h-12 items-center rounded-sm border border-mist/40 px-5 font-semibold hover:border-gold hover:text-gold"
          >
            {t("contactCta")}
          </Link>
        </div>

        <div className="py-6">
          <PhotoCredits photos={["guitars"]} />
        </div>
      </div>
    </>
  );
}
