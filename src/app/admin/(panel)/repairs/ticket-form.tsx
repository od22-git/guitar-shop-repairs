"use client";

import { ActionForm } from "../../_components/action-form";
import type { ActionState } from "../../_components/action-state";
import { describedBy, Field, inputClass, primaryButton } from "../../_components/form";

type Props = {
  action: (state: ActionState, form: FormData) => Promise<ActionState>;
  /** Current values as form strings. */
  values: Record<string, string>;
  /** A new ticket also asks for the customer and the intake. */
  creating: boolean;
};

const checkboxClass = "size-6 shrink-0 accent-fiesta";

export function TicketForm({ action, values, creating }: Props) {
  return (
    <ActionForm action={action} className="flex flex-col gap-6">
      {(pending, state) => {
        const e = state.errors ?? {};
        const text = (
          name: string,
          label: string,
          extra: { hint?: string; type?: string; inputMode?: "tel"; autoComplete?: string } = {},
        ) => (
          <Field label={label} name={name} error={e[name]} hint={extra.hint}>
            <input
              {...describedBy(name, e[name], !!extra.hint)}
              defaultValue={values[name]}
              type={extra.type ?? "text"}
              inputMode={extra.inputMode}
              autoComplete={extra.autoComplete ?? "off"}
              className={inputClass}
            />
          </Field>
        );
        const area = (name: string, label: string, hint?: string) => (
          <Field label={label} name={name} error={e[name]} hint={hint}>
            <textarea
              {...describedBy(name, e[name], !!hint)}
              defaultValue={values[name]}
              rows={3}
              className={inputClass}
            />
          </Field>
        );
        const tick = (name: string, label: string) => (
          <div className="flex flex-col gap-1">
            <label className="flex min-h-11 items-center gap-3">
              <input
                type="checkbox"
                name={name}
                defaultChecked={values[name] === "on"}
                aria-invalid={e[name] ? true : undefined}
                aria-describedby={e[name] ? `${name}-error` : undefined}
                className={checkboxClass}
              />
              <span>{label}</span>
            </label>
            {e[name] && (
              <p id={`${name}-error`} className="text-sm font-medium text-fiesta-deep">
                {e[name]}
              </p>
            )}
          </div>
        );
        const radios = (name: string, legend: string, choices: [string, string][]) => (
          <fieldset className="flex flex-col gap-1">
            <legend className="mb-1 font-medium">{legend}</legend>
            <div className="flex flex-wrap gap-x-6">
              {choices.map(([value, label]) => (
                <label key={value} className="flex min-h-11 items-center gap-2">
                  <input
                    type="radio"
                    name={name}
                    value={value}
                    defaultChecked={values[name] === value}
                    className={checkboxClass}
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
        );

        return (
          <>
            {creating && (
              <section
                aria-labelledby="customer-heading"
                className="flex flex-col gap-4 rounded-lg bg-paper p-4 sm:p-6"
              >
                <h2 id="customer-heading" className="text-lg font-bold">
                  Customer
                </h2>
                {text("phone", "Mobile number", {
                  type: "tel",
                  inputMode: "tel",
                  hint: "Their WhatsApp number. Local (050…) or with a country code.",
                })}
                {text("name", "Name")}
                {radios("preferredLocale", "Messages in", [
                  ["en", "English"],
                  ["ar", "Arabic"],
                ])}
                {tick("whatsappConsent", "Agrees to updates on WhatsApp")}
              </section>
            )}

            <section
              aria-labelledby="instrument-heading"
              className="flex flex-col gap-4 rounded-lg bg-paper p-4 sm:p-6"
            >
              <h2 id="instrument-heading" className="text-lg font-bold">
                Instrument
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {text("instrumentBrand", "Brand")}
                {text("instrumentModel", "Model")}
                {text("serial", "Serial number")}
                {text("colour", "Colour")}
              </div>
              {area("issue", "What needs doing")}
              {area(
                "intakeNotes",
                "Condition at intake",
                "Dings, cracks, worn frets: anything already there.",
              )}
              {text("accessories", "Received with it", { hint: "Case, strap, cables…" })}
              {text("etaDate", "Expected ready by", { type: "date" })}
            </section>

            {creating && (
              <section
                aria-labelledby="intake-heading"
                className="flex flex-col gap-4 rounded-lg bg-paper p-4 sm:p-6"
              >
                <h2 id="intake-heading" className="text-lg font-bold">
                  Intake
                </h2>
                {radios("intakeMethod", "How it arrived", [
                  ["drop_off", "Drop-off"],
                  ["courier", "Courier"],
                ])}
                {tick("termsAccepted", "The customer accepted the repair terms")}
              </section>
            )}

            <button type="submit" disabled={pending} className={`${primaryButton} self-start`}>
              {pending ? "Saving…" : creating ? "Open ticket" : "Save details"}
            </button>
          </>
        );
      }}
    </ActionForm>
  );
}
