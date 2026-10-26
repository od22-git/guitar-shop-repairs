import { z } from "zod";

import {
  amount,
  checkbox,
  errorsOf,
  fieldsOf,
  mobilePhone,
  optionalDay,
  optionalText,
  requiredText,
  type FormResult,
} from "../admin/form-fields";
import { locale, repairIntakeMethod } from "../db/schema";
import { MAX_FILS } from "../money";

export { optionalAmount, optionalDay, type FormResult } from "../admin/form-fields";

// Parsing the admin's repair forms. Each returns field errors by input name, like the
// product form (src/lib/admin/products.ts).

const detailsShape = {
  instrumentBrand: optionalText(80),
  instrumentModel: optionalText(80),
  serial: optionalText(60),
  colour: optionalText(60),
  issue: requiredText(2000),
  intakeNotes: optionalText(3000),
  accessories: optionalText(500),
  etaDate: optionalDay,
};

const ticketSchema = z
  .object({
    name: requiredText(120),
    phone: mobilePhone,
    preferredLocale: z.enum(locale.enumValues),
    whatsappConsent: checkbox,
    intakeMethod: z.enum(repairIntakeMethod.enumValues),
    termsAccepted: checkbox,
    ...detailsShape,
  })
  .superRefine((value, ctx) => {
    // At drop-off the customer accepts the terms at the bench. A courier customer can
    // accept them when approving the quote (M6).
    if (value.intakeMethod === "drop_off" && !value.termsAccepted) {
      ctx.addIssue({
        code: "custom",
        path: ["termsAccepted"],
        message: "The customer accepts the repair terms at drop-off",
      });
    }
  });

export type TicketInput = z.infer<typeof ticketSchema>;

export function parseTicketForm(form: FormData): FormResult<TicketInput> {
  const parsed = ticketSchema.safeParse(fieldsOf(form));
  return parsed.success
    ? { ok: true, data: parsed.data }
    : { ok: false, errors: errorsOf(parsed.error) };
}

const detailsSchema = z.object(detailsShape);
export type TicketDetailsInput = z.infer<typeof detailsSchema>;

export function parseTicketDetailsForm(form: FormData): FormResult<TicketDetailsInput> {
  const parsed = detailsSchema.safeParse(fieldsOf(form));
  return parsed.success
    ? { ok: true, data: parsed.data }
    : { ok: false, errors: errorsOf(parsed.error) };
}

const updateSchema = z.object({
  publicNote: optionalText(1000),
  internalNote: optionalText(2000),
  etaDate: optionalDay,
});
export type UpdateInput = z.infer<typeof updateSchema>;

export function parseUpdateForm(form: FormData): FormResult<UpdateInput> {
  const parsed = updateSchema.safeParse(fieldsOf(form));
  if (!parsed.success) return { ok: false, errors: errorsOf(parsed.error) };
  const { publicNote, internalNote, etaDate } = parsed.data;
  if (!publicNote && !internalNote && !etaDate) {
    return { ok: false, errors: { publicNote: "Write a note or set a new ETA" } };
  }
  return { ok: true, data: parsed.data };
}

export const MAX_QUOTE_ITEMS = 20;

export type QuoteInput = {
  items: { label: string; amountFils: number }[];
  notes?: string;
  /** The customer agreed on the spot (a fixed-price job at drop-off). */
  approvedInPerson: boolean;
};

/**
 * The quote builder: rows of `itemLabel` and `itemAmount`, in order. Blank rows are
 * skipped; errors name the row, as "itemLabel.2".
 */
export function parseQuoteForm(form: FormData): FormResult<QuoteInput> {
  const labels = form.getAll("itemLabel").map(String);
  const amounts = form.getAll("itemAmount").map(String);
  const errors: Record<string, string> = {};
  const items: QuoteInput["items"] = [];
  for (let row = 0; row < Math.max(labels.length, amounts.length); row++) {
    const label = (labels[row] ?? "").trim();
    const rawAmount = (amounts[row] ?? "").trim();
    if (!label && !rawAmount) continue;
    if (!label) errors[`itemLabel.${row}`] = "Describe the work";
    else if (label.length > 200) errors[`itemLabel.${row}`] = "Keep it under 200 characters";
    const parsed = amount.safeParse(rawAmount);
    if (!parsed.success) errors[`itemAmount.${row}`] = parsed.error.issues[0].message;
    if (label && parsed.success) items.push({ label, amountFils: parsed.data });
  }
  if (items.length === 0 && Object.keys(errors).length === 0) {
    errors["itemLabel.0"] = "Add at least one line";
  }
  if (items.length > MAX_QUOTE_ITEMS) errors.items = `Up to ${MAX_QUOTE_ITEMS} lines`;
  const total = items.reduce((sum, item) => sum + item.amountFils, 0);
  if (total > MAX_FILS) errors.items = "The total is too large";

  const notes = optionalText(1000).safeParse(form.get("notes") ?? undefined);
  if (!notes.success) errors.notes = notes.error.issues[0].message;
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    data: { items, notes: notes.data, approvedInPerson: form.get("approvedInPerson") === "on" },
  };
}
