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
  selectClass,
} from "@/components/ui/field";
import { Link } from "@/i18n/navigation";
import type { SellProblem } from "@/lib/inbox";
import { shrinkPhoto } from "@/lib/photo-shrink";

import { sellAction, type SellState } from "./actions";

export type SellLabels = {
  name: string;
  phone: string;
  phoneHint: string;
  guitarHeading: string;
  brand: string;
  model: string;
  year: string;
  serial: string;
  serialHint: string;
  condition: string;
  chooseCondition: string;
  conditionHint: string;
  askingPrice: string;
  askingPriceHint: string;
  description: string;
  descriptionHint: string;
  optional: string;
  photosHeading: string;
  photosHint: string;
  addPhotos: string;
  removePhoto: string;
  photoAlt: string;
  uploading: string;
  uploadingButton: string;
  photoProblems: Record<
    "unsupported_format" | "not_an_image" | "too_large" | "rate_limited" | "failed",
    string
  >;
  tooManyPhotos: string;
  ownership: string;
  consent: string;
  honeypot: string;
  submit: string;
  sending: string;
  errors: Record<SellProblem, string>;
  fixErrors: string;
  spam: string;
  rateLimited: string;
  photosExpired: string;
  sentHeading: string;
  sentBody: string;
};

type Props = {
  labels: SellLabels;
  conditions: { value: string; label: string }[];
  maxPhotos: number;
  locale: "en" | "ar";
  turnstileSiteKey: string;
};

type Photo = { id: number; preview: string; token?: string };

/** `{n}` in a label. */
const fill = (label: string, values: Record<string, string | number>) =>
  label.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));

/**
 * Sell us your guitar. Each photo uploads as soon as it's picked and comes back as a
 * signed token, sent with the form. Submits without React's automatic form reset, so
 * typed values survive an error; on success the form is replaced by a thank-you note.
 */
