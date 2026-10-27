"use client";

import { useState } from "react";

import type { RepairQuoteStatus } from "@/lib/db/schema";

import { ActionForm } from "../../../_components/action-form";
import {
  describedBy,
  Field,
  inputClass,
  primaryButton,
  secondaryButton,
} from "../../../_components/form";
import { createQuoteAction, decideQuoteAction, setDiagnosisFeeAction } from "../actions";

type Props = {
  ticketId: number;
  canQuote: boolean;
  current: {
    id: number;
    version: number;
    status: RepairQuoteStatus;
    statusLabel: string;
    total: string;
    notes: string;
    decided: string | null;
    items: { label: string; amount: string; value: string }[];
  } | null;
  diagnosisFee: string | null;
  /** The fee as a form value, like "50.00", or "". */
  diagnosisFeeValue: string;
  older: { version: number; total: string; items: string[] }[];
};

const methods = (
  <>
    <option value="in_person">In person</option>
    <option value="whatsapp">On WhatsApp</option>
  </>
);

export function QuotePanel({
  ticketId,
  canQuote,
  current,
  diagnosisFee,
  diagnosisFeeValue,
  older,
}: Props) {
  const [writing, setWriting] = useState(false);

  return (
    <section
      aria-labelledby="quote-heading"
      className="flex flex-col gap-5 rounded-lg bg-white p-4 sm:p-6"
    >
      <h2 id="quote-heading" className="text-lg font-bold">
        Quote
      </h2>

      {current ? (
        <div className="flex flex-col gap-2">
          <p className="font-medium">
            Version {current.version}: {current.statusLabel}
          </p>
          <table className="w-full">
            <caption className="sr-only">Quote version {current.version}</caption>
            <tbody>
              {current.items.map((item, index) => (
                <tr key={index} className="border-b border-grey-300">
                  <td className="py-1">{item.label}</td>
                  <td className="py-1 text-end tabular-nums">{item.amount}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row" className="py-1 text-start">
                  Total
                </th>
                <td className="py-1 text-end font-bold tabular-nums">{current.total}</td>
              </tr>
            </tfoot>
          </table>
          {current.notes && <p className="whitespace-pre-line">{current.notes}</p>}
          {current.decided && <p className="text-grey-600">{current.decided}</p>}
          {current.status === "declined" && diagnosisFee && <p>Diagnosis fee: {diagnosisFee}</p>}
        </div>
      ) : (
        <p className="text-grey-600">No quote yet.</p>
      )}

      {current?.status === "declined" && (
        <ActionForm
          action={setDiagnosisFeeAction.bind(null, ticketId)}
          className="flex flex-wrap items-end gap-3 border-t border-grey-300 pt-4"
        >
          {(pending, state) => (
            <>
              <Field
                label="Diagnosis fee (AED)"
                name="diagnosisFee"
                error={state.errors?.diagnosisFee}
                hint="Charged under the repair terms. Leave blank for none."
              >
                <input
                  {...describedBy("diagnosisFee", state.errors?.diagnosisFee, true)}
                  defaultValue={diagnosisFeeValue}
                  inputMode="decimal"
                  className={`${inputClass} w-36 tabular-nums`}
                />
              </Field>
              <button type="submit" disabled={pending} className={secondaryButton}>
                Save fee
              </button>
            </>
          )}
        </ActionForm>
      )}

      {current?.status === "pending" && (
        <div className="flex flex-col gap-4 border-t border-grey-300 pt-4">
          <h3 className="font-bold">Record the customer’s answer</h3>
          <p className="text-grey-600">
            When they reply on WhatsApp or tell you in person. (They can also approve on the
            tracking link.)
          </p>
          <ActionForm
            action={decideQuoteAction.bind(null, current.id, current.version)}
            className="flex flex-wrap items-end gap-3"
          >
            {(pending) => (
              <>
                <input type="hidden" name="decision" value="approved" />
                <div className="flex flex-col gap-1">
                  <label htmlFor="approve-method" className="text-sm font-medium">
                    Approved
                  </label>
                  <select id="approve-method" name="method" className={inputClass}>
                    {methods}
                  </select>
                </div>
                <button type="submit" disabled={pending} className={primaryButton}>
                  Record approval
                </button>
              </>
            )}
          </ActionForm>
          <ActionForm
            action={decideQuoteAction.bind(null, current.id, current.version)}
            confirm="Record that the customer declined the quote?"
            className="flex flex-wrap items-end gap-3"
          >
            {(pending, state) => (
              <>
                <input type="hidden" name="decision" value="declined" />
                <div className="flex flex-col gap-1">
                  <label htmlFor="decline-method" className="text-sm font-medium">
                    Declined
                  </label>
                  <select id="decline-method" name="method" className={inputClass}>
                    {methods}
                  </select>
                </div>
                <Field
                  label="Diagnosis fee (AED)"
                  name="diagnosisFee"
                  error={state.errors?.diagnosisFee}
                >
                  <input
                    {...describedBy("diagnosisFee", state.errors?.diagnosisFee)}
                    inputMode="decimal"
                    placeholder="Optional"
                    className={`${inputClass} w-36 tabular-nums`}
                  />
                </Field>
                <button type="submit" disabled={pending} className={secondaryButton}>
                  Record decline
                </button>
              </>
            )}
          </ActionForm>
        </div>
      )}

      {canQuote &&
        (writing ? (
          <QuoteBuilder
            ticketId={ticketId}
            start={current?.items ?? []}
            notes={current?.notes ?? ""}
            next={(current?.version ?? 0) + 1}
            onDone={() => setWriting(false)}
          />
        ) : (
          <button
            type="button"
            className={`${current ? secondaryButton : primaryButton} self-start`}
            onClick={() => setWriting(true)}
          >
            {current ? "Write a new version" : "Write a quote"}
          </button>
        ))}

      {older.length > 0 && (
        <details>
          <summary className="cursor-pointer font-medium">Earlier versions</summary>
          <ul className="mt-2 flex flex-col gap-2">
            {older.map((quote) => (
              <li key={quote.version}>
                <p className="font-medium">
                  Version {quote.version}: {quote.total}
                </p>
                <p className="text-sm text-grey-600">{quote.items.join(" · ")}</p>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

function QuoteBuilder({
  ticketId,
  start,
  notes,
  next,
  onDone,
}: {
  ticketId: number;
  start: { label: string; value: string }[];
  notes: string;
  next: number;
  onDone: () => void;
}) {
  const [rows, setRows] = useState(() =>
    (start.length > 0 ? start : [{ label: "", value: "" }]).map((row, key) => ({ ...row, key })),
  );

  return (
    <ActionForm
      action={createQuoteAction.bind(null, ticketId)}
      announce={(state) => state.ok && onDone()}
      className="flex flex-col gap-4 border-t border-grey-300 pt-4"
    >
      {(pending, state) => {
        const e = state.errors ?? {};
        return (
          <>
            <h3 className="font-bold">Quote version {next}</h3>
            {next > 1 && (
              <p className="text-grey-600">
                It replaces version {next - 1}, and the customer needs to approve it again.
              </p>
            )}
            <ol className="flex flex-col gap-3">
              {rows.map((row, index) => (
                <li key={row.key} className="flex flex-wrap items-end gap-3">
                  <Field
                    label={`Line ${index + 1}`}
                    name={`itemLabel.${index}`}
                    error={e[`itemLabel.${index}`]}
                  >
                    <input
                      {...describedBy(`itemLabel.${index}`, e[`itemLabel.${index}`])}
                      name="itemLabel"
                      defaultValue={row.label}
                      dir="auto"
                      className={`${inputClass} min-w-56`}
                    />
                  </Field>
                  <Field
                    label={`Line ${index + 1} amount (AED)`}
                    name={`itemAmount.${index}`}
                    error={e[`itemAmount.${index}`]}
                  >
                    <input
                      {...describedBy(`itemAmount.${index}`, e[`itemAmount.${index}`])}
                      name="itemAmount"
                      defaultValue={row.value}
                      inputMode="decimal"
                      className={`${inputClass} w-36 tabular-nums`}
                    />
                  </Field>
                  {rows.length > 1 && (
                    <button
                      type="button"
                      className={secondaryButton}
                      onClick={() => setRows(rows.filter((other) => other.key !== row.key))}
                    >
                      Remove line {index + 1}
                    </button>
                  )}
                </li>
              ))}
            </ol>
            {e.items && <p className="font-medium text-red">{e.items}</p>}
            {rows.length < 20 && (
              <button
                type="button"
                className={`${secondaryButton} self-start`}
                onClick={() =>
                  setRows([
                    ...rows,
                    { label: "", value: "", key: Math.max(...rows.map((r) => r.key)) + 1 },
                  ])
                }
              >
                Add a line
              </button>
            )}
            <Field label="Note for the customer" name="quote-notes" error={e.notes}>
              <textarea
                {...describedBy("quote-notes", e.notes)}
                name="notes"
                defaultValue={notes}
                dir="auto"
                rows={2}
                className={inputClass}
              />
            </Field>
            <label className="flex min-h-11 items-center gap-3">
              <input
                type="checkbox"
                name="approvedInPerson"
                className="size-6 shrink-0 accent-black"
              />
              The customer approved it in person just now
            </label>
            <div className="flex flex-wrap gap-3">
              <button type="submit" disabled={pending} className={primaryButton}>
                {pending ? "Saving…" : "Save quote"}
              </button>
              <button type="button" className={secondaryButton} onClick={onDone}>
                Cancel
              </button>
            </div>
          </>
        );
      }}
    </ActionForm>
  );
}
