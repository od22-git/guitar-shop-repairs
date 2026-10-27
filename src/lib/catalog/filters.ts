import type { ProductCondition } from "../db/schema";
import { FILS_PER_AED, parseAedToFils } from "../money";
import { bodyStyles, pickupLayouts, type BodyStyle, type PickupLayout } from "../product-specs";
import type { PublicProduct } from "../public-dto";

// Shop filters and sorting, read from and written to the URL so a filtered list can be
// shared and works without JavaScript. With fewer than 50 products, filtering happens in
// memory on the cached catalog.

/** "new" stands for new, ungraded gear (condition null). Best first. */
export const conditionFilters = [
  "new",
  "mint",
  "excellent",
  "very_good",
  "good",
  "fair",
] as const satisfies readonly (ProductCondition | "new")[];

export type ConditionFilter = (typeof conditionFilters)[number];

export const sortOrders = ["newest", "price-asc", "price-desc"] as const;
export type SortOrder = (typeof sortOrders)[number];

/** Price limits offered in the filter, in whole dirhams. */
export const priceStepsAed = [100, 250, 500, 1_000, 2_000, 3_000, 5_000, 10_000] as const;

export type CatalogQuery = {
  brands: string[];
  conditions: ConditionFilter[];
  pickupLayouts: PickupLayout[];
  bodyStyles: BodyStyle[];
  minFils: number | null;
  maxFils: number | null;
  /** Only items for sale now: no holds, nothing sold. */
  availableOnly: boolean;
  sort: SortOrder;
};

/** URL parameter names. Repeated parameters (`brand=a&brand=b`) mean "any of". */
export const queryParams = {
  brands: "brand",
  conditions: "condition",
  pickupLayouts: "pickups",
  bodyStyles: "body",
  minFils: "min",
  maxFils: "max",
  availableOnly: "available",
  sort: "sort",
} as const satisfies Record<keyof CatalogQuery, string>;

export type SearchParams = Record<string, string | string[] | undefined>;

const MAX_VALUES = 20;
const MAX_BRAND_LENGTH = 60;

function values(params: SearchParams, name: string): string[] {
  const raw = params[name];
  const list = raw === undefined ? [] : Array.isArray(raw) ? raw : [raw];
  return [...new Set(list.map((v) => v.trim()).filter(Boolean))].slice(0, MAX_VALUES);
}

function oneOf<T extends string>(allowed: readonly T[], list: string[]): T[] {
  return list.filter((v): v is T => (allowed as readonly string[]).includes(v));
}

/** Whole dirhams in the URL ("2000"); anything else is ignored. */
function priceParam(params: SearchParams, name: string): number | null {
  const [value] = values(params, name);
  if (!value || !/^[\d٠-٩۰-۹]+$/.test(value)) return null;
  const fils = parseAedToFils(value);
  return fils === null || fils === 0 ? null : fils;
}

/** Reads a query from URL search params. Unknown or malformed values are dropped. */
export function parseCatalogQuery(params: SearchParams): CatalogQuery {
  let minFils = priceParam(params, queryParams.minFils);
  let maxFils = priceParam(params, queryParams.maxFils);
  if (minFils !== null && maxFils !== null && minFils > maxFils) {
    [minFils, maxFils] = [maxFils, minFils];
  }
  const [sort] = oneOf(sortOrders, values(params, queryParams.sort));
  return {
    brands: values(params, queryParams.brands).filter((b) => b.length <= MAX_BRAND_LENGTH),
    conditions: oneOf(conditionFilters, values(params, queryParams.conditions)),
    pickupLayouts: oneOf(pickupLayouts, values(params, queryParams.pickupLayouts)),
    bodyStyles: oneOf(bodyStyles, values(params, queryParams.bodyStyles)),
    minFils,
    maxFils,
    availableOnly: values(params, queryParams.availableOnly).includes("1"),
    sort: sort ?? "newest",
  };
}

export const emptyQuery: CatalogQuery = parseCatalogQuery({});

/** The query as URL search params, leaving out defaults. */
export function catalogSearchParams(query: CatalogQuery): URLSearchParams {
  const params = new URLSearchParams();
  for (const brand of query.brands) params.append(queryParams.brands, brand);
  for (const condition of query.conditions) params.append(queryParams.conditions, condition);
  for (const layout of query.pickupLayouts) params.append(queryParams.pickupLayouts, layout);
  for (const style of query.bodyStyles) params.append(queryParams.bodyStyles, style);
  if (query.minFils !== null) params.set(queryParams.minFils, String(query.minFils / FILS_PER_AED));
  if (query.maxFils !== null) params.set(queryParams.maxFils, String(query.maxFils / FILS_PER_AED));
  if (query.availableOnly) params.set(queryParams.availableOnly, "1");
  if (query.sort !== "newest") params.set(queryParams.sort, query.sort);
  return params;
}

