import type { Metadata } from "next";

import { brand } from "@/config/brand";

import "./globals.css";

export const metadata: Metadata = {
  title: brand.name.en,
  description: brand.tagline.en,
  // Not public until launch (M9).
  robots: { index: false, follow: false },
};

// M1 replaces this with the /[locale] layout (lang, dir, fonts).
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
