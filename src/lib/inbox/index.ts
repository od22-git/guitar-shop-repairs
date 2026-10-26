import { and, count, desc, eq, ne } from "drizzle-orm";
import { z } from "zod";

import type { Database } from "../db/connect";
import {
  emirate,
  inboxSubmissions,
  repairIntakeMethod,
  type InboxStatus,
  type InboxSubmission,
} from "../db/schema";
import { normalizePhone } from "../phone";

import type { Locale } from "@/i18n/routing";

// The admin inbox: what the public forms send. A repair booking (/repairs) waits here
// until the admin answers it on WhatsApp and, once the instrument arrives, converts it
// into a ticket (the ticket form is prefilled from it). The /sell form (M7) adds its own
// kind. Nothing is deleted: handled items are archived.

/** Why a public form field was refused; the page shows it in the visitor's language. */
export type FieldProblem = "required" | "too_long" | "phone" | "consent";

export type PublicFormResult<T> =
  { ok: true; data: T } | { ok: false; errors: Partial<Record<string, FieldProblem>> };

const text = (max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : value),
    z.string().max(max, "too_long"),
  );
const requiredText = (max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : ""),
    z.string().min(1, "required").max(max, "too_long"),
  );
const optionalText = (max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() !== "" ? value : undefined),
    text(max).optional(),
  );

const repairRequestSchema = z.object({
  name: requiredText(120),
  phone: requiredText(40).transform((value, ctx) => {
    // Replies go out on WhatsApp, which needs a mobile number; any country works.
    const phone = normalizePhone(value, { mobileOnly: true });
    if (!phone) {
      ctx.addIssue({ code: "custom", message: "phone" });
      return z.NEVER;
    }
    return phone;
  }),
  instrumentBrand: optionalText(80),
  instrumentModel: optionalText(80),
  issue: requiredText(2000),
  intakeMethod: z.enum(repairIntakeMethod.enumValues, { error: "required" }),
  emirate: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.enum(emirate.enumValues, { error: "required" }).optional(),
  ),
  whatsappConsent: z.literal("on", { error: "consent" }),
});

/** What a repair booking stores beyond the name and phone. */
export type RepairRequest = {
  instrumentBrand?: string;
  instrumentModel?: string;
  issue: string;
  intakeMethod: (typeof repairIntakeMethod.enumValues)[number];
  emirate?: (typeof emirate.enumValues)[number];
};

export type RepairRequestInput = RepairRequest & { name: string; phone: string };

/** The Book-a-repair form. Errors are FieldProblem codes by field name. */
export function parseRepairRequestForm(form: FormData): PublicFormResult<RepairRequestInput> {
  const fields = Object.fromEntries(
    [...form.entries()].filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
  const parsed = repairRequestSchema.safeParse(fields);
  const errors: Partial<Record<string, FieldProblem>> = {};
  for (const issue of parsed.error?.issues ?? []) {
    const message = issue.message as FieldProblem;
    errors[String(issue.path[0])] ??= ["required", "too_long", "phone", "consent"].includes(message)
      ? message
      : "required";
  }
  // The courier needs to know where to collect from (checked with the other fields, so
  // every problem shows at once).
  if (fields.intakeMethod === "courier" && !fields.emirate) errors.emirate ??= "required";
  if (!parsed.success || Object.keys(errors).length > 0) return { ok: false, errors };
  // Consent is required to submit, so it isn't kept as a field.
  const { name, phone, instrumentBrand, instrumentModel, issue, intakeMethod, emirate } =
    parsed.data;
  return {
    ok: true,
    data: {
      name,
      phone,
      instrumentBrand,
      instrumentModel,
      issue,
      intakeMethod,
      ...(intakeMethod === "courier" ? { emirate } : {}),
    },
  };
}

/** Saves a repair booking, with the visitor's consent to replies on WhatsApp. */
export async function createRepairRequest(
  db: Database,
  input: RepairRequestInput,
  locale: Locale,
): Promise<number> {
  const { name, phone, ...request } = input;
  const payload: RepairRequest & { whatsappConsent: true } = { ...request, whatsappConsent: true };
  const [row] = await db
    .insert(inboxSubmissions)
    .values({ kind: "repair_request", name, phoneE164: phone, locale, payload })
    .returning({ id: inboxSubmissions.id });
  return row.id;
}

/** A repair booking's details, read back from its payload. */
export function repairRequestOf(submission: InboxSubmission): RepairRequest | null {
  if (submission.kind !== "repair_request") return null;
  const payload = submission.payload as Partial<RepairRequest> | null;
  if (!payload || typeof payload.issue !== "string") return null;
  return {
    instrumentBrand: payload.instrumentBrand,
    instrumentModel: payload.instrumentModel,
    issue: payload.issue,
    intakeMethod: payload.intakeMethod === "courier" ? "courier" : "drop_off",
    emirate: payload.emirate,
  };
}

export type InboxFilter = "open" | InboxStatus | "all";

/** Newest first. "open" is what still needs handling: new and replied. */
export async function listSubmissions(db: Database, filter: InboxFilter = "open") {
  const where =
    filter === "all"
      ? undefined
      : filter === "open"
        ? and(ne(inboxSubmissions.status, "converted"), ne(inboxSubmissions.status, "archived"))
        : eq(inboxSubmissions.status, filter);
  return db.select().from(inboxSubmissions).where(where).orderBy(desc(inboxSubmissions.id));
}

export async function getSubmission(db: Database, id: number): Promise<InboxSubmission | null> {
  const [row] = await db.select().from(inboxSubmissions).where(eq(inboxSubmissions.id, id));
  return row ?? null;
}

export async function countNewSubmissions(db: Database): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(inboxSubmissions)
    .where(eq(inboxSubmissions.status, "new"));
  return row.n;
}

/**
 * Marks an item replied, archived, or back to new. A converted item stays converted:
 * its ticket is the record.
 */
export async function setSubmissionStatus(
  db: Database,
  id: number,
  status: Exclude<InboxStatus, "converted">,
): Promise<boolean> {
  const updated = await db
    .update(inboxSubmissions)
    .set({ status })
    .where(and(eq(inboxSubmissions.id, id), ne(inboxSubmissions.status, "converted")))
    .returning({ id: inboxSubmissions.id });
  return updated.length > 0;
}

/** Links a repair booking to the ticket made from it. False if it was already converted. */
export async function markConverted(db: Database, id: number, ticketId: number): Promise<boolean> {
  const updated = await db
    .update(inboxSubmissions)
    .set({ status: "converted", convertedTicketId: ticketId })
    .where(
      and(
        eq(inboxSubmissions.id, id),
        eq(inboxSubmissions.kind, "repair_request"),
        ne(inboxSubmissions.status, "converted"),
      ),
    )
    .returning({ id: inboxSubmissions.id });
  return updated.length > 0;
}