/**
 * Brand, condition, pickup and body filters are for guitars: they're offered only where
 * every item listed is a guitar (the Used guitars category), not on the whole shop or
 * the gear categories.
 */
export function offersGuitarFilters(products: readonly PublicProduct[]): boolean {
  return products.length > 0 && products.every((product) => product.kind === "guitar");
}

/** The query without the guitar filters, for lists that don't offer them. */
export function withoutGuitarFilters(query: CatalogQuery): CatalogQuery {
  return { ...query, brands: [], conditions: [], pickupLayouts: [], bodyStyles: [] };
}

/** True when any filter narrows the list (sorting alone doesn't). */
export function isFiltered(query: CatalogQuery): boolean {
  return (
    query.brands.length > 0 ||
    query.conditions.length > 0 ||
    query.pickupLayouts.length > 0 ||
    query.bodyStyles.length > 0 ||
    query.minFils !== null ||
    query.maxFils !== null ||
    query.availableOnly
  );
}

const brandKey = (brand: string) => brand.trim().toLowerCase();
const conditionOf = (product: PublicProduct): ConditionFilter => product.condition ?? "new";

function matches(product: PublicProduct, query: CatalogQuery, brands: Set<string>): boolean {
  if (brands.size > 0 && !(product.brand && brands.has(brandKey(product.brand)))) return false;
  if (query.conditions.length > 0 && !query.conditions.includes(conditionOf(product))) return false;
  if (query.pickupLayouts.length > 0) {
    const layout = product.specs.pickupLayout;
    if (!layout || !query.pickupLayouts.includes(layout)) return false;
  }
  if (query.bodyStyles.length > 0) {
    const style = product.specs.bodyStyle;
    if (!style || !query.bodyStyles.includes(style)) return false;
  }
  if (query.minFils !== null && product.priceFils < query.minFils) return false;
  if (query.maxFils !== null && product.priceFils > query.maxFils) return false;
  if (query.availableOnly && product.status !== "available") return false;
  return true;
}

const time = (date: Date | null) => date?.getTime() ?? 0;

function compare(sort: SortOrder) {
  return (a: PublicProduct, b: PublicProduct): number => {
    // Sold items go last, whatever the order, so what's for sale comes first.
    const soldA = a.status === "sold" ? 1 : 0;
    const soldB = b.status === "sold" ? 1 : 0;
    if (soldA !== soldB) return soldA - soldB;
    if (sort === "price-asc") return a.priceFils - b.priceFils;
    if (sort === "price-desc") return b.priceFils - a.priceFils;
    // Newest: most recently listed, or for sold items most recently sold.
    return soldA ? time(b.soldAt) - time(a.soldAt) : time(b.publishedAt) - time(a.publishedAt);
  };
}

/** The products that match, in the query's order. */
export function applyCatalogQuery(
  products: readonly PublicProduct[],
  query: CatalogQuery,
): PublicProduct[] {
  const brands = new Set(query.brands.map(brandKey));
  return products.filter((p) => matches(p, query, brands)).toSorted(compare(query.sort));
}

export type CatalogFacets = {
  /** As the owner wrote them, alphabetical, one per brand whatever its case. */
  brands: string[];
  conditions: ConditionFilter[];
  pickupLayouts: PickupLayout[];
  bodyStyles: BodyStyle[];
};

/**
 * The filter options worth offering for a list of products: only values that occur, in a
 * fixed order. Computed on the unfiltered list, so options don't vanish as they're picked.
 */
export function catalogFacets(products: readonly PublicProduct[]): CatalogFacets {
  const brands = new Map<string, string>();
  const conditions = new Set<ConditionFilter>();
  const layouts = new Set<PickupLayout>();
  const styles = new Set<BodyStyle>();
  for (const product of products) {
    if (product.brand && !brands.has(brandKey(product.brand))) {
      brands.set(brandKey(product.brand), product.brand.trim());
    }
    conditions.add(conditionOf(product));
    if (product.specs.pickupLayout) layouts.add(product.specs.pickupLayout);
    if (product.specs.bodyStyle) styles.add(product.specs.bodyStyle);
  }
  return {
    brands: [...brands.values()].sort((a, b) => a.localeCompare(b, "en")),
    conditions: conditionFilters.filter((c) => conditions.has(c)),
    pickupLayouts: pickupLayouts.filter((l) => layouts.has(l)),
    bodyStyles: bodyStyles.filter((s) => styles.has(s)),
  };
}
