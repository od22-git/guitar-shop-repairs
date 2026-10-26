"use client";

import { ActionForm } from "../../_components/action-form";
import { describedBy, Field, inputClass, primaryButton } from "../../_components/form";

import { saveVatAction, saveWhatsAppAction, saveZoneAction } from "./actions";

const checkboxClass = "size-6 shrink-0 accent-fiesta";

export function WhatsAppForm({ value }: { value: string }) {
  return (
    <ActionForm action={saveWhatsAppAction} className="flex flex-wrap items-end gap-3">
      {(pending, state) => (
        <>
          <div className="min-w-56 flex-1">
            <Field
              label="Shop WhatsApp number"
              name="whatsappNumber"
              error={state.errors?.whatsappNumber}
              hint="Every WhatsApp button on the site opens a chat with it."
            >
              <input
                {...describedBy("whatsappNumber", state.errors?.whatsappNumber, true)}
                type="tel"
                inputMode="tel"
                defaultValue={value}
                dir="ltr"
                className={inputClass}
              />
            </Field>
          </div>
          <button type="submit" disabled={pending} className={primaryButton}>
            {pending ? "Saving…" : "Save number"}
          </button>
        </>
      )}
    </ActionForm>
  );
}

export function VatForm({ enabled, trn }: { enabled: boolean; trn: string }) {
  return (
    <ActionForm action={saveVatAction} className="flex flex-col gap-4">
      {(pending, state) => (
        <>
          <label className="flex min-h-11 items-center gap-3">
            <input
              type="checkbox"
              name="vatEnabled"
              defaultChecked={enabled}
              className={checkboxClass}
            />
            The shop is VAT-registered
          </label>
          <Field
            label="TRN (Tax Registration Number)"
            name="trn"
            error={state.errors?.trn}
            hint="15 digits, from the FTA. Printed on tax invoices."
          >
            <input
              {...describedBy("trn", state.errors?.trn, true)}
              inputMode="numeric"
              defaultValue={trn}
              dir="ltr"
              className={`${inputClass} max-w-xs tabular-nums`}
            />
          </Field>
          <button type="submit" disabled={pending} className={`${primaryButton} self-start`}>
            {pending ? "Saving…" : "Save VAT"}
          </button>
        </>
      )}
    </ActionForm>
  );
}

export function ZoneForm({
  zone,
}: {
  zone: { id: number; name: string; emirates: string; fee: string; active: boolean };
}) {
  const fee = `zone-${zone.id}-fee`;
  return (
    <ActionForm
      action={saveZoneAction.bind(null, zone.id)}
      className="flex flex-wrap items-end gap-3 border-b border-mist pb-4"
    >
      {(pending, state) => (
        <>
          <div className="min-w-48 flex-1">
            <p className="font-medium">{zone.name}</p>
            <p className="text-sm text-ink-muted">{zone.emirates}</p>
          </div>
          <Field label={`${zone.name} fee (AED)`} name={fee} error={state.errors?.fee}>
            <input
              {...describedBy(fee, state.errors?.fee)}
              name="fee"
              inputMode="decimal"
              defaultValue={zone.fee}
              className={`${inputClass} w-28 tabular-nums`}
            />
          </Field>
          <label className="flex min-h-11 items-center gap-2">
            <input
              type="checkbox"
              name="active"
              defaultChecked={zone.active}
              className={checkboxClass}
            />
            Delivers<span className="sr-only"> to {zone.name}</span>
          </label>
          <button type="submit" disabled={pending} className={primaryButton}>
            {pending ? "Saving…" : "Save"}
            <span className="sr-only"> {zone.name}</span>
          </button>
        </>
      )}
    </ActionForm>
  );
}
