import type { ReactNode } from "react";

import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { Bdi, Ltr } from "@/components/bdi";
import { PriceTag, statusKey } from "@/components/price-tag";
import { ProductGallery } from "@/components/product-gallery";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import { brand } from "@/config/brand";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { isolateLtr } from "@/lib/bidi";
import { getCatalog, getProduct } from "@/lib/catalog";
import { env } from "@/lib/env";
import { localized, localizedAttrs, localizedOptional } from "@/lib/localized";
import { OG_IMAGE_SIZE } from "@/lib/product-images";
import type { PublicProduct } from "@/lib/public-dto";
import { pageMetadata } from "@/lib/seo";
import { formatWeightKg } from "@/lib/units";
import { productUrl, productWhatsAppLink } from "@/lib/whatsapp/product-link";

import { productJsonLd } from "./json-ld";

// Product pages are fully static: built for every listed product, and for one listed
// later on its first visit. That first visit waits for the page instead of streaming a
// fallback, so a draft, archived or unknown slug answers with a real 404.
export const ensureStatic = "navigation";

export async function generateStaticParams() {
  const { products } = await getCatalog();
  // A static route needs one path to build. With nothing listed yet, this one 404s.
  if (products.length === 0) return [{ slug: "none-listed" }];
  return products.map((product) => ({ slug: product.slug }));
}

async function productFor(params: Promise<{ slug: string }>): Promise<PublicProduct> {
  const product = await getProduct((await params).slug);
  if (!product) notFound();
  return product;
}

/** About one search-result snippet: whole words, up to 160 characters. */
function snippet(text: string, max = 160): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  return `${flat.slice(0, flat.lastIndexOf(" ", max - 1))}…`;
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/product/[slug]">): Promise<Metadata> {
  const [locale, product] = await Promise.all([getLocale(), productFor(params)]);
  const t = await getTranslations("Shop");
  const title = localized(locale, product.titleEn, product.titleAr).text;
  const description = localizedOptional(locale, product.descriptionEn, product.descriptionAr);
  const [photo] = product.images;
  const category = locale === "ar" ? product.category.nameAr : product.category.nameEn;

  return pageMetadata(locale, `/product/${product.slug}`, {
    title,
    description: snippet(
      description?.text ?? t("categoryDescription", { category, location: brand.location[locale] }),
    ),
    images: photo && [
      {
        url: photo.ogSrc,
        ...OG_IMAGE_SIZE,
        alt: localized(locale, photo.altEn ?? title, photo.altAr).text,
      },
    ],
  });
}

