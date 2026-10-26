import type { Metadata, Viewport } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { locale as rootLocale } from "next/root-params";

import { ErrorTextProvider } from "@/components/error-text";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { WhatsAppButton } from "@/components/whatsapp-button";
import { brand } from "@/config/brand";
import { localeDirection, routing, type Locale } from "@/i18n/routing";
import { env } from "@/lib/env";

import { alexandria, archivo, jetbrainsMono, outfit, tajawal } from "../fonts";

import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

async function currentLocale(): Promise<Locale> {
  const locale = await rootLocale();
  if (!hasLocale(routing.locales, locale)) notFound();
  return locale;
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await currentLocale();
  return {
    // Resolves relative URLs in metadata (canonical, hreflang, link previews).
    metadataBase: new URL(env.SITE_URL),
    title: { default: brand.name[locale], template: `%s | ${brand.name[locale]}` },
    description: brand.tagline[locale],
    // Not public until launch (M9).
    robots: { index: false, follow: false },
  };
}

export const viewport: Viewport = {
  themeColor: "#13294b",
};

export default async function LocaleLayout({ children }: LayoutProps<"/[locale]">) {
  const locale = await currentLocale();
  const [t, tError] = await Promise.all([getTranslations("Layout"), getTranslations("ErrorPage")]);
  const errorText = {
    title: tError("title"),
    body: tError("body"),
    retry: tError("retry"),
    home: tError("home"),
  };

  return (
    <html
      lang={locale}
      dir={localeDirection(locale)}
      className={`${outfit.variable} ${tajawal.variable} ${archivo.variable} ${alexandria.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only rounded-sm bg-mist px-4 py-3 font-semibold text-ink focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50"
        >
          {t("skipToContent")}
        </a>
        {/* Client components get the locale but no messages: they take strings as props. */}
        <NextIntlClientProvider messages={null}>
          <SiteHeader />
          <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
            <ErrorTextProvider value={errorText}>{children}</ErrorTextProvider>
          </main>
          <SiteFooter />
          <WhatsAppButton />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
