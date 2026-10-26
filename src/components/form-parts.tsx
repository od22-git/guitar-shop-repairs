import type { ReactNode } from "react";

// Form building blocks for the public site. Forms sit on a light card (`formCard`), so
// inputs use the same pairs as the admin: ink on white, ink-muted borders, fiesta-deep
// errors (src/app/design-tokens.test.ts). Inputs are 44px tall with 16px text, so phones
// don't zoom in on focus.

export const formCard =
  "surface-light rounded-sm bg-paper p-5 text-ink [color-scheme:light] sm:p-8";

export const inputClass =
  "block min-h-11 w-full rounded-sm border border-ink-muted bg-white px-3 py-2 text-base text-ink aria-invalid:border-2 aria-invalid:border-fiesta-deep";

export const checkClass = "size-6 shrink-0 accent-fiesta";

export const submitClass =
  "inline-flex min-h-12 items-center justify-center rounded-sm bg-fiesta px-6 font-semibold text-white hover:bg-fiesta-deep disabled:opacity-70";

/** aria props tying an input to its hint and error. */
export function fieldProps(name: string, error?: string, hint?: boolean) {
  const ids = [hint && `${name}-hint`, error && `${name}-error`].filter(Boolean).join(" ");
  return {
    id: name,
    name,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": ids || undefined,
  };
}

export function FormField({
  label,
  name,
  error,
  hint,
  children,
}: {
  label: ReactNode;
  name: string;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="font-semibold">
        {label}
      </label>
      {children}
      {hint && (
        <p id={`${name}-hint`} className="text-sm text-ink-muted">
          {hint}
        </p>
      )}
      {error && <FieldError name={name}>{error}</FieldError>}
    </div>
  );
}

export function FieldError({ name, children }: { name: string; children: ReactNode }) {
  return (
    <p id={`${name}-error`} className="text-sm font-medium text-fiesta-deep">
      {children}
    </p>
  );
}
