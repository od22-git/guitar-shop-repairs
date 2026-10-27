"use client";

import { ActionForm } from "../../../_components/action-form";
import type { ActionState } from "../../../_components/action-state";
import { inputClass, primaryButton, secondaryButton } from "../../../_components/form";
import { createVariantAction, deleteVariantAction, updateVariantAction } from "../actions";

export type VariantValues = {
  id: number;
  nameEn: string;
  nameAr: string;
  /** AED, as typed in the form ("299"). */
  priceFils: string;
  compareAtFils: string;
  customToneSlots: string;
  includesPack: boolean;
  featured: boolean;
  active: boolean;
  sort: string;
};

const blank: Omit<VariantValues, "id"> = {
  nameEn: "",
  nameAr: "",
  priceFils: "",
  compareAtFils: "",
  customToneSlots: "0",
  includesPack: false,
  featured: false,
  active: true,
  sort: "",
};

/** The fields of one variant. Ids carry a prefix, as several forms share the page. */
function VariantFields({
  prefix,
  values,
  errors,
}: {
  prefix: string;
  values: Omit<VariantValues, "id">;
  errors: Record<string, string>;
}) {
  const field = (
    name: keyof typeof values,
    label: string,
    extra: { hint?: string; ar?: boolean; numeric?: boolean } = {},
  ) => {
    const id = `${prefix}-${name}`;
    const error = errors[name];
    const described = [extra.hint && `${id}-hint`, error && `${id}-error`]
      .filter(Boolean)
      .join(" ");
    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={id} className="font-medium">
          {label}
        </label>
        <input
          id={id}
          name={name}
          defaultValue={String(values[name])}
          aria-invalid={error ? true : undefined}
          aria-describedby={described || undefined}
          inputMode={extra.numeric ? "decimal" : undefined}
          className={`${inputClass} ${extra.numeric ? "tabular-nums" : ""}`}
          {...(extra.ar ? { lang: "ar", dir: "rtl" } : {})}
        />
        {extra.hint && (
          <p id={`${id}-hint`} className="text-sm text-grey-600">
            {extra.hint}
          </p>
        )}
        {error && (
          <p id={`${id}-error`} className="text-sm font-medium text-red">
            {error}
          </p>
        )}
      </div>
    );
  };
  const tick = (name: "includesPack" | "featured" | "active", label: string) => (
    <label className="flex min-h-11 items-center gap-2">
      <input
        type="checkbox"
        name={name}
        defaultChecked={values[name]}
        className="size-5 accent-black"
      />
      {label}
    </label>
  );

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        {field("nameEn", "Variant name in English")}
        {field("nameAr", "Variant name in Arabic", { ar: true, hint: "Optional." })}
        {field("priceFils", "Variant price (AED)", { numeric: true })}
        {field("compareAtFils", "Variant earlier price (AED)", {
          numeric: true,
          hint: "Optional. Shown struck through.",
        })}
        {field("customToneSlots", "Custom tones built for the customer", {
          numeric: true,
          hint: "0 for none. The Custom Tone Bundle has 3.",
        })}
        {field("sort", "Order", { numeric: true, hint: "Lower comes first." })}
      </div>
      <div className="flex flex-wrap gap-x-6">
        {tick("includesPack", "Includes a Signature Pack")}
        {tick("featured", "Our pick (chosen first)")}
        {tick("active", "Offered in the shop")}
      </div>
    </>
  );
}

const formErrors = (state: ActionState) => state.errors ?? {};

/**
 * The ways to buy a product, such as the NANOCORE's bundles. They share the product's
 * stock and status; the shop lists the product at its lowest active variant price.
 */
export function VariantsPanel({
  productId,
  variants,
}: {
  productId: number;
  variants: VariantValues[];
}) {
  return (
    <section
      aria-labelledby="variants-heading"
      className="flex flex-col gap-4 rounded-lg bg-white p-4 sm:p-6"
    >
      <div>
        <h2 id="variants-heading" className="text-lg font-bold">
          Variants
        </h2>
        <p className="text-grey-600">
          Ways to buy it, like Device only or Starter Bundle. They share the stock above, and
          customers pick one on the product page. With variants, the product’s price is the lowest
          one.
        </p>
      </div>

      {variants.map((variant) => (
        <details key={variant.id} className="border-b border-grey-300 pb-4">
          <summary className="flex min-h-11 cursor-pointer flex-wrap items-center gap-x-3">
            <span className="font-bold">{variant.nameEn}</span>
            <span className="tabular-nums">AED {variant.priceFils}</span>
            <span className="text-sm text-grey-600">
              {[
                variant.featured && "our pick",
                variant.includesPack && "pack",
                variant.customToneSlots !== "0" && `${variant.customToneSlots} custom tones`,
                !variant.active && "not offered",
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </summary>
          <div className="mt-3 flex flex-col gap-3">
            <ActionForm
              action={updateVariantAction.bind(null, variant.id)}
              className="flex flex-col gap-4"
            >
              {(pending, state) => (
                <>
                  <VariantFields
                    prefix={`variant-${variant.id}`}
                    values={variant}
                    errors={formErrors(state)}
                  />
                  <div>
                    <button type="submit" disabled={pending} className={primaryButton}>
                      {pending ? "Saving…" : `Save ${variant.nameEn}`}
                    </button>
                  </div>
                </>
              )}
            </ActionForm>
            <ActionForm
              action={deleteVariantAction.bind(null, variant.id)}
              confirm={`Delete the variant “${variant.nameEn}”?`}
            >
              {(pending) => (
                <button type="submit" disabled={pending} className={secondaryButton}>
                  {pending ? "Deleting…" : `Delete ${variant.nameEn}`}
                </button>
              )}
            </ActionForm>
          </div>
        </details>
      ))}

      <details>
        <summary className="inline-flex min-h-11 cursor-pointer items-center font-semibold underline underline-offset-4">
          Add a variant
        </summary>
        <ActionForm
          action={createVariantAction.bind(null, productId)}
          className="mt-3 flex flex-col gap-4"
        >
          {(pending, state) => (
            <>
              {/* Remounted after each success, so the fields empty for the next one. */}
              <div key={state.ok ? state.at : "draft"} className="flex flex-col gap-4">
                <VariantFields prefix="variant-new" values={blank} errors={formErrors(state)} />
              </div>
              <div>
                <button type="submit" disabled={pending} className={primaryButton}>
                  {pending ? "Adding…" : "Add variant"}
                </button>
              </div>
            </>
          )}
        </ActionForm>
      </details>
    </section>
  );
}