function Spec({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(7rem,2fr)_3fr] gap-4 border-b border-mist/15 py-2.5">
      <dt className="text-ink-subtle">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

async function Specs({ product, locale }: { product: PublicProduct; locale: Locale }) {
  const [t, tBody, tPickups] = await Promise.all([
    getTranslations("Product.specs"),
    getTranslations("BodyStyle"),
    getTranslations("PickupLayout"),
  ]);
  const { specs } = product;
  // Values the owner typed (woods, finishes, models) show as written, isolated so Latin
  // text sits correctly in Arabic lines.
  const typed = (value: string | undefined, key: Parameters<typeof t>[0]) =>
    value && (
      <Spec label={t(key)}>
        <Bdi>{value}</Bdi>
      </Spec>
    );

  return (
    <dl>
      {product.brand && (
        <Spec label={t("brand")}>
          <Bdi translate="no">{product.brand}</Bdi>
        </Spec>
      )}
      {product.model && (
        <Spec label={t("model")}>
          <Bdi translate="no">{product.model}</Bdi>
        </Spec>
      )}
      {product.year !== null && <Spec label={t("year")}>{product.year}</Spec>}
      {specs.bodyStyle && <Spec label={t("bodyStyle")}>{tBody(specs.bodyStyle)}</Spec>}
      {typed(specs.body, "body")}
      {typed(specs.finish, "finish")}
      {typed(specs.neck, "neck")}
      {typed(specs.fretboard, "fretboard")}
      {specs.frets !== undefined && <Spec label={t("frets")}>{specs.frets}</Spec>}
      {typed(specs.scale, "scale")}
      {specs.pickupLayout && (
        <Spec label={t("pickupLayout")}>
          {tPickups(specs.pickupLayout, { code: isolateLtr(specs.pickupLayout) })}
        </Spec>
      )}
      {typed(specs.pickups, "pickups")}
      {specs.weightKg !== undefined && (
        <Spec label={t("weightKg")}>
          <Bdi>{formatWeightKg(specs.weightKg, locale)}</Bdi>
        </Spec>
      )}
      {typed(specs.case, "case")}
      {typed(specs.mods, "mods")}
      <Spec label={t("sku")}>
        <Ltr>{product.sku}</Ltr>
      </Spec>
    </dl>
  );
}

const linkClass = "underline decoration-gold decoration-2 underline-offset-4 hover:text-gold";

export default async function ProductPage({ params }: PageProps<"/[locale]/product/[slug]">) {
  const [locale, product] = await Promise.all([getLocale(), productFor(params)]);
  const [t, tNav, tCondition, whatsapp] = await Promise.all([
    getTranslations("Product"),
    getTranslations("Nav"),
    getTranslations("Condition"),
    productWhatsAppLink(locale, product),
  ]);

  const title = localized(locale, product.titleEn, product.titleAr);
  const description = localizedOptional(locale, product.descriptionEn, product.descriptionAr);
  const techNotes = localizedOptional(locale, product.techNotesEn, product.techNotesAr);
  const englishOnly = [title, description, techNotes].some((text) => text && text.lang !== locale);
  const category = locale === "ar" ? product.category.nameAr : product.category.nameEn;
  const status = statusKey(product);
  const note = {
    order: t("orderNote"),
    hold: t("holdNote"),
    similar: status === "soldOut" ? t("soldOutNote") : t("soldNote"),
  }[whatsapp.ask];
  const cta = { order: t("order"), hold: t("askHold"), similar: t("askSimilar") }[whatsapp.ask];
  const images = product.images.map((image) => ({
    src: image.src,
    alt: localized(locale, image.altEn ?? title.text, image.altAr).text,
  }));

  return (
    <article className="mx-auto max-w-6xl px-4 pt-4 pb-16 sm:px-6 md:pt-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: productJsonLd(product, {
            name: title.text,
            description: description?.text ?? null,
            url: productUrl(locale, product.slug),
            siteUrl: env.SITE_URL,
          }),
        }}
      />
      <nav aria-label={t("breadcrumb")}>
        <ol className="flex flex-wrap items-center gap-x-2 text-sm text-ink-subtle">
          <li>
            <Link href="/shop" className={`inline-flex min-h-11 items-center ${linkClass}`}>
              {tNav("shop")}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link
              href={`/shop/${product.category.slug}`}
              className={`inline-flex min-h-11 items-center ${linkClass}`}
            >
              {category}
            </Link>
          </li>
        </ol>
      </nav>

      <div className="mt-4 grid gap-8 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] md:gap-12">
        <div>
          {images.length > 0 && (
            <ProductGallery
              images={images}
              labels={{
                gallery: t("gallery.label"),
                previous: t("gallery.previous"),
                next: t("gallery.next"),
                positions: images.map((_, i) =>
                  t("gallery.position", { current: String(i + 1), total: String(images.length) }),
                ),
                show: images.map((_, i) => t("gallery.show", { n: String(i + 1) })),
              }}
            />
          )}
        </div>

        <div className="md:sticky md:top-6 md:self-start">
          <h1
            className="text-3xl leading-tight font-extrabold text-balance sm:text-4xl rtl:leading-[1.3]"
            {...localizedAttrs(title, locale)}
          >
            {title.text}
          </h1>
          {englishOnly && <p className="mt-2 text-sm text-ink-subtle">{t("englishOnly")}</p>}

          <PriceTag product={product} size="lg" className="mt-6" />

          <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
            <dt className="text-ink-subtle">{t("condition")}</dt>
            <dd>
              <span className="font-semibold">{tCondition(product.condition ?? "new")}</span>{" "}
              <Link
                href={{ pathname: "/faq", hash: "condition" }}
                className={`text-sm ${linkClass}`}
              >
                {t("conditionGuide")}
              </Link>
            </dd>
            <dt className="text-ink-subtle">{t("availability")}</dt>
            <dd className="font-semibold" data-testid="stock-status">
              {t(`status.${status}`)}
            </dd>
          </dl>

          <a
            href={whatsapp.href}
            target="_blank"
            rel="noopener noreferrer"
            data-ask={whatsapp.ask}
            className="mt-8 inline-flex min-h-12 items-center gap-2.5 rounded-sm bg-fiesta px-5 font-semibold text-white hover:bg-fiesta-deep"
          >
            <WhatsAppIcon className="size-5" />
            {cta}
          </a>
          <p className="mt-3 max-w-[45ch] text-sm text-ink-subtle">{note}</p>
          {whatsapp.ask === "order" && (
            <p className="mt-6 max-w-[45ch] border-t border-mist/15 pt-4 text-sm">
              {t("delivery", { location: brand.location[locale] })}
            </p>
          )}
        </div>
      </div>

      <div className="mt-14 grid gap-12 md:grid-cols-2">
        <div className="grid content-start gap-10">
          {description && (
            <section aria-labelledby="about-heading">
              <h2 id="about-heading" className="text-2xl font-extrabold text-gold">
                {t("description")}
              </h2>
              <p
                className="mt-3 max-w-[65ch] text-lg whitespace-pre-line"
                {...localizedAttrs(description, locale)}
              >
                {description.text}
              </p>
            </section>
          )}
          {techNotes && (
            <section aria-labelledby="bench-heading" className="rounded-sm bg-rosewood p-6">
              <h2 id="bench-heading" className="text-xl font-extrabold text-gold">
                {t("techNotes")}
              </h2>
              <p
                className="mt-3 max-w-[65ch] whitespace-pre-line"
                {...localizedAttrs(techNotes, locale)}
              >
                {techNotes.text}
              </p>
            </section>
          )}
        </div>
        <section aria-labelledby="details-heading">
          <h2 id="details-heading" className="text-2xl font-extrabold text-gold">
            {t("details")}
          </h2>
          <div className="mt-3">
            <Specs product={product} locale={locale} />
          </div>
        </section>
      </div>
    </article>
  );
}
