import type { ComponentProps, ReactNode } from "react";

import { fieldProps } from "../form-parts";

// M9a form fields: square, a 1px black edge on white (19.8:1), 52px tall with 16px text so
// phones don't zoom in on focus. An error thickens the edge to 2px red and says what's
// wrong in words under the field, so it never relies on colour. Wire inputs to their
// label, hint and error with `fieldProps` (src/components/form-parts.tsx).

export { fieldProps };

export const inputClass =
  "block min-h-13 w-full border border-black bg-white px-4 py-3 font-grotesk text-base text-black placeholder:text-grey-600 aria-invalid:border-2 aria-invalid:border-red";

export const selectClass = `${inputClass} appearance-none bg-[length:1.25rem] bg-[position:right_1rem_center] bg-no-repeat pe-12 rtl:bg-[position:left_1rem_center] bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none' stroke='%230a0a0a' stroke-width='2'%3E%3Cpath d='M5 8l5 5 5-5'/%3E%3C/svg%3E")]`;

/** A label, the control, an optional hint and an error. */
export function Field({
  label,
  name,
  hint,
  error,
  children,
}: {
  label: ReactNode;
  name: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={name} className="font-bold">
        {label}
      </label>
      {children}
      {hint && (
        <p id={`${name}-hint`} className="text-sm text-grey-600">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${name}-error`} className="text-sm font-semibold text-red">
          {error}
        </p>
      )}
    </div>
  );
}

/** A tick box with its label beside it; the whole row is the target. */
export function Checkbox({
  label,
  detail,
  className = "",
  ...props
}: { label: ReactNode; detail?: ReactNode } & Omit<ComponentProps<"input">, "type">) {
  return (
    <label className={`flex min-h-11 cursor-pointer items-start gap-3 py-2 ${className}`}>
      <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-black" {...props} />
      <span>
        <span className="font-semibold">{label}</span>
        {detail && <span className="block text-sm text-grey-600">{detail}</span>}
      </span>
    </label>
  );
}

/**
 * One choice of a set, as a card: a radio or a tick box, a name, a line of detail and an
 * optional price at the end. The chosen card gets a 2px black edge (CSS :has, no script).
 * Put the radios of one choice in a <fieldset> with a <legend>.
 */
export function OptionCard({
  type = "radio",
  label,
  detail,
  aside,
  className = "",
  ...props
}: {
  type?: "radio" | "checkbox";
  label: ReactNode;
  detail?: ReactNode;
  aside?: ReactNode;
} & Omit<ComponentProps<"input">, "type">) {
  return (
    <label
      className={`grid cursor-pointer grid-cols-[auto_1fr_auto] items-start gap-x-4 border border-grey-600 p-4 has-checked:border-black has-checked:inset-ring-1 has-checked:inset-ring-black has-focus-visible:outline-3 has-focus-visible:outline-offset-3 has-focus-visible:outline-blue ${className}`}
    >
      <input
        type={type}
        className="mt-0.5 size-5 accent-black focus-visible:outline-none"
        {...props}
      />
      <span className="min-w-0">
        <span className="font-bold">{label}</span>
        {detail && <span className="mt-0.5 block text-sm text-grey-600">{detail}</span>}
      </span>
      {aside && <span className="shrink-0">{aside}</span>}
    </label>
  );
}
