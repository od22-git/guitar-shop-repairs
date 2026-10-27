"use client";

import { ActionForm } from "../../_components/action-form";
import type { ActionState } from "../../_components/action-state";
import { describedBy, Field, inputClass, primaryButton } from "../../_components/form";

export type ProductFormOptions = {
  categories: { id: number; name: string }[];
  conditions: { value: string; label: string }[];
  bodyStyles: { value: string; label: string }[];
  pickupLayouts: { value: string; label: string }[];
};

type Props = {
  action: (state: ActionState, form: FormData) => Promise<ActionState>;
  options: ProductFormOptions;
  /** Current values as form strings ("spec.body" for specs). */
  values: Record<string, string>;
  creating: boolean;
  slugLocked: boolean;
};

export function ProductForm({ action, options, values, creating, slugLocked }: Props) {
  return (
    <ActionForm action={action} className="flex flex-col gap-6">
      {(pending, state) => {
        const e = state.errors ?? {};
        const text = (name: string, label: string, extra: { hint?: string; ar?: boolean } = {}) => (
          <Field label={label} name={name} error={e[name]} hint={extra.hint}>
            <input
              {...describedBy(name, e[name], !!extra.hint)}
              defaultValue={values[name]}
              className={inputClass}
              {...(extra.ar ? { lang: "ar", dir: "rtl" } : {})}
            />
          </Field>
        );
        const area = (name: string, label: string, ar = false) => (
          <Field label={label} name={name} error={e[name]}>
            <textarea
              {...describedBy(name, e[name])}
              defaultValue={values[name]}
              rows={5}
              className={inputClass}
              {...(ar ? { lang: "ar", dir: "rtl" } : {})}
            />
          </Field>
        );
        const select = (
          name: string,
          label: string,
          choices: { value: string; label: string }[],
          blank = "Not set",
        ) => (
          <Field label={label} name={name} error={e[name]}>
            <select
              {...describedBy(name, e[name])}
              defaultValue={values[name] ?? ""}
              className={inputClass}
            >
              <option value="">{blank}</option>
              {choices.map((choice) => (
                <option key={choice.value} value={choice.value}>
                  {choice.label}
                </option>
              ))}
            </select>
          </Field>
        );
        const money = (name: string, label: string, hint?: string) => (
          <Field label={`${label} (AED)`} name={name} error={e[name]} hint={hint}>
            <input
              {...describedBy(name, e[name], !!hint)}
              defaultValue={values[name]}
              inputMode="decimal"
              className={`${inputClass} tabular-nums`}
            />
          </Field>
        );

        return (
          <>
            <fieldset className="flex flex-col gap-4 rounded-lg bg-white p-4 sm:p-6">
              <legend className="float-start mb-2 text-lg font-bold">What it is</legend>
              <div className="flex gap-6">
                {(["guitar", "gear"] as const).map((kind) => (
                  <label key={kind} className="flex min-h-11 items-center gap-2">
                    <input
                      type="radio"
                      name="kind"
                      value={kind}
                      defaultChecked={(values.kind ?? "guitar") === kind}
                      className="size-5 accent-black"
                    />
                    {kind === "guitar" ? "A guitar" : "Gear (pedals, amps, parts)"}
                  </label>
                ))}
              </div>
              {select(
                "categoryId",
                "Category",
                options.categories.map((c) => ({ value: String(c.id), label: c.name })),
                "Choose a category",
              )}
              {text("titleEn", "Title in English")}
              {text("titleAr", "Title in Arabic", {
                hint: "Optional. The shop shows the English one if blank.",
                ar: true,
              })}
              <div className="grid gap-4 sm:grid-cols-3">
                {text("brand", "Brand")}
                {text("model", "Model")}
                {text("year", "Year")}
              </div>
              {select("condition", "Condition", options.conditions, "Not graded (new gear)")}
            </fieldset>

            <fieldset className="flex flex-col gap-4 rounded-lg bg-white p-4 sm:p-6">
              <legend className="float-start mb-2 text-lg font-bold">Price and stock</legend>
              <div className="grid gap-4 sm:grid-cols-3">
                {money("priceFils", "Price", "The final price.")}
                {money(
                  "compareAtFils",
                  "Earlier price",
                  "Shown struck through after a price drop.",
                )}
                {money("costFils", "Cost", "What you paid. Never shown in the shop.")}
              </div>
              {creating &&
                text("quantity", "How many in stock", { hint: "A guitar is always one." })}
            </fieldset>

            <fieldset className="flex flex-col gap-4 rounded-lg bg-white p-4 sm:p-6">
              <legend className="float-start mb-2 text-lg font-bold">Link and SKU</legend>
              <Field
                label="Link (slug)"
                name="slug"
                error={e.slug}
                hint={
                  slugLocked
                    ? "Locked: it has been published, and shared links must keep working."
                    : "Made from the English title if left blank. Locked once published."
                }
              >
                <input
                  {...describedBy("slug", e.slug, true)}
                  defaultValue={values.slug}
                  readOnly={slugLocked}
                  dir="ltr"
                  className={`${inputClass} read-only:bg-grey-100`}
                />
              </Field>
              <Field
                label="SKU"
                name="sku"
                error={e.sku}
                hint="Your stock code, like G-0012. Customers see it in WhatsApp messages."
              >
                <input
                  {...describedBy("sku", e.sku, true)}
                  defaultValue={values.sku}
                  dir="ltr"
                  className={inputClass}
                />
              </Field>
            </fieldset>

            <fieldset className="flex flex-col gap-4 rounded-lg bg-white p-4 sm:p-6">
              <legend className="float-start mb-2 text-lg font-bold">Description</legend>
              {area("descriptionEn", "Description in English")}
              {area("descriptionAr", "Description in Arabic", true)}
              {area("techNotesEn", "Tech notes in English")}
              {area("techNotesAr", "Tech notes in Arabic", true)}
            </fieldset>

            <fieldset className="flex flex-col gap-4 rounded-lg bg-white p-4 sm:p-6">
              <legend className="float-start mb-2 text-lg font-bold">Specs</legend>
              <p className="text-grey-600">
                Fill in what applies. Values are shown as you type them.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {select("spec.bodyStyle", "Body style", options.bodyStyles)}
                {select("spec.pickupLayout", "Pickup layout", options.pickupLayouts)}
                {text("spec.body", "Body wood")}
                {text("spec.finish", "Finish")}
                {text("spec.neck", "Neck")}
                {text("spec.fretboard", "Fretboard")}
                {text("spec.frets", "Frets")}
                {text("spec.scale", "Scale length")}
                {text("spec.pickups", "Pickups")}
                {text("spec.weightKg", "Weight (kg)")}
                {text("spec.case", "Case")}
                {text("spec.serial", "Serial number", { hint: "Kept private." })}
              </div>
              {area("spec.mods", "Modifications")}
            </fieldset>

            <div className="sticky bottom-0 -mx-4 flex items-center gap-4 bg-grey-100/95 px-4 py-3">
              <button type="submit" disabled={pending} className={primaryButton}>
                {pending ? "Saving…" : creating ? "Create draft" : "Save changes"}
              </button>
            </div>
          </>
        );
      }}
    </ActionForm>
  );
}
