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
import { MethodSelect } from "../../../_components/payments-panel";
import { cancelAction, fulfilAction, refundAction } from "../actions";

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
                      className="size-6 shrink-0 accent-black"
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
        <p role="status" className={result.ok === false ? "font-medium text-red" : "font-medium"}>
          {result.message}
        </p>
      </div>
    </Panel>
  );
}
