import { Suspense } from "react";

import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { brand } from "@/config/brand";
import { pageMetadata } from "@/lib/seo";

import { CatalogFallback, CatalogResults, ShopHeader } from "./catalog";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations("Shop");
  return pageMetadata(locale, "/shop", {
    title: t("title"),
    description: t("description", { location: brand.location[locale] }),
  });
}

export default function ShopPage({ searchParams }: PageProps<"/[locale]/shop">) {
  return (
    <>
      <ShopHeader category={null} />
      <Suspense fallback={<CatalogFallback />}>
        <CatalogResults category={null} searchParams={searchParams} />
      </Suspense>
    </>
  );
}
