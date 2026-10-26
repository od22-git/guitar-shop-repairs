"use client";

import { useState } from "react";

import type { OrderStatus } from "@/lib/db/schema";

import { ActionForm } from "../../../_components/action-form";
import type { ActionState } from "../../../_components/action-state";
import {
  describedBy,
  Field,
  inputClass,
  Panel,
  primaryButton,
  secondaryButton,
} from "../../../_components/form";
import {
  cancelAction,
  deletePaymentAction,
  fulfilAction,
  recordPaymentAction,
  refundAction,
} from "../actions";

const methods = [
  ["cash", "Cash"],
  ["bank_transfer", "Bank transfer"],
  ["cod", "Cash on delivery (courier)"],
] as const;

function MethodSelect({ name, error }: { name: string; error?: string }) {
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

export function PaymentsPanel({
  orderId,
  canPay,
  today,
  balance,
  payments,
}: {
  orderId: number;
  canPay: boolean;
  today: string;
  balance: { paid: string; due: string | null; dueValue: string; toRefund: string | null };
  payments: { id: number; label: string; amount: string; at: string; detail: string }[];
}) {
  const [result, setResult] = useState<ActionState>({});
  return (
    <Panel title="Payments">
      <dl className="mb-4 grid grid-cols-2 gap-3">
        <div>
          <dt className="text-sm text-ink-muted">Paid</dt>
          <dd className="text-xl font-bold tabular-nums" data-testid="order-paid">
            {balance.paid}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-ink-muted">{balance.toRefund ? "To refund" : "Still due"}</dt>
          <dd
            data-testid="order-due"
            className={`text-xl font-bold tabular-nums ${balance.due || balance.toRefund ? "text-fiesta-deep" : ""}`}
          >
            {balance.toRefund ?? balance.due ?? "Paid in full"}
          </dd>
        </div>
      </dl>

      {payments.length > 0 && (
        <ul className="mb-4 flex flex-col divide-y divide-mist">
          {payments.map((payment) => (
            <li key={payment.id} className="flex flex-wrap items-center gap-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {payment.label}: <span className="tabular-nums">{payment.amount}</span>
                </p>
                <p className="text-sm text-ink-muted">
                  {payment.at}
                  {payment.detail && ` · ${payment.detail}`}
                </p>
              </div>
              <ActionForm
                action={deletePaymentAction.bind(null, payment.id)}
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

      <ActionForm
        action={recordPaymentAction.bind(null, orderId)}
        announce={setResult}
        className="flex flex-col gap-4 border-t border-mist pt-4"
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
      <p
        role="status"
        className={result.ok === false ? "mt-3 font-medium text-fiesta-deep" : "mt-3 font-medium"}
      >
        {result.message}
      </p>
    </Panel>
  );
}

export function StatusPanel({
  orderId,
  status,
  paid,
  due,
  stockReturned,
}: {
  orderId: number;
  status: OrderStatus;
  stockReturned: boolean;
  /** What was paid, as typed in the refund box. */
  paid: string;
  due: string | null;
}) {
  const [result, setResult] = useState<ActionState>({});
  const open = status === "pending" || status === "confirmed";
  return (
    <Panel title="Handover and returns">
      <div className="flex flex-col gap-4">
        {(status === "cancelled" || status === "refunded") && (
          <p>
            {status === "cancelled" ? "Cancelled" : "Refunded"}.{" "}
            {stockReturned ? "Its items went back into the shop." : "Its items stayed sold."}
          </p>
        )}
        {open && (
          <>
            <ActionForm
              action={fulfilAction.bind(null, orderId)}
              announce={setResult}
              confirm={due ? `${due} is still due. Mark it as handed over anyway?` : undefined}
            >
              {(pending) => (
                <button type="submit" disabled={pending} className={primaryButton}>
                  {pending ? "Saving…" : "Mark as handed over"}
                </button>
              )}
            </ActionForm>
            <ActionForm
              action={cancelAction.bind(null, orderId)}
              announce={setResult}
              confirm="Cancel this order and put its items back in the shop?"
            >
              {(pending) => (
                <button type="submit" disabled={pending} className={secondaryButton}>
                  {pending ? "Cancelling…" : "Cancel order"}
                </button>
              )}
            </ActionForm>
          </>
        )}
        {status === "fulfilled" && (
          <ActionForm
            action={refundAction.bind(null, orderId)}
            announce={setResult}
            confirm="Refund this order?"
            className="flex flex-col gap-4"
          >
            {(pending, state) => {
              const e = state.errors ?? {};
              return (
                <>
                  <p>For a return. Record what was given back, if anything.</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      label="Refund (AED)"
                      name="refund-amount"
                      error={e.amount}
                      hint="Blank if no money went back."
                    >
                      <input
                        {...describedBy("refund-amount", e.amount, true)}
                        name="amount"
                        inputMode="decimal"
                        defaultValue={paid === "0" ? "" : paid}
                        className={`${inputClass} tabular-nums`}
                      />
                    </Field>
                    <MethodSelect name="refund-method" error={e.method} />
                  </div>
                  <label className="flex min-h-11 items-center gap-3">
                    <input
                      type="checkbox"
                      name="restock"
                      className="size-6 shrink-0 accent-fiesta"
                    />
                    The items came back and go back into the shop
                  </label>
                  <button
                    type="submit"
                    disabled={pending}
                    className={`${secondaryButton} self-start`}
                  >
                    {pending ? "Saving…" : "Refund order"}
                  </button>
                </>
              );
            }}
          </ActionForm>
        )}
        <p
          role="status"
          className={result.ok === false ? "font-medium text-fiesta-deep" : "font-medium"}
        >
          {result.message}
        </p>
      </div>
    </Panel>
  );
}
