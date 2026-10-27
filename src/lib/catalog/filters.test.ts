import { describe, expect, it } from "vitest";

import { publicProduct } from "@/test/catalog";

import {
  applyCatalogQuery,
  catalogFacets,
  catalogSearchParams,
  emptyQuery,
  isFiltered,
  offersGuitarFilters,
  parseCatalogQuery,
  withoutGuitarFilters,
  type CatalogQuery,
} from "./filters";

const day = (n: number) => new Date(Date.UTC(2026, 9, n));

const strat = publicProduct({
  slug: "strat",
  brand: "Fender",
  condition: "very_good",
  priceFils: 345_000,
  specs: { bodyStyle: "s_style", pickupLayout: "SSS" },
  publishedAt: day(24),
});
const lesPaul = publicProduct({
  slug: "les-paul",
  brand: "Gibson",
  condition: "excellent",
  priceFils: 980_000,
  specs: { bodyStyle: "single_cut", pickupLayout: "HH" },
  publishedAt: day(20),
});
const tele = publicProduct({
  slug: "tele",
  brand: "fender",
  condition: "excellent",
  priceFils: 270_000,
  status: "reserved",
  specs: { bodyStyle: "t_style", pickupLayout: "SS" },
  publishedAt: day(17),
});
const soldEarly = publicProduct({
  slug: "sold-early",
  brand: "Epiphone",
  priceFils: 165_000,
  status: "sold",
  publishedAt: day(6),
  soldAt: day(10),
});
const soldLate = publicProduct({
  slug: "sold-late",
  brand: "Epiphone",
  priceFils: 50_000,
  status: "sold",
  publishedAt: day(2),
  soldAt: day(25),
});
const strings = publicProduct({
  slug: "strings",
  kind: "gear",
  condition: null,
  priceFils: 4_500,
  publishedAt: day(1),
});
const all = [strat, lesPaul, tele, soldEarly, soldLate, strings];

const slugs = (query: Partial<CatalogQuery>) =>
  applyCatalogQuery(all, { ...emptyQuery, ...query }).map((p) => p.slug);

describe("parseCatalogQuery", () => {
  it("defaults to everything, newest first", () => {
    expect(parseCatalogQuery({})).toEqual({
      brands: [],
      conditions: [],
      pickupLayouts: [],
      bodyStyles: [],
      minFils: null,
      maxFils: null,
      availableOnly: false,
      sort: "newest",
    });
    expect(isFiltered(emptyQuery)).toBe(false);
  });

  it("reads repeated and single parameters", () => {
    const query = parseCatalogQuery({
      brand: ["Fender", "Gibson", "Fender"],
      condition: "excellent",
      pickups: ["HH", "SSS"],
      body: "s_style",
      min: "500",
      max: "5000",
      available: "1",
      sort: "price-asc",
    });
    expect(query).toEqual({
      brands: ["Fender", "Gibson"],
      conditions: ["excellent"],
      pickupLayouts: ["HH", "SSS"],
      bodyStyles: ["s_style"],
      minFils: 50_000,
      maxFils: 500_000,
      availableOnly: true,
      sort: "price-asc",
    });
    expect(isFiltered(query)).toBe(true);
  });

  it("drops values it doesn't know", () => {
    expect(
      parseCatalogQuery({
        condition: ["like new", "fair"],
        pickups: "HHHH",
        body: "flying_v",
        sort: "random",
        available: "yes",
      }),
    ).toEqual({ ...emptyQuery, conditions: ["fair"] });
  });

  it("takes whole dirhams only, in Western or Arabic-Indic digits", () => {
    expect(parseCatalogQuery({ min: "١٠٠٠" }).minFils).toBe(100_000);
    for (const bad of ["-5", "10.5", "1,000", "abc", "0", "99999999999"]) {
      expect(parseCatalogQuery({ min: bad }).minFils, bad).toBeNull();
    }
  });

  it("swaps a minimum above the maximum", () => {
    const query = parseCatalogQuery({ min: "5000", max: "1000" });
    expect([query.minFils, query.maxFils]).toEqual([100_000, 500_000]);
  });

  it("caps how many values a parameter can carry", () => {
    const brands = Array.from({ length: 100 }, (_, i) => `Brand ${i}`);
    expect(parseCatalogQuery({ brand: brands }).brands).toHaveLength(20);
    expect(parseCatalogQuery({ brand: "x".repeat(61) }).brands).toEqual([]);
  });
});

