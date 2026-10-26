"use client";

import Link from "next/link";
import { startTransition } from "react";

import type { InboxStatus } from "@/lib/db/schema";

import { ActionForm } from "../../../_components/action-form";
import { primaryButton, secondaryButton } from "../../../_components/form";
import { setInboxStatusAction } from "../actions";

// Reply on WhatsApp (marks it replied), convert a repair booking into a ticket once the
// instrument arrives, or archive it.
export function ItemActions({
  id,
  status,
  replyHref,
  convertHref,
}: {
  id: number;
  status: InboxStatus;
  replyHref: string;
  /** The prefilled new-ticket form, for a repair booking without a ticket yet. */
  convertHref: string | null;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <a
          href={replyHref}
          target="_blank"
          rel="noopener"
          className={primaryButton}
          onClick={() => {
            if (status === "new") startTransition(() => void setInboxStatusAction(id, "replied"));
          }}
        >
          Reply on WhatsApp
        </a>
        {convertHref && (
          <Link href={convertHref} className={secondaryButton}>
            Convert to ticket
          </Link>
        )}
      </div>
      {status !== "converted" && (
        <ActionForm
          action={setInboxStatusAction.bind(null, id, status === "archived" ? "new" : "archived")}
          className="flex flex-wrap items-center gap-3"
        >
          {(pending) => (
            <button type="submit" disabled={pending} className={`${secondaryButton} self-start`}>
              {status === "archived" ? "Move back to new" : "Archive"}
            </button>
          )}
        </ActionForm>
      )}
    </div>
  );
}
