"use client";

import { fontVariables } from "./fonts";

import "./globals.css";

// Shown only when a root layout itself fails, so it renders its own document, outside
// the locale and its messages: a short bilingual note, English then Arabic. Errors inside
// a page show [locale]/error.tsx or admin/error.tsx instead.

export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="en" dir="ltr" className={`${fontVariables} antialiased`}>
      <body className="theme-midtown mx-auto flex min-h-svh max-w-xl flex-col justify-center gap-10 px-5 py-16">
        <title>Something went wrong</title>
        <div>
          <h1 className="text-4xl font-black font-stretch-semi-expanded">Something went wrong</h1>
          <p className="mt-3 text-lg text-grey-600">
            The site hit a problem on our side. Please try again in a moment.
          </p>
        </div>
        <div lang="ar" dir="rtl">
          <h2 className="text-4xl leading-[1.3] font-black">حدث خطأ ما</h2>
          <p className="mt-3 text-lg text-grey-600">
            واجه الموقع مشكلة من جهتنا. يُرجى المحاولة بعد قليل.
          </p>
        </div>
        <button
          type="button"
          onClick={() => retry()}
          className="inline-flex min-h-14 items-center self-start border-2 border-black bg-black px-7 font-bold text-white hover:bg-grey-800"
        >
          Try again · أعد المحاولة
        </button>
      </body>
    </html>
  );
}