describe("catalogSearchParams", () => {
  it("round-trips a query and leaves defaults out", () => {
    const query = parseCatalogQuery({
      brand: ["Fender", "Gibson"],
      condition: "new",
      min: "250",
      sort: "price-desc",
      available: "1",
    });
    const params = catalogSearchParams(query);
    expect(params.toString()).toBe(
      "brand=Fender&brand=Gibson&condition=new&min=250&available=1&sort=price-desc",
    );
    expect(parseCatalogQuery(Object.fromEntries(groupParams(params)))).toEqual(query);
    expect(catalogSearchParams(emptyQuery).toString()).toBe("");
  });
});

function groupParams(params: URLSearchParams): [string, string[]][] {
  return [...new Set(params.keys())].map((key) => [key, params.getAll(key)]);
}

describe("applyCatalogQuery", () => {
  it("shows what's for sale first, newest listed first, then sold items, latest sale first", () => {
    expect(slugs({})).toEqual(["strat", "les-paul", "tele", "strings", "sold-late", "sold-early"]);
  });

  it("sorts by price within what's for sale and within what's sold", () => {
    expect(slugs({ sort: "price-asc" })).toEqual([
      "strings",
      "tele",
      "strat",
      "les-paul",
      "sold-late",
      "sold-early",
    ]);
    expect(slugs({ sort: "price-desc" })).toEqual([
      "les-paul",
      "strat",
      "tele",
      "strings",
      "sold-early",
      "sold-late",
    ]);
  });

  it("matches brands whatever their case", () => {
    expect(slugs({ brands: ["FENDER"] })).toEqual(["strat", "tele"]);
    expect(slugs({ brands: ["gibson", "Epiphone"] })).toEqual([
      "les-paul",
      "sold-late",
      "sold-early",
    ]);
  });

  it("filters by condition, with new gear as its own grade", () => {
    expect(slugs({ conditions: ["excellent"] })).toEqual(["les-paul", "tele"]);
    expect(slugs({ conditions: ["new"] })).toEqual(["strings"]);
  });

  it("filters by pickup layout and body style, leaving out items without them", () => {
    expect(slugs({ pickupLayouts: ["HH", "SS"] })).toEqual(["les-paul", "tele"]);
    expect(slugs({ bodyStyles: ["s_style"] })).toEqual(["strat"]);
  });

  it("filters by price, both ends inclusive", () => {
    expect(slugs({ minFils: 270_000, maxFils: 345_000 })).toEqual(["strat", "tele"]);
    expect(slugs({ maxFils: 4_500 })).toEqual(["strings"]);
  });

  it("can hide holds and sold items", () => {
    expect(slugs({ availableOnly: true })).toEqual(["strat", "les-paul", "strings"]);
  });

  it("combines filters: all must match", () => {
    expect(slugs({ brands: ["Fender"], conditions: ["excellent"] })).toEqual(["tele"]);
    expect(slugs({ brands: ["Fender"], availableOnly: true, pickupLayouts: ["HH"] })).toEqual([]);
  });
});

describe("catalogFacets", () => {
  it("offers only values that occur, in a fixed order, one entry per brand", () => {
    expect(catalogFacets(all)).toEqual({
      brands: ["Epiphone", "Fender", "Gibson"],
      conditions: ["new", "excellent", "very_good", "good"],
      pickupLayouts: ["SS", "SSS", "HH"],
      bodyStyles: ["s_style", "t_style", "single_cut"],
    });
  });

  it("offers nothing for an empty list", () => {
    expect(catalogFacets([])).toEqual({
      brands: [],
      conditions: [],
      pickupLayouts: [],
      bodyStyles: [],
    });
  });
});

describe("guitar filters", () => {
  it("are offered only where everything listed is a guitar", () => {
    const guitar = publicProduct({ kind: "guitar" });
    const device = publicProduct({ kind: "device", condition: null });
    expect(offersGuitarFilters([guitar, publicProduct({ kind: "guitar" })])).toBe(true);
    expect(offersGuitarFilters([guitar, device])).toBe(false);
    expect(offersGuitarFilters([device])).toBe(false);
    expect(offersGuitarFilters([])).toBe(false);
  });

  it("are dropped from a query where they aren't offered, keeping price, stock and sort", () => {
    const query = parseCatalogQuery({
      brand: "Fender",
      condition: "good",
      pickups: "HH",
      body: "s_style",
      min: "100",
      available: "1",
      sort: "price-asc",
    });
    expect(withoutGuitarFilters(query)).toEqual({
      ...emptyQuery,
      minFils: 10_000,
      availableOnly: true,
      sort: "price-asc",
    });
  });
});
