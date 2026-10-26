"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";

import {
  checkClass,
  FieldError,
  fieldProps,
  FormField,
  inputClass,
  submitClass,
} from "@/components/form-parts";
import { Turnstile } from "@/components/turnstile";

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
      <div ref={done} tabIndex={-1} role="status" className="focus:outline-none">
        <h3 className="text-xl font-bold">{labels.sentHeading}</h3>
        <p className="mt-2">{labels.sentBody}</p>
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
      {label} <span className="font-normal text-ink-muted">({labels.optional})</span>
    </>
  );

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        startTransition(() => formAction(form));
      }}
    >
      <p
        ref={summary}
        tabIndex={-1}
        role="alert"
        className="font-semibold text-fiesta-deep empty:hidden focus:outline-none"
      >
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

      <FormField label={labels.name} name="name" error={error("name")}>
        <input
          {...fieldProps("name", error("name"))}
          autoComplete="name"
          maxLength={120}
          className={inputClass}
        />
      </FormField>
      <FormField label={labels.phone} name="phone" error={error("phone")} hint={labels.phoneHint}>
        <input
          {...fieldProps("phone", error("phone"), true)}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          dir="ltr"
          maxLength={40}
          className={`${inputClass} rtl:text-end`}
        />
      </FormField>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-1 text-lg font-bold">{labels.instrumentHeading}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label={optional(labels.instrumentBrand)}
            name="instrumentBrand"
            error={error("instrumentBrand")}
          >
            <input
              {...fieldProps("instrumentBrand", error("instrumentBrand"))}
              maxLength={80}
              className={inputClass}
            />
          </FormField>
          <FormField
            label={optional(labels.instrumentModel)}
            name="instrumentModel"
            error={error("instrumentModel")}
          >
            <input
              {...fieldProps("instrumentModel", error("instrumentModel"))}
              maxLength={80}
              className={inputClass}
            />
          </FormField>
        </div>
        <FormField label={labels.issue} name="issue" error={error("issue")} hint={labels.issueHint}>
          <textarea
            {...fieldProps("issue", error("issue"), true)}
            rows={4}
            maxLength={2000}
            className={inputClass}
          />
        </FormField>
      </fieldset>

      <fieldset
        className="flex flex-col gap-1"
        aria-describedby={error("intakeMethod") ? "intakeMethod-error" : undefined}
      >
        <legend className="mb-1 font-semibold">{labels.intakeMethod}</legend>
        {(["drop_off", "courier"] as const).map((value) => (
          <label key={value} className="flex min-h-11 items-center gap-3">
            <input
              type="radio"
              name="intakeMethod"
              value={value}
              defaultChecked={value === "drop_off"}
              onChange={() => setCourier(value === "courier")}
              className={checkClass}
            />
            {labels[value]}
          </label>
        ))}
        {error("intakeMethod") && (
          <FieldError name="intakeMethod">{error("intakeMethod")}</FieldError>
        )}
      </fieldset>
      {courier && (
        <FormField label={labels.emirate} name="emirate" error={error("emirate")}>
          <select
            {...fieldProps("emirate", error("emirate"))}
            defaultValue=""
            className={inputClass}
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
        </FormField>
      )}

      <div className="flex flex-col gap-1">
        <label className="flex min-h-11 items-center gap-3">
          <input
            type="checkbox"
            name="whatsappConsent"
            aria-invalid={error("whatsappConsent") ? true : undefined}
            aria-describedby={error("whatsappConsent") ? "whatsappConsent-error" : undefined}
            className={checkClass}
          />
          <span>{labels.consent}</span>
        </label>
        {error("whatsappConsent") && (
          <FieldError name="whatsappConsent">{error("whatsappConsent")}</FieldError>
        )}
      </div>

      <Turnstile
        siteKey={turnstileSiteKey}
        locale={locale}
        resetKey={state.status === "idle" ? 0 : state.at}
      />

      <button type="submit" disabled={pending} className={`${submitClass} self-start`}>
        {pending ? labels.sending : labels.submit}
      </button>
    </form>
  );
}
