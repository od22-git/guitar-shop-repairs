"use client";

import { useState } from "react";

import { ActionForm } from "../../_components/action-form";
import type { ActionState } from "../../_components/action-state";
import {
  describedBy,
  Field,
  inputClass,
  primaryButton,
  secondaryButton,
} from "../../_components/form";

export type ProductOption = {
  id: number;
  /** "Title (SKU)", plus the hold or stock left. */
  label: string;
  /** The listed price, as typed in the price box ("3450"). */
  price: string;
  priceLabel: string;
  gear: boolean;
};

type Props = {
  action: (state: ActionState, form: FormData) => Promise<ActionState>;
  products: ProductOption[];
  emirates: { value: string; label: string; fee: string | null }[];
  /** A product to start with (?product=). */
  start?: number;
};

const checkboxClass = "size-6 shrink-0 accent-black";

export function OrderForm({ action, products, emirates, start }: Props) {
  const [rows, setRows] = useState([{ key: 0, productId: start ? String(start) : "" }]);
  const [method, setMethod] = useState<"appointment" | "courier">("appointment");
  const byId = new Map(products.map((product) => [String(product.id), product]));

  return (
    <ActionForm action={action} className="flex flex-col gap-6">
      {(pending, state) => {
        const e = state.errors ?? {};
        const text = (
          name: string,
          label: string,
          extra: { hint?: string; type?: string; inputMode?: "tel" | "decimal" } = {},
        ) => (
          <Field label={label} name={name} error={e[name]} hint={extra.hint}>
            <input
              {...describedBy(name, e[name], !!extra.hint)}
              type={extra.type ?? "text"}
              inputMode={extra.inputMode}
              autoComplete="off"
              className={inputClass}
            />
          </Field>
        );
        const section = (id: string, title: string, children: React.ReactNode) => (
          <section
            aria-labelledby={id}
            className="flex flex-col gap-4 rounded-lg bg-white p-4 sm:p-6"
          >
            <h2 id={id} className="text-lg font-bold">
              {title}
            </h2>
            {children}
          </section>
        );

        return (
          <>
            {section(
              "customer-heading",
              "Customer",
              <>
                {text("phone", "Mobile number", {
                  type: "tel",
                  inputMode: "tel",
                  hint: "Their WhatsApp number. A returning customer is found by it.",
                })}
                {text("name", "Name")}
                <fieldset className="flex flex-col gap-1">
                  <legend className="mb-1 font-medium">Receipt in</legend>
                  <div className="flex flex-wrap gap-x-6">
                    {[
                      ["en", "English"],
                      ["ar", "Arabic"],
                    ].map(([value, label]) => (
                      <label key={value} className="flex min-h-11 items-center gap-2">
                        <input
                          type="radio"
                          name="preferredLocale"
                          value={value}
                          defaultChecked={value === "en"}
                          className={checkboxClass}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <label className="flex min-h-11 items-center gap-3">
                  <input type="checkbox" name="whatsappConsent" className={checkboxClass} />
                  Agrees to messages on WhatsApp
                </label>
              </>,
            )}

            {section(
              "items-heading",
              "Items",
              <>
                {products.length === 0 && (
                  <p>Nothing is for sale right now. Publish a product first.</p>
                )}
                <ol className="flex flex-col gap-4">
                  {rows.map((row, index) => {
                    const chosen = byId.get(row.productId);
                    const n = index + 1;
                    return (
                      <li key={row.key} className="flex flex-wrap items-end gap-3">
                        <div className="min-w-64 flex-1">
                          <Field
                            label={`Product ${n}`}
                            name={`productId.${index}`}
                            error={e[`productId.${index}`]}
                          >
                            <select
                              {...describedBy(`productId.${index}`, e[`productId.${index}`])}
                              name="productId"
                              value={row.productId}
                              onChange={(event) =>
                                setRows(
                                  rows.map((other) =>
                                    other.key === row.key
                                      ? { ...other, productId: event.target.value }
                                      : other,
                                  ),
                                )
                              }
                              className={inputClass}
                            >
                              <option value="">Choose a product</option>
                              {products.map((product) => (
                                <option key={product.id} value={product.id}>
                                  {product.label}
                                </option>
                              ))}
                            </select>
                          </Field>
                        </div>
                        <Field
                          label={`Product ${n} quantity`}
                          name={`quantity.${index}`}
                          error={e[`quantity.${index}`]}
                        >
                          {chosen && !chosen.gear ? (
                            <>
                              <input type="hidden" name="quantity" value="1" />
                              <input
                                id={`quantity.${index}`}
                                value="1"
                                readOnly
                                aria-describedby={`quantity.${index}-note`}
                                className={`${inputClass} w-20 tabular-nums`}
                              />
                              <span id={`quantity.${index}-note`} className="sr-only">
                                A guitar is one item.
                              </span>
                            </>
                          ) : (
                            <input
                              {...describedBy(`quantity.${index}`, e[`quantity.${index}`])}
                              name="quantity"
                              inputMode="numeric"
                              defaultValue="1"
                              className={`${inputClass} w-20 tabular-nums`}
                            />
                          )}
                        </Field>
                        <Field
                          label={`Product ${n} price each (AED)`}
                          name={`unitPrice.${index}`}
                          error={e[`unitPrice.${index}`]}
                          hint={
                            chosen ? `Listed at ${chosen.priceLabel}` : "Blank for the listed price"
                          }
                        >
                          <input
                            {...describedBy(`unitPrice.${index}`, e[`unitPrice.${index}`], true)}
                            name="unitPrice"
                            inputMode="decimal"
                            placeholder={chosen?.price}
                            className={`${inputClass} w-36 tabular-nums`}
                          />
                        </Field>
                        {rows.length > 1 && (
                          <button
                            type="button"
                            className={secondaryButton}
                            onClick={() => setRows(rows.filter((other) => other.key !== row.key))}
                          >
                            Remove product {n}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ol>
                {e.items && <p className="font-medium text-red">{e.items}</p>}
                {rows.length < 20 && (
                  <button
                    type="button"
                    className={`${secondaryButton} self-start`}
                    onClick={() =>
                      setRows([
                        ...rows,
                        { key: Math.max(...rows.map((r) => r.key)) + 1, productId: "" },
                      ])
                    }
                  >
                    Add a product
                  </button>
                )}
              </>,
            )}

            {section(
              "delivery-heading",
              "Handover",
              <>
                <fieldset className="flex flex-col gap-1">
                  <legend className="mb-1 font-medium">How it’s handed over</legend>
                  <div className="flex flex-wrap gap-x-6">
                    {(
                      [
                        ["appointment", "Collection by appointment"],
                        ["courier", "Courier delivery"],
                      ] as const
                    ).map(([value, label]) => (
                      <label key={value} className="flex min-h-11 items-center gap-2">
                        <input
                          type="radio"
                          name="deliveryMethod"
                          value={value}
                          checked={method === value}
                          onChange={() => setMethod(value)}
                          className={checkboxClass}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </fieldset>
                {method === "courier" && (
                  <>
                    <Field label="Emirate" name="emirate" error={e.emirate}>
                      <select
                        {...describedBy("emirate", e.emirate)}
                        defaultValue=""
                        className={inputClass}
                      >
                        <option value="">Choose the emirate</option>
                        {emirates.map((emirate) => (
                          <option key={emirate.value} value={emirate.value}>
                            {emirate.label}
                            {emirate.fee ? ` (delivery ${emirate.fee})` : " (no delivery zone)"}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {text("area", "Area")}
                      {text("landmark", "Landmark")}
                    </div>
                    {text("addressLine", "Address", { hint: "Building, street, villa or flat." })}
                  </>
                )}
                {text("deliveryFee", "Delivery fee (AED)", {
                  inputMode: "decimal",
                  hint: method === "courier" ? "Blank for the zone's fee." : "Blank for none.",
                })}
                <Field label="Note (only you see it)" name="note" error={e.note}>
                  <textarea
                    {...describedBy("note", e.note)}
                    rows={2}
                    dir="auto"
                    className={inputClass}
                  />
                </Field>
              </>,
            )}

            <button type="submit" disabled={pending} className={`${primaryButton} self-start`}>
              {pending ? "Saving…" : "Create order"}
            </button>
          </>
        );
      }}
    </ActionForm>
  );
}
