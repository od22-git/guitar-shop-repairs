import { getLocale, getTranslations } from "next-intl/server";

import { CatalogControls, type FilterGroup } from "@/components/catalog-controls";
import { ProductCard } from "@/components/product-card";
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
  parseCatalogQuery,
  priceStepsAed,
  queryParams,
  type SearchParams,
} from "@/lib/catalog/filters";
import { FILS_PER_AED, formatMoney } from "@/lib/money";
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
  const [t, { categories }] = await Promise.all([getTranslations("Shop"), getCatalog()]);
  const links = [
    { slug: null, name: t("all") },
    ...categories.map((c) => ({ slug: c.slug, name: locale === "ar" ? c.nameAr : c.nameEn })),
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 md:pt-10">
      <h1 className="text-4xl leading-tight font-extrabold tracking-tight text-balance sm:text-5xl rtl:leading-[1.3] rtl:tracking-normal">
        {category?.name ?? t("title")}
      </h1>
      <p className="mt-3 max-w-[60ch] text-lg text-ink-subtle">{t("intro")}</p>
      <nav
        aria-label={t("categoriesLabel")}
        className="-mx-4 mt-6 overflow-x-auto px-4 sm:mx-0 sm:px-0"
      >
        <ul className="flex gap-1 whitespace-nowrap">
          {links.map((link) => {
            const current = link.slug === (category?.slug ?? null);
            return (
              <li key={link.slug ?? "all"}>
                <Link
                  href={shopHref(link.slug)}
                  aria-current={current ? "page" : undefined}
                  className={`inline-flex min-h-11 items-center rounded-sm px-3 font-medium underline-offset-[6px] hover:text-gold aria-[current=page]:font-bold aria-[current=page]:text-gold aria-[current=page]:underline aria-[current=page]:decoration-2 ${link.slug === null ? "ps-0" : ""}`}
                >
                  {link.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

/** What shows while the results stream in: the frame, with no numbers in it. */
export async function CatalogFallback() {
  const t = await getTranslations("Shop");
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6" aria-busy="true">
      <p className="sr-only">{t("loading")}</p>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-10 md:ms-[15rem] md:grid-cols-3 md:ps-10 lg:ms-[17rem]">
        {Array.from({ length: 6 }, (_, i) => (
          <li key={i} aria-hidden="true" className="aspect-[4/5] rounded-sm bg-rosewood/60" />
        ))}
      </ul>
    </div>
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
  const query = parseCatalogQuery(params);
  const results = applyCatalogQuery(inScope, query);
  const facets = catalogFacets(inScope);
  const queryKey = catalogSearchParams(query);
  queryKey.sort();

  // A group with a single option filters nothing, so it isn't offered.
  const groups: FilterGroup[] = [
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
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
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
          <ul className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-6">
            {results.map((product, i) => (
              <li key={product.slug}>
                <ProductCard product={product} eager={i < 2} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="max-w-[40ch] py-6">
            <p className="text-lg font-semibold">
              {isFiltered(query) ? t("empty") : t("emptyCategory")}
            </p>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3">
              {isFiltered(query) && (
                <Link
                  href={shopHref(category?.slug ?? null)}
                  className="inline-flex min-h-11 items-center font-semibold underline decoration-gold decoration-2 underline-offset-4 hover:text-gold"
                >
                  {t("clearFilters")}
                </Link>
              )}
              <a
                href={askUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-2 font-semibold underline decoration-gold decoration-2 underline-offset-4 hover:text-gold"
              >
                <WhatsAppIcon className="size-5" />
                {t("askStock")}
              </a>
            </div>
          </div>
        )}
      </CatalogControls>
    </div>
  );
}
