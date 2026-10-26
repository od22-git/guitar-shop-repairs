"use client";

import { useErrorText } from "@/components/error-text";
import { Link } from "@/i18n/navigation";

// The 500 page inside the site's layout, with strings from the layout (ErrorTextProvider).

export default function ErrorPage({ retry }: { error: unknown; retry: () => void }) {
  const text = useErrorText();

  return (
    <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <h1 className="text-4xl font-extrabold tracking-tight text-balance rtl:tracking-normal">
        {text.title}
      </h1>
      <p className="mt-4 max-w-[55ch] text-lg text-ink-subtle">{text.body}</p>
      <div className="mt-8 flex flex-wrap items-center gap-6">
        <button
          type="button"
          onClick={() => retry()}
          className="inline-flex min-h-12 items-center rounded-sm bg-fiesta px-5 font-semibold text-white hover:bg-fiesta-deep"
        >
          {text.retry}
        </button>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center font-semibold underline decoration-gold decoration-2 underline-offset-4 hover:text-gold"
        >
          {text.home}
        </Link>
      </div>
    </div>
  );
}
