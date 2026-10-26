import { Suspense } from "react";

import type { Metadata, Viewport } from "next";

import { brand } from "@/config/brand";

import { fontVariables } from "../fonts";

import "../globals.css";

// The admin: English UI (product content is bilingual), mobile-first for use at the
// bench, never indexed or cached (see the headers in next.config.ts). Its text is in the
// components rather than messages/*.json, which hold the public site's two languages.

export const metadata: Metadata = {
  title: { default: `Admin | ${brand.name.en}`, template: `%s | Admin` },
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <html lang="en" dir="ltr" className={`${fontVariables} h-full antialiased`}>
      <body className="theme-midtown flex min-h-full flex-col bg-grey-100">
        {/* Every admin page reads the session, so it renders at request time. */}
        <Suspense fallback={<p className="p-6 text-grey-600">Loading…</p>}>{children}</Suspense>
      </body>
    </html>
  );
}
