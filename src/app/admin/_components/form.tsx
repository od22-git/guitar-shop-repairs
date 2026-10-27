import type { ReactNode } from "react";

// Form building blocks for the admin. Inputs are 44px tall for thumbs at the bench, and
// 16px text so phones don't zoom in on focus.

export const inputClass =
  "block min-h-11 w-full rounded-md border border-grey-600 bg-white px-3 py-2 text-base text-black aria-invalid:border-red aria-invalid:border-2";

export function Field({
  label,
  name,
  error,
  hint,
  children,
}: {
  label: string;
  name: string;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="font-medium">
        {label}
      </label>
      {children}
      {hint && (
        <p id={`${name}-hint`} className="text-sm text-grey-600">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${name}-error`} className="text-sm font-medium text-red">
          {error}
        </p>
      )}
    </div>
  );
}

/** aria props tying an input to its hint and error. */
export function describedBy(name: string, error?: string, hint?: boolean) {
  const ids = [hint && `${name}-hint`, error && `${name}-error`].filter(Boolean).join(" ");
  return {
    id: name,
    name,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": ids || undefined,
  };
}

export function Panel({ title, children }: { title: string; children: ReactNode }) {
  const id = `panel-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <section aria-labelledby={id} className="rounded-lg bg-white p-4 sm:p-6">
      <h2 id={id} className="mb-4 text-lg font-bold">
        {title}
      </h2>
      {children}
    </section>
  );
}

export const primaryButton =
  "inline-flex min-h-11 items-center justify-center rounded-md bg-black px-5 font-semibold text-white hover:bg-grey-800 disabled:opacity-60";
export const secondaryButton =
  "inline-flex min-h-11 items-center justify-center rounded-md border border-black px-4 font-medium text-black hover:bg-grey-100 disabled:opacity-60";
