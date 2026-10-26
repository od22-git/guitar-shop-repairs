"use client";

import { ActionForm } from "../../../_components/action-form";
import { describedBy, Field, inputClass, secondaryButton } from "../../../_components/form";
import { postUpdateAction } from "../actions";

/** Post update: a note with no status change, e.g. waiting for parts, with a new ETA. */
export function UpdateForm({ ticketId }: { ticketId: number }) {
  return (
    <section aria-labelledby="update-heading" className="rounded-lg bg-paper p-4 sm:p-6">
      <h2 id="update-heading" className="mb-4 text-lg font-bold">
        Post update
      </h2>
      <ActionForm action={postUpdateAction.bind(null, ticketId)} className="flex flex-col gap-4">
        {(pending, state) => {
          const e = state.errors ?? {};
          // A fresh form after each success.
          return (
            <div key={state.ok ? state.at : "form"} className="flex flex-col gap-4">
              <Field
                label="Note for the customer"
                name="publicNote"
                error={e.publicNote}
                hint="Sent on WhatsApp and shown on their tracking page. Write it in their language."
              >
                <textarea
                  {...describedBy("publicNote", e.publicNote, true)}
                  dir="auto"
                  rows={3}
                  className={inputClass}
                />
              </Field>
              <Field
                label="Internal note"
                name="internalNote"
                error={e.internalNote}
                hint="Only you see this."
              >
                <textarea
                  {...describedBy("internalNote", e.internalNote, true)}
                  rows={2}
                  className={inputClass}
                />
              </Field>
              <Field label="New ETA" name="update-eta" error={e.etaDate}>
                <input
                  {...describedBy("update-eta", e.etaDate)}
                  name="etaDate"
                  type="date"
                  className={`${inputClass} sm:w-56`}
                />
              </Field>
              <button type="submit" disabled={pending} className={`${secondaryButton} self-start`}>
                {pending ? "Posting…" : "Post update"}
              </button>
            </div>
          );
        }}
      </ActionForm>
    </section>
  );
}
