import { z } from "zod";

import { endOfDubaiDay } from "../datetime";
import { MAX_FILS, parseAedToFils } from "../money";
import { normalizePhone } from "../phone";

// Field parsers shared by the admin's forms (repairs, orders, payments). Errors are
// messages by input name, shown next to the field.

export type FormResult<T> = { ok: true; data: T } | { ok: false; errors: Record<string, string> };

export const blankToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;
export const optionalText = (max: number) =>
  z.preprocess(blankToUndefined, z.string().trim().max(max).optional());
export const requiredText = (max: number) => z.string().trim().min(1, "Required").max(max);
export const checkbox = z.preprocess((value) => value === "on" || value === "true", z.boolean());

/** A customer's mobile, for WhatsApp; any country works. Gives E.164. */
export const mobilePhone = z
  .string()
  .trim()
  .min(1, "Required")
  .transform((value, ctx) => {
    const phone = normalizePhone(value, { mobileOnly: true });
    if (!phone) {
      ctx.addIssue({ code: "custom", message: "Enter a mobile number, like 050 123 4567" });
      return z.NEVER;
    }
    return phone;
  });

/** A date input's "YYYY-MM-DD", a day in Dubai. */
export const optionalDay = z.preprocess(
  blankToUndefined,
  z
    .string()
    .refine((value) => endOfDubaiDay(value) !== null, "Enter a valid date")
    .optional(),
);

export const amount = z.string().transform((value, ctx) => {
  const fils = parseAedToFils(value);
  if (fils === null || fils > MAX_FILS) {
    ctx.addIssue({ code: "custom", message: "Enter an amount in AED, like 150 or 150.50" });
    return z.NEVER;
  }
  return fils;
});
export const optionalAmount = z.preprocess(blankToUndefined, amount.optional());

export function errorsOf(error: z.ZodError | undefined): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error?.issues ?? []) errors[String(issue.path[0])] ??= issue.message;
  return errors;
}

export function fieldsOf(form: FormData): Record<string, string> {
  return Object.fromEntries(
    [...form.entries()].filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
}
