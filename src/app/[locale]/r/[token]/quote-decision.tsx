"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";

import { buttonClass } from "@/components/ui/button";
import { Checkbox, FieldError, formAlertClass } from "@/components/ui/field";

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
      <p role="status" className="text-lg font-bold">
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
          <Checkbox
            name="acceptTerms"
            label={labels.acceptTerms}
            aria-invalid={state.status === "needs_terms" ? true : undefined}
            aria-describedby={state.status === "needs_terms" ? "acceptTerms-error" : undefined}
          />
          {state.status === "needs_terms" && (
            <FieldError name="acceptTerms">{labels.needsTerms}</FieldError>
          )}
        </div>
      )}
      <div ref={status} tabIndex={-1} role="alert" className={formAlertClass}>
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
          className={buttonClass("primary")}
        >
          {pending ? labels.sending : labels.approve}
        </button>
        <button
          type="submit"
          name="decision"
          value="declined"
          disabled={pending}
          className={buttonClass("secondary")}
        >
          {labels.decline}
        </button>
      </div>
    </form>
  );
}
