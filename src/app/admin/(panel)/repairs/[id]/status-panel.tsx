"use client";

import { useState } from "react";

import type { RepairCloseReason, RepairStatus } from "@/lib/db/schema";
import type { MoveProblem } from "@/lib/repairs/state-machine";

import { ActionForm } from "../../../_components/action-form";
import type { ActionState } from "../../../_components/action-state";
import { inputClass, primaryButton, secondaryButton } from "../../../_components/form";
import { moveTicketAction, undoStatusAction } from "../actions";
import { blockedLabels, closeReasonLabels, moveLabels, statusLabels } from "../labels";

type Props = {
  ticketId: number;
  status: RepairStatus;
  moves: { to: RepairStatus; problem: MoveProblem | null }[];
  closeReasons: RepairCloseReason[];
  /** Where Undo would go, if there's a change to undo. */
  undoTo: RepairStatus | null;
};

const row = "flex flex-wrap items-end gap-3";

export function StatusPanel({ ticketId, status, moves, closeReasons, undoTo }: Props) {
  // One message for the panel: the form that sent it is gone after the change.
  const [result, setResult] = useState<ActionState>({});
  const forward = moves.filter((move) => move.to !== "closed");
  const close = moves.find((move) => move.to === "closed");

  return (
    <section
      aria-labelledby="status-heading"
      className="flex flex-col gap-5 rounded-lg bg-white p-4 sm:p-6"
    >
      <div>
        <h2 id="status-heading" className="text-lg font-bold">
          Status
        </h2>
        <p className="text-grey-600">Now: {statusLabels[status]}</p>
      </div>

      {forward.length > 0 && (
        <ul className="flex flex-col gap-3">
          {forward.map((move, index) => (
            <li key={move.to}>
              {move.problem ? (
                <p className="text-grey-600">
                  {moveLabels[move.to]}: {blockedLabels[move.problem].toLowerCase()}
                </p>
              ) : (
                <ActionForm
                  announce={setResult}
                  action={moveTicketAction.bind(null, ticketId, status, move.to)}
                  className={row}
                >
                  {(pending) => (
                    <button
                      type="submit"
                      disabled={pending}
                      className={index === 0 ? primaryButton : secondaryButton}
                    >
                      {pending ? "Saving…" : moveLabels[move.to]}
                    </button>
                  )}
                </ActionForm>
              )}
            </li>
          ))}
        </ul>
      )}

      {close && (
        <ActionForm
          announce={setResult}
          action={moveTicketAction.bind(null, ticketId, status, "closed")}
          confirm="Close this ticket?"
          className={row}
        >
          {(pending) => (
            <>
              <div className="flex min-w-48 flex-col gap-1">
                <label htmlFor="close-reason" className="text-sm font-medium">
                  Close as
                </label>
                <select id="close-reason" name="closeReason" className={inputClass}>
                  {closeReasons.map((reason) => (
                    <option key={reason} value={reason}>
                      {closeReasonLabels[reason]}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" disabled={pending} className={secondaryButton}>
                {pending ? "Closing…" : "Close ticket"}
              </button>
            </>
          )}
        </ActionForm>
      )}

      {undoTo && (
        <ActionForm
          announce={setResult}
          action={undoStatusAction.bind(null, ticketId)}
          confirm={`Undo the last status change, back to ${statusLabels[undoTo].toLowerCase()}?`}
          className={row}
        >
          {(pending) => (
            <button type="submit" disabled={pending} className={secondaryButton}>
              {pending
                ? "Undoing…"
                : `Undo last status (back to ${statusLabels[undoTo].toLowerCase()})`}
            </button>
          )}
        </ActionForm>
      )}

      <p role="status" className={result.ok === false ? "font-medium text-red" : "font-medium"}>
        {result.message}
      </p>
    </section>
  );
}
