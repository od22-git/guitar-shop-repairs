import type { Metadata } from "next";

import { brand } from "@/config/brand";
import { getPathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

// Page metadata shared by the public pages. Relative URLs resolve against `metadataBase`
// (SITE_URL), set in the locale layout.

const ogLocale: Record<Locale, string> = { en: "en_AE", ar: "ar_AE" };

/** Canonical URL plus hreflang alternates: both languages, with English as x-default. */
export function pageAlternates(locale: Locale, href: string): Metadata["alternates"] {
  const path = (l: Locale) => getPathname({ href, locale: l });
  return {
    canonical: path(locale),
    languages: {
      ...Object.fromEntries(routing.locales.map((l) => [l, path(l)])),
      "x-default": path(routing.defaultLocale),
    },
  };
}

type PageInfo = {
  /** The page's own title; the layout's template adds the brand. */
  title: string;
  description: string;
  images?: { url: string; width: number; height: number; alt: string }[];
};

/** Title, description, alternates and link-preview tags for a page at `href`. */
export function pageMetadata(locale: Locale, href: string, page: PageInfo): Metadata {
  return {
    title: page.title,
    description: page.description,
    alternates: pageAlternates(locale, href),
    openGraph: {
      type: "website",
      siteName: brand.name[locale],
      title: page.title,
      description: page.description,
      url: getPathname({ href, locale }),
      locale: ogLocale[locale],
      alternateLocale: routing.locales.filter((l) => l !== locale).map((l) => ogLocale[l]),
      images: page.images,
    },
    twitter: { card: page.images ? "summary_large_image" : "summary" },
  };
}
