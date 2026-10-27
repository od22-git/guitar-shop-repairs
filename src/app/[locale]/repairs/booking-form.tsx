"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";

import { Turnstile } from "@/components/turnstile";
import { buttonClass } from "@/components/ui/button";
import {
  Checkbox,
  Field,
  FieldError,
  fieldProps,
  formAlertClass,
  inputClass,
  OptionCard,
  selectClass,
} from "@/components/ui/field";

import { bookRepairAction, type BookingState } from "./actions";

export type BookingLabels = {
  name: string;
  phone: string;
  phoneHint: string;
  instrumentHeading: string;
  instrumentBrand: string;
  instrumentModel: string;
  optional: string;
  issue: string;
  issueHint: string;
  intakeMethod: string;
  drop_off: string;
  courier: string;
  emirate: string;
  chooseEmirate: string;
  consent: string;
  honeypot: string;
  submit: string;
  sending: string;
  errors: Record<"required" | "too_long" | "phone" | "consent", string>;
  fixErrors: string;
  spam: string;
  rateLimited: string;
  sentHeading: string;
  sentBody: string;
};

type Props = {
  labels: BookingLabels;
  emirates: { value: string; label: string }[];
  locale: "en" | "ar";
  turnstileSiteKey: string;
};

/**
 * Book a repair. Submits without React's automatic form reset, so typed values survive
 * an error; on success the form is replaced by a thank-you note.
 */
export function BookingForm({ labels, emirates, locale, turnstileSiteKey }: Props) {
  const [state, formAction, pending] = useActionState<BookingState, FormData>(bookRepairAction, {
    status: "idle",
  });
  const [courier, setCourier] = useState(false);
  const done = useRef<HTMLDivElement>(null);
  const summary = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (state.status === "sent") done.current?.focus();
    else if (state.status !== "idle") summary.current?.focus();
  }, [state]);

  if (state.status === "sent") {
    return (
      <div
        ref={done}
        tabIndex={-1}
        role="status"
        className="border-t-4 border-black pt-6 focus:outline-none"
      >
        <h3 className="text-title font-extrabold font-stretch-semi-expanded rtl:leading-[1.4]">
          {labels.sentHeading}
        </h3>
        <p className="mt-3 max-w-[50ch] text-lg">{labels.sentBody}</p>
      </div>
    );
  }

  const errors = state.status === "invalid" ? state.errors : {};
  const error = (name: string) => {
    const problem = errors[name];
    return problem ? labels.errors[problem] : undefined;
  };
  const message =
    state.status === "invalid"
      ? labels.fixErrors
      : state.status === "spam"
        ? labels.spam
        : state.status === "rate_limited"
          ? labels.rateLimited
          : null;
  const optional = (label: string) => (
    <>
      {label} <span className="font-normal text-grey-600">({labels.optional})</span>
    </>
  );

  return (
    <form
      noValidate
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        startTransition(() => formAction(form));
      }}
    >
      <p ref={summary} tabIndex={-1} role="alert" className={formAlertClass}>
        {message}
      </p>
      <input type="hidden" name="locale" value={locale} />
      {/* A honeypot: hidden from people and screen readers, filled in by bots. */}
      <div aria-hidden="true" className="absolute -start-[9999px] size-px overflow-hidden">
        <label>
          {labels.honeypot}
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <Field label={labels.name} name="name" error={error("name")}>
        <input
          {...fieldProps("name", error("name"))}
          autoComplete="name"
          maxLength={120}
          className={inputClass}
        />
      </Field>
      <Field label={labels.phone} name="phone" error={error("phone")} hint={labels.phoneHint}>
        <input
          {...fieldProps("phone", error("phone"), true)}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          dir="ltr"
          maxLength={40}
          className={`${inputClass} text-start rtl:text-end`}
        />
      </Field>

      <fieldset className="flex flex-col gap-6 border-t border-black pt-6">
        <legend className="float-start mb-2 w-full text-title font-extrabold font-stretch-semi-expanded rtl:leading-[1.4]">
          {labels.instrumentHeading}
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={optional(labels.instrumentBrand)}
            name="instrumentBrand"
            error={error("instrumentBrand")}
          >
            <input
              {...fieldProps("instrumentBrand", error("instrumentBrand"))}
              maxLength={80}
              className={inputClass}
            />
          </Field>
          <Field
            label={optional(labels.instrumentModel)}
            name="instrumentModel"
            error={error("instrumentModel")}
          >
            <input
              {...fieldProps("instrumentModel", error("instrumentModel"))}
              maxLength={80}
              className={inputClass}
            />
          </Field>
        </div>
        <Field label={labels.issue} name="issue" error={error("issue")} hint={labels.issueHint}>
          <textarea
            {...fieldProps("issue", error("issue"), true)}
            rows={4}
            maxLength={2000}
            className={inputClass}
          />
        </Field>
      </fieldset>

      <fieldset
        className="flex flex-col gap-2"
        aria-describedby={error("intakeMethod") ? "intakeMethod-error" : undefined}
      >
        <legend className="mb-2 font-bold">{labels.intakeMethod}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {(["drop_off", "courier"] as const).map((value) => (
            <OptionCard
              key={value}
              name="intakeMethod"
              value={value}
              defaultChecked={value === "drop_off"}
              onChange={() => setCourier(value === "courier")}
              label={labels[value]}
            />
          ))}
        </div>
        {error("intakeMethod") && (
          <FieldError name="intakeMethod">{error("intakeMethod")}</FieldError>
        )}
      </fieldset>
      {courier && (
        <Field label={labels.emirate} name="emirate" error={error("emirate")}>
          <select
            {...fieldProps("emirate", error("emirate"))}
            defaultValue=""
            className={selectClass}
          >
            <option value="" disabled>
              {labels.chooseEmirate}
            </option>
            {emirates.map((emirate) => (
              <option key={emirate.value} value={emirate.value}>
                {emirate.label}
              </option>
            ))}
          </select>
        </Field>
      )}

      <div className="flex flex-col gap-1">
        <Checkbox
          name="whatsappConsent"
          label={labels.consent}
          aria-invalid={error("whatsappConsent") ? true : undefined}
          aria-describedby={error("whatsappConsent") ? "whatsappConsent-error" : undefined}
        />
        {error("whatsappConsent") && (
          <FieldError name="whatsappConsent">{error("whatsappConsent")}</FieldError>
        )}
      </div>

      <Turnstile
        siteKey={turnstileSiteKey}
        locale={locale}
        resetKey={state.status === "idle" ? 0 : state.at}
      />

      <button
        type="submit"
        disabled={pending}
        className={`${buttonClass("primary")} max-sm:w-full sm:self-start`}
      >
        {pending ? labels.sending : labels.submit}
      </button>
    </form>
  );
}
