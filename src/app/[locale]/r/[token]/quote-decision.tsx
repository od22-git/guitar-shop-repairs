"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";

import { checkClass, FieldError, submitClass } from "@/components/form-parts";

import { decideQuoteAction, type DecisionState } from "./actions";

export type DecisionLabels = {
  approve: string;
  decline: string;
  declineConfirm: string;
  sending: string;
  acceptTerms: string;
  needsTerms: string;
  stale: string;
  reload: string;
  approvedNow: string;
  declinedNow: string;
};

/**
 * Approve or decline the quote on the page. The version shown is sent with the answer,
 * so a quote that changed in the meantime is refused ("please reload").
 */
export function QuoteDecision({
  token,
  quote,
  needsTerms,
  labels,
}: {
  token: string;
  quote: { id: number; version: number };
  /** The terms weren't accepted at intake: approving accepts them. */
  needsTerms: boolean;
  labels: DecisionLabels;
}) {
  const [state, formAction, pending] = useActionState<DecisionState, FormData>(
    decideQuoteAction.bind(null, token, quote.id, quote.version),
    { status: "idle" },
  );
  const status = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state.status !== "idle") status.current?.focus();
  }, [state]);

  if (state.status === "approved" || state.status === "declined") {
    return (
      <p role="status" className="font-semibold">
        {state.status === "approved" ? labels.approvedNow : labels.declinedNow}
      </p>
    );
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const submitter = (event.nativeEvent as SubmitEvent).submitter;
        const form = new FormData(event.currentTarget, submitter);
        if (form.get("decision") === "declined" && !window.confirm(labels.declineConfirm)) return;
        startTransition(() => formAction(form));
      }}
    >
      {needsTerms && (
        <div className="flex flex-col gap-1">
          <label className="flex min-h-11 items-center gap-3">
            <input
              type="checkbox"
              name="acceptTerms"
              aria-invalid={state.status === "needs_terms" ? true : undefined}
              aria-describedby={state.status === "needs_terms" ? "acceptTerms-error" : undefined}
              className={checkClass}
            />
            <span className="font-semibold">{labels.acceptTerms}</span>
          </label>
          {state.status === "needs_terms" && (
            <FieldError name="acceptTerms">{labels.needsTerms}</FieldError>
          )}
        </div>
      )}
      <div
        ref={status}
        tabIndex={-1}
        role="alert"
        className="font-semibold text-fiesta-deep empty:hidden focus:outline-none"
      >
        {state.status === "stale" || state.status === "no_access" ? (
          <>
            {labels.stale}{" "}
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="underline underline-offset-4"
            >
              {labels.reload}
            </button>
          </>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          name="decision"
          value="approved"
          disabled={pending}
          className={submitClass}
        >
          {pending ? labels.sending : labels.approve}
        </button>
        <button
          type="submit"
          name="decision"
          value="declined"
          disabled={pending}
          className="inline-flex min-h-12 items-center justify-center rounded-sm border-2 border-ink px-6 font-semibold hover:bg-mist disabled:opacity-70"
        >
          {labels.decline}
        </button>
      </div>
    </form>
  );
}
