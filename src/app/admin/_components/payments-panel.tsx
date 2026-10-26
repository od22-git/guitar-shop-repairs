"use client";

import { useState } from "react";

import { ActionForm } from "./action-form";
import type { ActionState } from "./action-state";
import { describedBy, Field, inputClass, Panel, primaryButton, secondaryButton } from "./form";

// Payments recorded by hand, for orders and repair tickets alike (one ledger, `payments`).

const methods = [
  ["cash", "Cash"],
  ["bank_transfer", "Bank transfer"],
  ["cod", "Cash on delivery (courier)"],
] as const;

export function MethodSelect({ name, error }: { name: string; error?: string }) {
  return (
    <Field label="How" name={name} error={error}>
      <select {...describedBy(name, error)} name="method" className={inputClass}>
        {methods.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </Field>
  );
}

/**
 * The money ledger of an order or a repair ticket: the balance, each payment (with
 * Remove, for one entered by mistake) and the form to record one. `record` and `remove`
 * are the caller's server actions, bound to its order or ticket.
 */
export function PaymentsPanel({
  record,
  remove,
  canPay,
  blocked,
  today,
  balance,
  payments,
}: {
  record: (state: ActionState, form: FormData) => Promise<ActionState>;
  remove: (paymentId: number) => Promise<ActionState>;
  /** Money can be received (else only refunds). */
  canPay: boolean;
  /** Shown instead of the form when nothing can be recorded yet. */
  blocked?: string;
  today: string;
  balance: {
    paid: string;
    due: string | null;
    dueValue: string;
    toRefund: string | null;
    /** Shown instead of the amount when nothing is due; "Paid in full" by default. */
    settled?: string;
  };
  payments: { id: number; label: string; amount: string; at: string; detail: string }[];
}) {
  const [result, setResult] = useState<ActionState>({});
  return (
    <Panel title="Payments">
      <dl className="mb-4 grid grid-cols-2 gap-3">
        <div>
          <dt className="text-sm text-grey-600">Paid</dt>
          <dd className="text-xl font-bold tabular-nums" data-testid="order-paid">
            {balance.paid}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-grey-600">{balance.toRefund ? "To refund" : "Still due"}</dt>
          <dd
            data-testid="order-due"
            className={`text-xl font-bold tabular-nums ${balance.due || balance.toRefund ? "text-red" : ""}`}
          >
            {balance.toRefund ?? balance.due ?? balance.settled ?? "Paid in full"}
          </dd>
        </div>
      </dl>

      {payments.length > 0 && (
        <ul className="mb-4 flex flex-col divide-y divide-grey-300">
          {payments.map((payment) => (
            <li key={payment.id} className="flex flex-wrap items-center gap-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {payment.label}: <span className="tabular-nums">{payment.amount}</span>
                </p>
                <p className="text-sm text-grey-600">
                  {payment.at}
                  {payment.detail && ` · ${payment.detail}`}
                </p>
              </div>
              <ActionForm
                action={remove.bind(null, payment.id)}
                announce={setResult}
                confirm="Remove this payment? Only do this for one entered by mistake."
              >
                {(pending) => (
                  <button type="submit" disabled={pending} className={secondaryButton}>
                    Remove<span className="sr-only"> {payment.label}</span>
                  </button>
                )}
              </ActionForm>
            </li>
          ))}
        </ul>
      )}

      {blocked ? (
        <p className="border-t border-grey-300 pt-4">{blocked}</p>
      ) : (
        <ActionForm
          action={record}
          announce={setResult}
          className="flex flex-col gap-4 border-t border-grey-300 pt-4"
        >
          {(pending, state) => {
            const e = state.errors ?? {};
            return (
              <>
                <h3 className="font-bold">Record money {canPay ? "received" : "refunded"}</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="What" name="payment-kind" error={e.kind}>
                    <select
                      {...describedBy("payment-kind", e.kind)}
                      name="kind"
                      defaultValue={canPay ? "payment" : "refund"}
                      className={inputClass}
                    >
                      {canPay && <option value="deposit">Deposit</option>}
                      {canPay && <option value="payment">Payment</option>}
                      <option value="refund">Refund</option>
                    </select>
                  </Field>
                  <MethodSelect name="payment-method" error={e.method} />
                  <Field label="Amount (AED)" name="payment-amount" error={e.amount}>
                    <input
                      {...describedBy("payment-amount", e.amount)}
                      name="amount"
                      inputMode="decimal"
                      // Changes when the balance does, so the box starts from what's due.
                      key={balance.dueValue}
                      defaultValue={canPay && balance.due ? balance.dueValue : ""}
                      className={`${inputClass} tabular-nums`}
                    />
                  </Field>
                  <Field label="Date" name="payment-date" error={e.receivedOn}>
                    <input
                      {...describedBy("payment-date", e.receivedOn)}
                      name="receivedOn"
                      type="date"
                      defaultValue={today}
                      max={today}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Reference" name="payment-ref" error={e.providerRef}>
                    <input
                      {...describedBy("payment-ref", e.providerRef)}
                      name="providerRef"
                      autoComplete="off"
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Note" name="payment-note" error={e.note}>
                    <input
                      {...describedBy("payment-note", e.note)}
                      name="note"
                      autoComplete="off"
                      className={inputClass}
                    />
                  </Field>
                </div>
                <button type="submit" disabled={pending} className={`${primaryButton} self-start`}>
                  {pending ? "Saving…" : "Record"}
                </button>
              </>
            );
          }}
        </ActionForm>
      )}
      <p
        role="status"
        className={result.ok === false ? "mt-3 font-medium text-red" : "mt-3 font-medium"}
      >
        {result.message}
      </p>
    </Panel>
  );
}
