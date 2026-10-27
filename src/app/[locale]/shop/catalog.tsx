import { getLocale, getTranslations } from "next-intl/server";

import { CatalogControls, type FilterGroup } from "@/components/catalog-controls";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/ui/layout";
import { Price } from "@/components/ui/price";
import { ProductCard } from "@/components/ui/product-card";
import { Heading, Label, Lead } from "@/components/ui/text";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import { getPathname, Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { isolateLtr } from "@/lib/bidi";
import { getCatalog } from "@/lib/catalog";
import {
  applyCatalogQuery,
  catalogFacets,
  catalogSearchParams,
  isFiltered,
  offersGuitarFilters,
  parseCatalogQuery,
  priceStepsAed,
  queryParams,
  withoutGuitarFilters,
  type SearchParams,
} from "@/lib/catalog/filters";
import { localized } from "@/lib/localized";
import { FILS_PER_AED, formatMoney } from "@/lib/money";
import { statusKey } from "@/lib/product-status";
import type { PublicProduct } from "@/lib/public-dto";
import { shopWhatsAppUrl } from "@/lib/whatsapp/shop-link";

// The parts of /shop and /shop/[category] shared by both: the page heading with the
// category links (static), and the filtered results (rendered per request, since they
// depend on the URL's query).

type Props = {
  /** Null for the whole shop. */
  category: { slug: string; name: string } | null;
};

const shopHref = (slug: string | null) => (slug ? `/shop/${slug}` : "/shop");

export async function ShopHeader({ category }: Props) {
  const locale = await getLocale();
  const [t, { categories, products }] = await Promise.all([getTranslations("Shop"), getCatalog()]);
  // A category with nothing listed (footswitches before launch) stays out of the menu,
  // though its page still works.
  const listed = new Set(products.map((p) => p.category.slug));
  const links = [
    { slug: null, name: t("all") },
    ...categories
      .filter((c) => listed.has(c.slug) || c.slug === category?.slug)
      .map((c) => ({ slug: c.slug, name: locale === "ar" ? c.nameAr : c.nameEn })),
  ];

  return (
    <Container className="pt-10 md:pt-16">
      {category && (
        <Label as="p" className="mb-4 text-grey-600">
          <Link
            href="/shop"
            className="underline decoration-blue underline-offset-4 hover:decoration-black"
          >
            {t("title")}
          </Link>
        </Label>
      )}
      <Heading level="headline" as="h1">
        {category?.name ?? t("title")}
      </Heading>
      <Lead wide className="mt-6 text-grey-600">
        {t("intro")}
      </Lead>
      <nav
        aria-label={t("categoriesLabel")}
        className="-mx-5 mt-10 overflow-x-auto border-b border-black px-5 md:mx-0 md:px-0"
      >
        <ul className="flex gap-x-6 whitespace-nowrap">
          {links.map((link) => {
            const current = link.slug === (category?.slug ?? null);
            return (
              <li key={link.slug ?? "all"}>
                <Link
                  href={shopHref(link.slug)}
                  aria-current={current ? "page" : undefined}
                  className="-mb-px inline-flex min-h-12 items-center border-b-4 border-transparent font-medium hover:border-grey-300 aria-[current=page]:border-blue aria-[current=page]:font-bold"
                >
                  {link.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </Container>
  );
}

/** What shows while the results stream in: the frame, with no numbers in it. */
export async function CatalogFallback() {
  const t = await getTranslations("Shop");
  return (
    <Container className="pt-8 pb-20 md:pb-section" aria-busy="true">
      <p className="sr-only">{t("loading")}</p>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-12 md:ms-[15rem] md:grid-cols-3 md:gap-x-6 md:ps-12 lg:ms-[16rem]">
        {Array.from({ length: 6 }, (_, i) => (
          <li key={i} aria-hidden="true" className="aspect-[4/5] bg-grey-100" />
        ))}
      </ul>
    </Container>
  );
}

const priceOption = (aed: number, locale: Locale) => ({
  value: String(aed),
  label: formatMoney(aed * FILS_PER_AED, locale),
});

export async function CatalogResults({
  category,
  searchParams,
}: Props & { searchParams: Promise<SearchParams> }) {
  const locale = await getLocale();
  const [params, { products }, t, tFilters, tCondition, tBody, tPickups, askUrl] =
    await Promise.all([
      searchParams,
      getCatalog(),
      getTranslations("Shop"),
      getTranslations("Filters"),
      getTranslations("Condition"),
      getTranslations("BodyStyle"),
      getTranslations("PickupLayout"),
      shopWhatsAppUrl(locale, "stock"),
    ]);

  const inScope = category ? products.filter((p) => p.category.slug === category.slug) : products;
  const guitarFilters = offersGuitarFilters(inScope);
  const parsed = parseCatalogQuery(params);
  const query = guitarFilters ? parsed : withoutGuitarFilters(parsed);
  const results = applyCatalogQuery(inScope, query);
  const facets = catalogFacets(inScope);
  const queryKey = catalogSearchParams(query);
  queryKey.sort();

  // A group with a single option filters nothing, so it isn't offered.
  const groups: FilterGroup[] = !guitarFilters
    ? []
    : [
        {
          name: queryParams.brands,
          legend: tFilters("brand"),
          options: facets.brands.map((b) => ({ value: b, label: b, translate: false })),
          selected: facets.brands.filter((b) =>
            query.brands.some((q) => q.toLowerCase() === b.toLowerCase()),
          ),
        },
        {
          name: queryParams.bodyStyles,
          legend: tFilters("bodyStyle"),
          options: facets.bodyStyles.map((s) => ({ value: s, label: tBody(s) })),
          selected: query.bodyStyles,
        },
        {
          name: queryParams.pickupLayouts,
          legend: tFilters("pickupLayout"),
          options: facets.pickupLayouts.map((l) => ({
            value: l,
            label: tPickups(l, { code: isolateLtr(l) }),
          })),
          selected: query.pickupLayouts,
        },
        {
          name: queryParams.conditions,
          legend: tFilters("condition"),
          options: facets.conditions.map((c) => ({ value: c, label: tCondition(c) })),
          selected: query.conditions,
        },
      ].filter((group) => group.options.length > 1);

  const aed = (fils: number | null) => (fils === null ? "" : String(fils / FILS_PER_AED));
  const steps = new Set<number>(priceStepsAed);
  for (const fils of [query.minFils, query.maxFils]) {
    if (fils !== null && fils % FILS_PER_AED === 0) steps.add(fils / FILS_PER_AED);
  }

  return (
    <Container className="pt-8 pb-20 md:pb-section">
      <CatalogControls
        action={getPathname({ href: shopHref(category?.slug ?? null), locale })}
        queryKey={queryKey.toString()}
        groups={groups}
        availableOnly={{
          name: queryParams.availableOnly,
          label: tFilters("availableOnly"),
          checked: query.availableOnly,
        }}
        price={{
          legend: tFilters("price"),
          min: {
            name: queryParams.minFils,
            label: tFilters("minPrice"),
            value: aed(query.minFils),
          },
          max: {
            name: queryParams.maxFils,
            label: tFilters("maxPrice"),
            value: aed(query.maxFils),
          },
          anyLabel: tFilters("anyPrice"),
          options: [...steps].sort((a, b) => a - b).map((step) => priceOption(step, locale)),
        }}
        sort={{
          name: queryParams.sort,
          label: tFilters("sort"),
          value: query.sort === "newest" ? "" : query.sort,
          options: (["newest", "price-asc", "price-desc"] as const).map((order) => ({
            value: order === "newest" ? "" : order,
            label: tFilters(`sortOrders.${order}`),
          })),
        }}
        labels={{
          heading: tFilters("heading"),
          toggle: tFilters("toggle"),
          apply: tFilters("apply"),
        }}
        resultCount={t("results", { count: results.length, n: String(results.length) })}
      >
        {results.length > 0 ? (
          <ul className="grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-3 md:gap-x-6">
            {results.map((product, i) => (
              <li key={product.slug}>
                <ShopCard product={product} locale={locale} eager={i < 2} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="max-w-[40ch] py-6">
            <p className="text-title font-extrabold font-stretch-semi-expanded rtl:leading-[1.4]">
              {isFiltered(query) ? t("empty") : t("emptyCategory")}
            </p>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3">
              {isFiltered(query) && (
                <Link href={shopHref(category?.slug ?? null)} className={textLink}>
                  {t("clearFilters")}
                </Link>
              )}
              <a
                href={askUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`gap-2 ${textLink}`}
              >
                <WhatsAppIcon className="size-5" />
                {t("askStock")}
              </a>
            </div>
          </div>
        )}
      </CatalogControls>
    </Container>
  );
}

const textLink =
  "inline-flex min-h-11 items-center font-bold underline decoration-blue decoration-2 underline-offset-[6px] hover:decoration-black";

/** A product in the shop grid: the price, or what replaced it, and a badge for its state. */
async function ShopCard({
  product,
  locale,
  eager,
}: {
  product: PublicProduct;
  locale: Locale;
  eager: boolean;
}) {
  const [t, tCondition] = await Promise.all([
    getTranslations("Product"),
    getTranslations("Condition"),
  ]);
  const status = statusKey(product);
  const sold = product.status === "sold";

  return (
    <ProductCard
      href={`/product/${product.slug}`}
      title={localized(locale, product.titleEn, product.titleAr)}
      locale={locale}
      photo={product.images[0]?.src}
      detail={
        product.variants.length > 1
          ? t("waysToBuy", {
              count: product.variants.length,
              n: String(product.variants.length),
            })
          : tCondition(product.condition ?? "new")
      }
      muted={sold}
      eager={eager}
      photoNote={product.placeholderPhotos && product.images.length > 0 && t("standIn")}
      price={
        sold ? (
          <Label className="text-grey-600">{t(`status.${status}`)}</Label>
        ) : product.variants.length > 1 ? (
          <span className="inline-flex flex-wrap items-baseline gap-x-2">
            <Label className="text-grey-600">{t("from")}</Label>
            <Price fils={product.priceFils} size="md" />
          </span>
        ) : (
          <Price fils={product.priceFils} compareAtFils={product.compareAtFils} size="md" />
        )
      }
      badge={
        sold ? (
          <Badge variant="solid">{t(`status.${status}`)}</Badge>
        ) : product.status === "reserved" ? (
          <Badge variant="outline" className="bg-white">
            {t("status.reserved")}
          </Badge>
        ) : product.compareAtFils !== null ? (
          <Badge>{t("priceDrop")}</Badge>
        ) : undefined
      }
    />
  );
}
