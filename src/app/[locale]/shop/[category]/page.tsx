import { Suspense } from "react";

import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { brand } from "@/config/brand";
import type { Locale } from "@/i18n/routing";
import { getCatalog, getCategory } from "@/lib/catalog";
import { pageMetadata } from "@/lib/seo";

import { CatalogFallback, CatalogResults, ShopHeader } from "../catalog";

export async function generateStaticParams() {
  const { categories } = await getCatalog();
  // A static route needs one path to build. With no categories yet (a database that
  // hasn't been seeded), this one shows not found.
  if (categories.length === 0) return [{ category: "none-yet" }];
  return categories.map((category) => ({ category: category.slug }));
}

async function categoryFor(params: Promise<{ category: string }>, locale: Locale) {
  const category = await getCategory((await params).category);
  if (!category) notFound();
  return { slug: category.slug, name: locale === "ar" ? category.nameAr : category.nameEn };
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/shop/[category]">): Promise<Metadata> {
  const locale = await getLocale();
  const [category, t] = await Promise.all([categoryFor(params, locale), getTranslations("Shop")]);
  return pageMetadata(locale, `/shop/${category.slug}`, {
    title: category.name,
    description: t("categoryDescription", {
      category: category.name,
      brand: brand.name[locale],
      location: brand.location[locale],
    }),
  });
}

export default async function CategoryPage({
  params,
  searchParams,
}: PageProps<"/[locale]/shop/[category]">) {
  // Read outside <Suspense>: an unknown category is a 404 before anything streams.
  const category = await categoryFor(params, await getLocale());
  return (
    <>
      <ShopHeader category={category} />
      <Suspense fallback={<CatalogFallback />}>
        <CatalogResults category={category} searchParams={searchParams} />
      </Suspense>
    </>
  );
}
