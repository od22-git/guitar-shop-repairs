"use client";

import Link from "next/link";

// The admin's 500 page. The server logs the error under its digest; the message isn't
// shown, as production errors from the server arrive without it.

export default function AdminError({ error, retry }: { error: unknown; retry: () => void }) {
  const digest = error instanceof Error && "digest" in error ? String(error.digest) : null;

  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <h1 className="text-2xl font-extrabold">Something went wrong</h1>
      <p className="mt-3 text-ink-muted">
        Nothing was changed by the step that failed unless the page says so. Try again, or go back
        to the overview.
        {digest && <> Error reference: {digest}.</>}
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-6">
        <button
          type="button"
          onClick={() => retry()}
          className="inline-flex min-h-11 items-center rounded-sm bg-ink px-4 font-semibold text-mist hover:bg-ink/90"
        >
          Try again
        </button>
        <Link href="/admin" className="inline-flex min-h-11 items-center font-semibold underline">
          Overview
        </Link>
      </div>
    </div>
  );
}
