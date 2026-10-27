import type { ReactNode } from "react";

import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { Bdi, Ltr } from "@/components/bdi";
import { ProductGallery } from "@/components/product-gallery";
import { Badge } from "@/components/ui/badge";
import { Arrow, buttonClass } from "@/components/ui/button";
import { Container, Grid, RuledColumn } from "@/components/ui/layout";
import { Price } from "@/components/ui/price";
import { Heading, Label } from "@/components/ui/text";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import { brand } from "@/config/brand";
import { policyNumbers } from "@/config/policies";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { isolateLtr } from "@/lib/bidi";
import { getCatalog, getProduct } from "@/lib/catalog";
import { env } from "@/lib/env";
import { localized, localizedAttrs, localizedOptional } from "@/lib/localized";
import { OG_IMAGE_SIZE } from "@/lib/product-images";
import { statusKey } from "@/lib/product-status";
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
      description?.text ??
        t("categoryDescription", {
          category,
          brand: brand.name[locale],
          location: brand.location[locale],
        }),
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
    <div className="flex items-baseline justify-between gap-6 border-b border-grey-300 py-3">
      <dt className="shrink-0 text-grey-600">{label}</dt>
      <dd className="min-w-0 text-end font-medium">{children}</dd>
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
    <dl className="border-t border-black">
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
        <Ltr className="font-mono text-sm">{product.sku}</Ltr>
      </Spec>
    </dl>
  );
}

const linkClass =
  "underline decoration-blue decoration-2 underline-offset-4 hover:decoration-black";

// What every listing promises, under the photos. Not a sequence, so not numbered.
const promises = ["checked", "delivery", "returns"] as const;

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
  const sold = product.status === "sold";
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
  const values = { location: brand.location[locale], ...policyNumbers };

  return (
    <article>
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
      <Container className="pt-4 pb-20 md:pt-6 md:pb-section">
        <nav aria-label={t("breadcrumb")}>
          <Label as="div">
            <ol className="flex flex-wrap items-center gap-x-2 text-grey-600">
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
          </Label>
        </nav>

        <Grid className="mt-4 gap-y-10">
          <div className="col-span-4 md:col-span-7">
            {images.length > 0 ? (
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
            ) : (
              <div className="aspect-[4/5] bg-grey-100 md:aspect-square" />
            )}
          </div>

          <div className="col-span-4 md:sticky md:top-6 md:col-span-5 md:self-start lg:ps-6">
            {(sold || product.status === "reserved") && (
              <Badge variant={sold ? "solid" : "outline"} className="mb-5">
                {t(`status.${status}`)}
              </Badge>
            )}
            <h1
              className="text-[clamp(2rem,3.4vw,3.25rem)] leading-[1] font-black tracking-[-0.02em] text-balance font-stretch-semi-expanded rtl:leading-[1.35] rtl:tracking-normal"
              {...localizedAttrs(title, locale)}
            >
              {title.text}
            </h1>
            {englishOnly && <p className="mt-3 text-sm text-grey-600">{t("englishOnly")}</p>}

            <div className="mt-8">
              {sold ? (
                <p className="text-4xl font-black text-grey-600 font-stretch-semi-expanded sm:text-5xl">
                  {t(`status.${status}`)}
                </p>
              ) : (
                <Price fils={product.priceFils} compareAtFils={product.compareAtFils} size="lg" />
              )}
            </div>

            <dl className="mt-8 border-t border-black">
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 border-b border-grey-300 py-3">
                <dt className="text-grey-600">{t("condition")}</dt>
                <dd className="text-end">
                  <span className="font-bold">{tCondition(product.condition ?? "new")}</span>{" "}
                  <Link
                    href={{ pathname: "/faq", hash: "condition" }}
                    className={`ms-2 text-sm ${linkClass}`}
                  >
                    {t("conditionGuide")}
                  </Link>
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-x-6 border-b border-grey-300 py-3">
                <dt className="text-grey-600">{t("availability")}</dt>
                <dd className="flex items-center gap-2 font-bold">
                  <span
                    aria-hidden="true"
                    className={`size-2.5 ${product.status === "available" ? "bg-blue" : "inset-ring-2 inset-ring-grey-600"}`}
                  />
                  <span data-testid="stock-status">{t(`status.${status}`)}</span>
                </dd>
              </div>
            </dl>

            <a
              href={whatsapp.href}
              target="_blank"
              rel="noopener noreferrer"
              data-ask={whatsapp.ask}
              className={`mt-8 ${buttonClass(whatsapp.ask === "order" ? "primary" : "secondary", { block: true })}`}
            >
              <span className="inline-flex items-center gap-3">
                <WhatsAppIcon className="size-5" />
                {cta}
              </span>
              <Arrow />
            </a>
            <p className="mt-4 max-w-[48ch] text-sm text-grey-600">{note}</p>
          </div>
        </Grid>

        <Grid className="mt-20 gap-y-10 md:mt-28">
          {promises.map((key) => (
            <RuledColumn key={key} className="col-span-4">
              <h2 className="text-title font-extrabold tracking-[-0.01em] font-stretch-semi-expanded rtl:leading-[1.4] rtl:tracking-normal">
                {t(`promises.${key}.title`, values)}
              </h2>
              <p className="mt-3 max-w-[40ch] text-grey-600">
                {t.rich(`promises.${key}.body`, {
                  ...values,
                  link: (chunks) => (
                    <Link href="/policies/returns" className={linkClass}>
                      {chunks}
                    </Link>
                  ),
                })}
              </p>
            </RuledColumn>
          ))}
        </Grid>

        <Grid className="mt-20 gap-y-16 md:mt-28">
          <div className="col-span-4 flex flex-col gap-12 md:col-span-6">
            {description && (
              <section aria-labelledby="about-heading">
                <Heading level="title" as="h2" id="about-heading">
                  {t("description")}
                </Heading>
                <p
                  className="mt-4 max-w-[60ch] text-lg whitespace-pre-line"
                  {...localizedAttrs(description, locale)}
                >
                  {description.text}
                </p>
              </section>
            )}
            {techNotes && (
              <section aria-labelledby="bench-heading" className="bg-grey-100 p-6 md:p-8">
                <Label as="h2" id="bench-heading">
                  {t("techNotes")}
                </Label>
                <p
                  className="mt-4 max-w-[60ch] whitespace-pre-line"
                  {...localizedAttrs(techNotes, locale)}
                >
                  {techNotes.text}
                </p>
              </section>
            )}
          </div>
          <section
            aria-labelledby="details-heading"
            className="col-span-4 md:col-span-5 md:col-start-8"
          >
            <Heading level="title" as="h2" id="details-heading" className="mb-6">
              {t("details")}
            </Heading>
            <Specs product={product} locale={locale} />
          </section>
        </Grid>
      </Container>
    </article>
  );
}
