import { z } from "zod";

import {
  amount,
  blankToUndefined,
  checkbox,
  errorsOf,
  fieldsOf,
  mobilePhone,
  optionalAmount,
  optionalText,
  requiredText,
  type FormResult,
} from "../admin/form-fields";
import type { CustomerInput } from "../customers";
import { endOfDubaiDay } from "../datetime";
import { deliveryMethod, emirate, locale, type DeliveryMethod, type Emirate } from "../db/schema";

// Parsing the admin's order and payment forms. Errors are messages by input name; order
// lines are numbered rows, as "productId.2".

export const MAX_ORDER_LINES = 20;

export type OrderLineInput = {
  productId: number;
  quantity: number;
  /** A price agreed with the customer, instead of the listed one. */
  unitPriceFils?: number;
};

export type DeliveryInput = {
  method: DeliveryMethod;
  emirate?: Emirate;
  area?: string;
  addressLine?: string;
  landmark?: string;
  /** Instead of the delivery zone's fee. */
  feeFils?: number;
};

export type OrderInput = {
  customer: CustomerInput;
  lines: OrderLineInput[];
  delivery: DeliveryInput;
  note?: string;
};

const headSchema = z.object({
  name: requiredText(120),
  phone: mobilePhone,
  preferredLocale: z.enum(locale.enumValues),
  whatsappConsent: checkbox,
  deliveryMethod: z.enum(deliveryMethod.enumValues, { error: "Choose how it's handed over" }),
  emirate: z.preprocess(blankToUndefined, z.enum(emirate.enumValues).optional()),
  area: optionalText(120),
  addressLine: optionalText(300),
  landmark: optionalText(200),
  deliveryFee: optionalAmount,
  note: optionalText(2000),
});

/**
 * The new-order form: the customer, then rows of `productId`, `quantity` and
 * `unitPrice` (blank for the listed price), then delivery. Rows with no product are
 * skipped.
 */
export function parseOrderForm(form: FormData): FormResult<OrderInput> {
  const fields = fieldsOf(form);
  const head = headSchema.safeParse(fields);
  const errors = head.success ? {} : errorsOf(head.error);
  // Checked with the other fields, so every problem shows at once.
  if (fields.deliveryMethod === "courier" && !fields.emirate)
    errors.emirate ??= "Choose the emirate";

  const ids = form.getAll("productId").map(String);
  const quantities = form.getAll("quantity").map(String);
  const prices = form.getAll("unitPrice").map(String);
  const lines: OrderLineInput[] = [];
  const seen = new Set<number>();
  for (let row = 0; row < ids.length; row++) {
    if (!ids[row]) continue;
    const productId = Number(ids[row]);
    if (!Number.isSafeInteger(productId) || productId < 1) {
      errors[`productId.${row}`] = "Choose a product";
      continue;
    }
    if (seen.has(productId)) {
      errors[`productId.${row}`] = "Already in the order: change the quantity instead";
      continue;
    }
    seen.add(productId);
    const quantity = Number((quantities[row] ?? "").trim() || "1");
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 999) {
      errors[`quantity.${row}`] = "Enter a whole number";
      continue;
    }
    const rawPrice = (prices[row] ?? "").trim();
    const price = rawPrice ? amount.safeParse(rawPrice) : null;
    if (price && !price.success) {
      errors[`unitPrice.${row}`] = price.error.issues[0].message;
      continue;
    }
    lines.push({ productId, quantity, ...(price ? { unitPriceFils: price.data } : {}) });
  }
  if (lines.length === 0 && !Object.keys(errors).some((key) => key.includes("."))) {
    errors["productId.0"] = "Add at least one product";
  }
  if (lines.length > MAX_ORDER_LINES) errors.items = `Up to ${MAX_ORDER_LINES} products`;

  if (!head.success || Object.keys(errors).length > 0) return { ok: false, errors };
  const { name, phone, preferredLocale, whatsappConsent, note, deliveryFee, ...where } = head.data;
  const courier = where.deliveryMethod === "courier";
  return {
    ok: true,
    data: {
      customer: { name, phone, preferredLocale, whatsappConsent },
      lines,
      delivery: {
        method: where.deliveryMethod,
        // An address only matters for delivery.
        ...(courier
          ? {
              emirate: where.emirate,
              area: where.area,
              addressLine: where.addressLine,
              landmark: where.landmark,
            }
          : {}),
        ...(deliveryFee !== undefined ? { feeFils: deliveryFee } : {}),
      },
      note,
    },
  };
}

/** The ways money is recorded by hand; card_online comes with M10. */
export const manualPaymentMethods = ["cash", "cod", "bank_transfer"] as const;

/** A date input's day, as a time: now if it's today, else the end of that day in Dubai. */
const receivedOn = z.preprocess(
  blankToUndefined,
  z
    .string()
    .optional()
    .transform((value, ctx) => {
      const now = new Date();
      if (value === undefined) return now;
      const end = endOfDubaiDay(value);
      if (!end) {
        ctx.addIssue({ code: "custom", message: "Enter a valid date" });
        return z.NEVER;
      }
      if (end.getTime() - now.getTime() > 24 * 60 * 60 * 1000) {
        ctx.addIssue({ code: "custom", message: "That's in the future" });
        return z.NEVER;
      }
      return end < now ? end : now;
    }),
);

const positiveAmount = amount.refine((fils) => fils > 0, "Enter an amount above zero");

const paymentSchema = z.object({
  kind: z.enum(["deposit", "payment", "refund"], { error: "Choose what it is" }),
  method: z.enum(manualPaymentMethods, { error: "Choose how it was paid" }),
  amount: positiveAmount,
  receivedOn,
  providerRef: optionalText(120),
  note: optionalText(500),
});

export type PaymentInput = {
  kind: "deposit" | "payment" | "refund";
  method: (typeof manualPaymentMethods)[number];
  amountFils: number;
  receivedAt: Date;
  providerRef?: string;
  note?: string;
};

export function parsePaymentForm(form: FormData): FormResult<PaymentInput> {
  const parsed = paymentSchema.safeParse(fieldsOf(form));
  if (!parsed.success) return { ok: false, errors: errorsOf(parsed.error) };
  const { amount: amountFils, receivedOn: receivedAt, ...rest } = parsed.data;
  return { ok: true, data: { ...rest, amountFils, receivedAt } };
}

const refundSchema = z.object({
  amount: z.preprocess(blankToUndefined, positiveAmount.optional()),
  method: z.enum(manualPaymentMethods, { error: "Choose how it was refunded" }),
  restock: checkbox,
  note: optionalText(500),
});

export type RefundInput = {
  /** Nothing was paid back (e.g. an exchange): only the status and stock change. */
  amountFils?: number;
  method: (typeof manualPaymentMethods)[number];
  restock: boolean;
  note?: string;
};

export function parseRefundForm(form: FormData): FormResult<RefundInput> {
  const parsed = refundSchema.safeParse(fieldsOf(form));
  if (!parsed.success) return { ok: false, errors: errorsOf(parsed.error) };
  const { amount: amountFils, ...rest } = parsed.data;
  return { ok: true, data: { ...rest, ...(amountFils !== undefined ? { amountFils } : {}) } };
}