export function SellForm({ labels, conditions, maxPhotos, locale, turnstileSiteKey }: Props) {
  const [state, formAction, pending] = useActionState<SellState, FormData>(sellAction, {
    status: "idle",
  });
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photoStatus, setPhotoStatus] = useState("");
  const [uploading, setUploading] = useState(false);
  const nextId = useRef(0);
  const picker = useRef<HTMLInputElement>(null);
  const done = useRef<HTMLDivElement>(null);
  const summary = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (state.status === "sent") done.current?.focus();
    else if (state.status !== "idle") summary.current?.focus();
  }, [state]);
  // Expired photos can't be sent again: they have to be picked again.
  const [expiredAt, setExpiredAt] = useState(0);
  if (state.status === "photos_expired" && state.at !== expiredAt) {
    setExpiredAt(state.at);
    setPhotos([]);
  }

  async function upload(files: File[]) {
    const room = maxPhotos - photos.length;
    const chosen = files.slice(0, room);
    const problems: string[] =
      files.length > room ? [fill(labels.tooManyPhotos, { max: maxPhotos })] : [];
    setUploading(true);
    for (const [index, file] of chosen.entries()) {
      setPhotoStatus(fill(labels.uploading, { n: index + 1, total: chosen.length }));
      const body = new FormData();
      body.set("file", await shrinkPhoto(file), file.name);
      const response = await fetch("/api/upload/sell", { method: "POST", body }).catch(() => null);
      const result = response
        ? ((await response.json().catch(() => ({}))) as { token?: string; error?: string })
        : {};
      if (response?.ok && result.token) {
        const photo = {
          id: nextId.current++,
          preview: URL.createObjectURL(file),
          token: result.token,
        };
        setPhotos((current) => [...current, photo]);
      } else {
        const code = result.error as keyof SellLabels["photoProblems"] | undefined;
        problems.push(
          fill(labels.photoProblems[code && code in labels.photoProblems ? code : "failed"], {
            file: file.name,
          }),
        );
      }
    }
    setUploading(false);
    setPhotoStatus(problems.join(" "));
    if (picker.current) picker.current.value = "";
  }

  function remove(photo: Photo) {
    URL.revokeObjectURL(photo.preview);
    setPhotos((current) => current.filter((p) => p.id !== photo.id));
  }

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
          : state.status === "photos_expired"
            ? labels.photosExpired
            : null;
  const optional = (label: string) => (
    <>
      {label} <span className="font-normal text-grey-600">({labels.optional})</span>
    </>
  );
  const photoError = photos.length === 0 ? error("photos") : undefined;

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

      {/* Side by side on wide screens, so the form fills the width. */}
      <div className="grid items-start gap-6 sm:grid-cols-2">
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
      </div>

      <fieldset className="flex flex-col gap-6 border-t border-black pt-6">
        <legend className="float-start mb-2 w-full text-title font-extrabold font-stretch-semi-expanded rtl:leading-[1.4]">
          {labels.guitarHeading}
        </legend>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field label={labels.brand} name="brand" error={error("brand")}>
            <input {...fieldProps("brand", error("brand"))} maxLength={80} className={inputClass} />
          </Field>
          <Field label={optional(labels.model)} name="model" error={error("model")}>
            <input {...fieldProps("model", error("model"))} maxLength={80} className={inputClass} />
          </Field>
          <Field label={optional(labels.year)} name="year" error={error("year")}>
            <input
              {...fieldProps("year", error("year"))}
              inputMode="numeric"
              dir="ltr"
              maxLength={4}
              className={`${inputClass} text-start rtl:text-end`}
            />
          </Field>
          <Field
            label={optional(labels.serial)}
            name="serial"
            error={error("serial")}
            hint={labels.serialHint}
          >
            <input
              {...fieldProps("serial", error("serial"), true)}
              dir="ltr"
              autoComplete="off"
              maxLength={60}
              className={`${inputClass} text-start rtl:text-end`}
            />
          </Field>
          <Field
            label={labels.condition}
            name="condition"
            error={error("condition")}
            hint={
              // A new tab, so what's typed here stays.
              <Link
                href="/faq#condition"
                target="_blank"
                className="underline decoration-blue underline-offset-4 hover:decoration-black"
              >
                {labels.conditionHint}
              </Link>
            }
          >
            <select
              {...fieldProps("condition", error("condition"), true)}
              defaultValue=""
              className={selectClass}
            >
              <option value="" disabled>
                {labels.chooseCondition}
              </option>
              {conditions.map((condition) => (
                <option key={condition.value} value={condition.value}>
                  {condition.label}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label={optional(labels.askingPrice)}
            name="askingPrice"
            error={error("askingPrice")}
            hint={labels.askingPriceHint}
          >
            <input
              {...fieldProps("askingPrice", error("askingPrice"), true)}
              inputMode="decimal"
              dir="ltr"
              maxLength={12}
              className={`${inputClass} text-start rtl:text-end`}
            />
          </Field>
        </div>
        <Field
          label={labels.description}
          name="description"
          error={error("description")}
          hint={labels.descriptionHint}
        >
          <textarea
            {...fieldProps("description", error("description"), true)}
            rows={4}
            maxLength={2000}
            className={inputClass}
          />
        </Field>
      </fieldset>

      <fieldset
        className="flex flex-col gap-3 border-t border-black pt-6"
        aria-describedby={`photos-hint${photoError ? " photos-error" : ""}`}
      >
        <legend className="float-start w-full text-title font-extrabold font-stretch-semi-expanded rtl:leading-[1.4]">
          {labels.photosHeading}
        </legend>
        <p id="photos-hint" className="text-sm text-grey-600">
          {fill(labels.photosHint, { max: maxPhotos })}
        </p>
        {photos.length > 0 && (
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {photos.map((photo, index) => (
              <li key={photo.id} className="relative">
                {/* A local preview of the picked file (a blob: URL). */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.preview}
                  alt={fill(labels.photoAlt, { n: index + 1 })}
                  className="aspect-square w-full bg-grey-100 object-cover"
                />
                <input type="hidden" name="photo" value={photo.token} />
                <button
                  type="button"
                  onClick={() => remove(photo)}
                  className="mt-1 min-h-11 w-full border border-black px-2 text-sm font-bold hover:bg-black hover:text-white"
                >
                  {labels.removePhoto}
                  <span className="sr-only"> {index + 1}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {photos.length < maxPhotos && (
          <label
            htmlFor="sell-photos"
            className={`${buttonClass("secondary")} cursor-pointer self-start has-focus-visible:outline-3 has-focus-visible:outline-offset-3 has-focus-visible:outline-blue`}
          >
            {uploading ? labels.uploadingButton : labels.addPhotos}
            <input
              ref={picker}
              id="sell-photos"
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              disabled={uploading}
              className="sr-only"
              onChange={(event) => {
                const files = Array.from(event.target.files ?? []);
                if (files.length > 0) void upload(files);
              }}
            />
          </label>
        )}
        <p role="status" className="text-sm text-grey-600 empty:hidden">
          {photoStatus}
        </p>
        {photoError && <FieldError name="photos">{photoError}</FieldError>}
      </fieldset>

      <div className="flex flex-col gap-1 border-t border-black pt-4">
        <Checkbox
          name="ownership"
          label={labels.ownership}
          aria-invalid={error("ownership") ? true : undefined}
          aria-describedby={error("ownership") ? "ownership-error" : undefined}
        />
        {error("ownership") && <FieldError name="ownership">{error("ownership")}</FieldError>}
      </div>
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
        disabled={pending || uploading}
        className={`${buttonClass("primary")} max-sm:w-full sm:self-start`}
      >
        {pending ? labels.sending : labels.submit}
      </button>
    </form>
  );
}
