import type { ReactNode } from "react";

import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { Bdi, Ltr } from "@/components/bdi";
import { BundlePicker } from "@/components/bundle-picker";
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
import type { PublicAddon, PublicProduct } from "@/lib/public-dto";
import { pageMetadata } from "@/lib/seo";
import { formatWeightKg } from "@/lib/units";
import { productUrl, productWhatsAppLink, variantWhatsAppLinks } from "@/lib/whatsapp/product-link";

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

/** Brand, model and SKU for everything; the guitar specs only on guitars. */
async function Specs({ product, locale }: { product: PublicProduct; locale: Locale }) {
  const [t, tBody, tPickups] = await Promise.all([
    getTranslations("Product.specs"),
    getTranslations("BodyStyle"),
    getTranslations("PickupLayout"),
  ]);
  const specs = product.kind === "guitar" ? product.specs : {};
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
// The checks every device goes through before it ships ("tested by us").
const deviceChecks = ["power", "sockets", "controls", "firmware", "sound"] as const;

/** New devices and their accessories carry the local warranty; used gear has returns. */
const hasWarranty = (product: PublicProduct) =>
  product.kind === "device" || product.kind === "accessory";

export default async function ProductPage({ params }: PageProps<"/[locale]/product/[slug]">) {
  const [locale, product, { addons }] = await Promise.all([
    getLocale(),
    productFor(params),
    getCatalog(),
  ]);
  // Bundles of a device can take a tone add-on (the extra custom tone).
  const addon = product.kind === "device" ? (addons[0] ?? null) : null;
  const [t, tNav, tCondition, whatsapp, variantLinks] = await Promise.all([
    getTranslations("Product"),
    getTranslations("Nav"),
    getTranslations("Condition"),
    productWhatsAppLink(locale, product),
    variantWhatsAppLinks(locale, product, addon),
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
  const guitar = product.kind === "guitar";
  // The bundle picker replaces the order button while it can be ordered; otherwise the
  // one availability and the hold or "similar" question apply to every variant.
  const picking = product.variants.length > 0 && whatsapp.ask === "order";
  const inTheBox = localizedOptional(locale, product.inTheBoxEn, product.inTheBoxAr);
  // What a bundle adds, from its flags: a Signature Pack, tones built for the customer.
  const variantDetail = (variant: PublicProduct["variants"][number]) => {
    const parts = [
      variant.includesPack && t("bundle.pack", { tones: policyNumbers.packTones }),
      variant.customToneSlots > 0 &&
        t("bundle.custom", {
          slots: variant.customToneSlots,
          n: String(variant.customToneSlots),
        }),
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(" ") : t("bundle.alone");
  };
  const addonOption = (extra: PublicAddon) => {
    const name = localized(locale, extra.titleEn, extra.titleAr);
    const about = localizedOptional(locale, extra.descriptionEn, extra.descriptionAr);
    return {
      legend: t("bundle.addonLegend"),
      label: <span {...localizedAttrs(name, locale)}>{name.text}</span>,
      detail: about ? (
        <span {...localizedAttrs(about, locale)}>{about.text}</span>
      ) : (
        t("bundle.addonOnlyWithTones")
      ),
      price: <Price fils={extra.priceFils} prefix="+" />,
    };
  };

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
            variantNames: new Map(
              product.variants.map((v) => [v.id, localized(locale, v.nameEn, v.nameAr).text]),
            ),
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
          <div className="col-span-4 md:col-span-8">
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
            {product.placeholderPhotos && images.length > 0 && (
              <p className="mt-3 flex items-baseline gap-3 text-sm text-grey-600">
                <Badge variant="outline" className="shrink-0 whitespace-nowrap">
                  {t("standIn")}
                </Badge>
                {t("standInNote")}
              </p>
            )}
          </div>

          <div className="col-span-4 md:sticky md:top-6 md:col-span-4 md:self-start">
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
                <>
                  {product.variants.length > 1 && (
                    <Label as="p" className="mb-1 text-grey-600">
                      {t("from")}
                    </Label>
                  )}
                  <Price fils={product.priceFils} compareAtFils={product.compareAtFils} size="lg" />
                </>
              )}
            </div>

            {picking && (
              <div className="mt-8">
                <BundlePicker
                  legend={t("bundle.legend")}
                  cta={cta}
                  defaultId={(product.variants.find((v) => v.featured) ?? product.variants[0]).id}
                  variants={product.variants.map((variant) => {
                    const name = localized(locale, variant.nameEn, variant.nameAr);
                    const links = variantLinks.find((link) => link.id === variant.id)!;
                    return {
                      id: variant.id,
                      label: (
                        <>
                          <span {...localizedAttrs(name, locale)}>{name.text}</span>
                          {variant.featured && <Badge className="ms-2">{t("bundle.pick")}</Badge>}
                        </>
                      ),
                      detail: variantDetail(variant),
                      price: (
                        <Price fils={variant.priceFils} compareAtFils={variant.compareAtFils} />
                      ),
                      href: links.href,
                      withAddon: links.withAddon,
                    };
                  })}
                  addon={addon && addonOption(addon)}
                />
              </div>
            )}

            <dl className="mt-8 border-t border-black">
              {(guitar || product.condition !== null) && (
                <div className="flex flex-wrap items-baseline justify-between gap-x-6 border-b border-grey-300 py-3">
                  <dt className="text-grey-600">{t("condition")}</dt>
                  <dd className="text-end">
                    <span className="font-bold">{tCondition(product.condition ?? "new")}</span>{" "}
                    {guitar && (
                      <Link
                        href={{ pathname: "/faq", hash: "condition" }}
                        className={`ms-2 text-sm ${linkClass}`}
                      >
                        {t("conditionGuide")}
                      </Link>
                    )}
                  </dd>
                </div>
              )}
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

            {!picking && (
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
            )}
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

        {(hasWarranty(product) || inTheBox) && (
          <Grid className="mt-20 gap-y-10 md:mt-28">
            {inTheBox && (
              <RuledColumn className="col-span-4">
                <h2 className="text-title font-extrabold tracking-[-0.01em] font-stretch-semi-expanded rtl:leading-[1.4] rtl:tracking-normal">
                  {t("inTheBox")}
                </h2>
                <ul className="mt-3 max-w-[40ch]" {...localizedAttrs(inTheBox, locale)}>
                  {inTheBox.text
                    .split("\n")
                    .map((line) => line.trim())
                    .filter(Boolean)
                    .map((line) => (
                      <li key={line} className="border-b border-grey-300 py-2">
                        {line}
                      </li>
                    ))}
                </ul>
              </RuledColumn>
            )}
            {hasWarranty(product) && (
              <RuledColumn className="col-span-4">
                <h2 className="text-title font-extrabold tracking-[-0.01em] font-stretch-semi-expanded rtl:leading-[1.4] rtl:tracking-normal">
                  {t("warranty.title", values)}
                </h2>
                <p className="mt-3 max-w-[40ch] text-grey-600">
                  {t.rich("warranty.body", {
                    ...values,
                    link: (chunks) => (
                      <Link href="/policies/warranty" className={linkClass}>
                        {chunks}
                      </Link>
                    ),
                  })}
                </p>
              </RuledColumn>
            )}
            {product.kind === "device" && (
              <RuledColumn className="col-span-4">
                <h2 className="text-title font-extrabold tracking-[-0.01em] font-stretch-semi-expanded rtl:leading-[1.4] rtl:tracking-normal">
                  {t("tested.title")}
                </h2>
                <p className="mt-3 max-w-[40ch] text-grey-600">{t("tested.intro")}</p>
                <ol className="mt-4 max-w-[40ch]">
                  {deviceChecks.map((check, i) => (
                    <li key={check} className="flex gap-4 border-b border-grey-300 py-2">
                      <Label className="pt-1 tabular-nums">{`0${i + 1}`}</Label>
                      <span>{t(`tested.checks.${check}`)}</span>
                    </li>
                  ))}
                </ol>
              </RuledColumn>
            )}
          </Grid>
        )}

        <Grid className="mt-20 gap-y-16 md:mt-28">
          <div className="col-span-4 flex flex-col gap-12 md:col-span-8">
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
            className="col-span-4 md:col-span-4 md:col-start-9"
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
