"use client";

import { outfit, tajawal } from "./fonts";

import "./globals.css";

// Shown only when a root layout itself fails, so it renders its own document, outside
// the locale and its messages: a short bilingual note, English then Arabic. Errors inside
// a page show [locale]/error.tsx or admin/error.tsx instead.

export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="en" dir="ltr" className={`${outfit.variable} ${tajawal.variable} antialiased`}>
      <body className="mx-auto flex min-h-svh max-w-xl flex-col justify-center gap-10 px-4 py-16">
        <title>Something went wrong</title>
        <div>
          <h1 className="text-3xl font-extrabold">Something went wrong</h1>
          <p className="mt-3 text-ink-subtle">
            The site hit a problem on our side. Please try again in a moment.
          </p>
        </div>
        <div lang="ar" dir="rtl">
          <h2 className="text-3xl font-extrabold">حدث خطأ ما</h2>
          <p className="mt-3 text-ink-subtle">
            واجه الموقع مشكلة من جهتنا. يُرجى المحاولة بعد قليل.
          </p>
        </div>
        <button
          type="button"
          onClick={() => retry()}
          className="inline-flex min-h-12 items-center self-start rounded-sm bg-fiesta px-5 font-semibold text-white hover:bg-fiesta-deep"
        >
          Try again · أعد المحاولة
        </button>
      </body>
    </html>
  );
}
