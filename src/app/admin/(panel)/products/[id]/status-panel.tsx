"use client";

import { useState } from "react";

import Link from "next/link";

import type { ProductStatus } from "@/lib/db/schema";

import { ActionForm } from "../../../_components/action-form";
import type { ActionState } from "../../../_components/action-state";
import { inputClass, primaryButton, secondaryButton } from "../../../_components/form";
import {
  archiveAction,
  deleteDraftAction,
  holdAction,
  publishAction,
  releaseAction,
  restockAction,
  sellAction,
  unarchiveAction,
} from "../actions";

type Props = {
  product: {
    id: number;
    kind: "guitar" | "gear";
    status: ProductStatus;
    quantity: number;
    everPublished: boolean;
    reservedNote: string | null;
    reservedUntil: string | null;
    defaultHoldUntil: string;
  };
  publishProblems: string[];
};

const row = "flex flex-wrap items-end gap-3";

// What can happen next, by status. Stock changes go through src/lib/inventory.ts.
export function StatusPanel({ product, publishProblems }: Props) {
  const { id, kind, status, quantity } = product;
  const gear = kind === "gear";
  // One message for the panel: the form that sent it may be gone after the change.
  const [result, setResult] = useState<ActionState>({});

  const button = (label: string, pendingLabel: string, primary = false) =>
    function SubmitButton(pending: boolean) {
      return (
        <button
          type="submit"
          disabled={pending}
          className={primary ? primaryButton : secondaryButton}
        >
          {pending ? pendingLabel : label}
        </button>
      );
    };

  const quantityInput = (label: string) => (
    <div className="flex flex-col gap-1">
      <label htmlFor={`${label}-quantity`} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={`${label}-quantity`}
        name="quantity"
        inputMode="numeric"
        defaultValue="1"
        className={`${inputClass} w-24 tabular-nums`}
      />
    </div>
  );

  const archive = (
    <ActionForm announce={setResult} action={archiveAction.bind(null, id)} className={row}>
      {button("Archive", "Archiving…")}
    </ActionForm>
  );

  return (
    <section
      aria-labelledby="status-heading"
      className="flex flex-col gap-5 rounded-lg bg-white p-4 sm:p-6"
    >
      <div>
        <h2 id="status-heading" className="text-lg font-bold">
          Status and stock
        </h2>
        <p className="text-grey-600">
          {gear ? `${quantity} in stock.` : quantity > 0 ? "One instrument." : "Sold."}
        </p>
      </div>

      {status === "draft" && (
        <>
          {publishProblems.length > 0 && (
            <div>
              <p className="font-medium">Before it can be published:</p>
              <ul className="list-disc ps-5">
                {publishProblems.map((problem) => (
                  <li key={problem}>{problem}</li>
                ))}
              </ul>
            </div>
          )}
          <ActionForm announce={setResult} action={publishAction.bind(null, id)} className={row}>
            {button("Publish", "Publishing…", true)}
          </ActionForm>
          {product.everPublished ? (
            archive
          ) : (
            <ActionForm
              action={deleteDraftAction.bind(null, id)}
              confirm="Delete this draft and its photos? This can't be undone."
              className={row}
            >
              {button("Delete draft", "Deleting…")}
            </ActionForm>
          )}
        </>
      )}

      {(status === "available" || status === "reserved") && (
        <p>
          <Link
            href={`/admin/orders/new?product=${id}`}
            className="font-semibold underline underline-offset-4"
          >
            {status === "reserved" ? "Make the order for the customer holding it" : "Make an order"}
          </Link>{" "}
          <span className="text-grey-600">to record payments and print a receipt.</span>
        </p>
      )}

      {status === "available" && (
        <>
          {quantity === 1 && (
            <ActionForm announce={setResult} action={holdAction.bind(null, id)} className={row}>
              {(pending) => (
                <>
                  <div className="flex min-w-48 flex-1 flex-col gap-1">
                    <label htmlFor="hold-note" className="text-sm font-medium">
                      Hold for (name, deposit)
                    </label>
                    <input id="hold-note" name="note" className={inputClass} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label htmlFor="hold-until" className="text-sm font-medium">
                      Until
                    </label>
                    <input
                      id="hold-until"
                      name="until"
                      type="date"
                      defaultValue={product.defaultHoldUntil}
                      className={inputClass}
                    />
                  </div>
                  {button("Put on hold", "Saving…")(pending)}
                </>
              )}
            </ActionForm>
          )}
          <ActionForm
            action={sellAction.bind(null, id)}
            confirm={gear ? undefined : "Mark this guitar as sold?"}
            className={row}
          >
            {(pending) => (
              <>
                {gear ? quantityInput("Sold") : <input type="hidden" name="quantity" value="1" />}
                {button("Mark sold", "Saving…")(pending)}
              </>
            )}
          </ActionForm>
          {gear && (
            <ActionForm announce={setResult} action={restockAction.bind(null, id)} className={row}>
              {(pending) => (
                <>
                  {quantityInput("Add")}
                  {button("Restock", "Saving…")(pending)}
                </>
              )}
            </ActionForm>
          )}
          {archive}
        </>
      )}

      {status === "reserved" && (
        <>
          <p>
            On hold{product.reservedNote && ` for ${product.reservedNote}`}
            {product.reservedUntil && ` until ${product.reservedUntil}`}.
          </p>
          <ActionForm
            action={sellAction.bind(null, id)}
            confirm="Mark this as sold to the customer holding it?"
            className={row}
          >
            {(pending) => (
              <>
                <input type="hidden" name="quantity" value="1" />
                {button("Mark sold", "Saving…", true)(pending)}
              </>
            )}
          </ActionForm>
          <ActionForm announce={setResult} action={releaseAction.bind(null, id)} className={row}>
            {button("Release hold", "Releasing…")}
          </ActionForm>
        </>
      )}

      {(status === "sold" || (status === "archived" && (gear || quantity === 0))) && (
        <ActionForm announce={setResult} action={restockAction.bind(null, id)} className={row}>
          {(pending) => (
            <>
              {gear ? quantityInput("Add") : <input type="hidden" name="quantity" value="1" />}
              {button(gear ? "Restock" : "Back in stock", "Saving…")(pending)}
            </>
          )}
        </ActionForm>
      )}
      {status === "sold" && archive}
      {status === "archived" && (
        <ActionForm announce={setResult} action={unarchiveAction.bind(null, id)} className={row}>
          {button("Restore as draft", "Restoring…")}
        </ActionForm>
      )}
      <p role="status" className={result.ok === false ? "font-medium text-red" : "font-medium"}>
        {result.message}
      </p>
    </section>
  );
}
