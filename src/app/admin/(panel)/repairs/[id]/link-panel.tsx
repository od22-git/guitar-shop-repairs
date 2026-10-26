"use client";

import { ActionForm } from "../../../_components/action-form";
import { secondaryButton } from "../../../_components/form";
import { rotateLinkAction } from "../actions";

/** The customer's private tracking link, and replacing it if it leaked. */
export function LinkPanel({ ticketId, url }: { ticketId: number; url: string }) {
  return (
    <section
      aria-labelledby="link-heading"
      className="flex flex-col gap-3 rounded-lg bg-paper p-4 sm:p-6"
    >
      <h2 id="link-heading" className="text-lg font-bold">
        Tracking link
      </h2>
      <p
        dir="ltr"
        className="rounded-md bg-mist p-3 font-mono text-sm break-all"
        data-testid="tracking-url"
      >
        {url}
      </p>
      <p className="text-ink-muted">
        It goes out with each message. If it was shared with someone else, make a new one: the old
        link stops working at once.
      </p>
      <ActionForm
        action={rotateLinkAction.bind(null, ticketId)}
        confirm="Make a new link? The old one stops working, so send the customer the new one."
        className="flex flex-wrap items-center gap-3"
      >
        {(pending) => (
          <button type="submit" disabled={pending} className={secondaryButton}>
            {pending ? "Making…" : "Make a new link"}
          </button>
        )}
      </ActionForm>
    </section>
  );
}
