import type { MetadataRoute } from "next";

import { policies } from "@/config/policies";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { getCatalog } from "@/lib/catalog";
import { env } from "@/lib/env";

// Every public page in both languages, each listing its other-language version. Products
// appear only while listed (available, on hold or sold); drafts and archived ones never
// do. Cached with the catalog, so admin changes update it (CATALOG_TAG).

const absolute = (path: string) => new URL(path, env.SITE_URL).toString();

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { categories, products } = await getCatalog();
  const pages: { href: string; lastModified?: Date; image?: string }[] = [
    { href: "/" },
    { href: "/shop" },
    ...categories.map((category) => ({ href: `/shop/${category.slug}` })),
    ...products.map((product) => ({
      href: `/product/${product.slug}`,
      lastModified: product.updatedAt,
      image: product.images[0] && `${product.images[0].src}-1920.webp`,
    })),
    { href: "/repairs" },
    { href: "/sell" },
    { href: "/faq" },
    { href: "/about" },
    { href: "/contact" },
    ...policies.map((policy) => ({ href: `/policies/${policy}` })),
  ];

  return pages.flatMap(({ href, lastModified, image }) => {
    const languages = Object.fromEntries(
      routing.locales.map((locale) => [locale, absolute(getPathname({ href, locale }))]),
    );
    return routing.locales.map((locale) => ({
      url: languages[locale],
      lastModified,
      alternates: { languages },
      ...(image && { images: [absolute(image)] }),
    }));
  });
}
