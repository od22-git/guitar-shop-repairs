import { and, count, desc, eq, ne } from "drizzle-orm";
import { z } from "zod";

import type { Database } from "../db/connect";
import { toWesternDigits } from "../digits";
import { parseAedToFils } from "../money";
import {
  emirate,
  inboxSubmissions,
  productCondition,
  repairIntakeMethod,
  type InboxStatus,
  type InboxSubmission,
} from "../db/schema";
import { normalizePhone } from "../phone";

import type { Locale } from "@/i18n/routing";

// The admin inbox: what the public forms send. A repair booking (/repairs) waits here
// until the admin answers it on WhatsApp and, once the instrument arrives, converts it
// into a ticket (the ticket form is prefilled from it). A guitar offered on /sell (M7b)
// waits here with its photos until the admin replies. Nothing is deleted: handled items
// are archived.

/** Why a public form field was refused; the page shows it in the visitor's language. */
export type FieldProblem = "required" | "too_long" | "phone" | "consent";
/** The /sell form's extra checks. */
export type SellProblem = FieldProblem | "ownership" | "year" | "amount" | "photos";

export type PublicFormResult<T, P extends string = FieldProblem> =
  { ok: true; data: T } | { ok: false; errors: Partial<Record<string, P>> };

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

// Replies go out on WhatsApp, which needs a mobile number; any country works.
const mobile = requiredText(40).transform((value, ctx) => {
  const phone = normalizePhone(value, { mobileOnly: true });
  if (!phone) {
    ctx.addIssue({ code: "custom", message: "phone" });
    return z.NEVER;
  }
  return phone;
});

/** Form fields that are strings (files and repeats aside). */
const stringFields = (form: FormData) =>
  Object.fromEntries(
    [...form.entries()].filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );

/** The first problem per field, as a code the page can show. */
function problemsOf<P extends string>(
  issues: readonly z.core.$ZodIssue[],
  known: readonly P[],
): Partial<Record<string, P>> {
  const errors: Partial<Record<string, P>> = {};
  for (const issue of issues) {
    const message = issue.message as P;
    errors[String(issue.path[0])] ??= known.includes(message) ? message : ("required" as P);
  }
  return errors;
}

const repairRequestSchema = z.object({
  name: requiredText(120),
  phone: mobile,
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
  const fields = stringFields(form);
  const parsed = repairRequestSchema.safeParse(fields);
  const errors = problemsOf<FieldProblem>(parsed.error?.issues ?? [], [
    "required",
    "too_long",
    "phone",
    "consent",
  ]);
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

const sellSchema = z.object({
  name: requiredText(120),
  phone: mobile,
  brand: requiredText(80),
  model: optionalText(80),
  year: z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() !== "" ? toWesternDigits(value.trim()) : undefined,
    z
      .string()
      .regex(/^\d{4}$/, "year")
      .transform(Number)
      .refine((year) => year >= 1930 && year <= new Date().getFullYear() + 1, "year")
      .optional(),
  ),
  serial: optionalText(60),
  condition: z.enum(productCondition.enumValues, { error: "required" }),
  askingPrice: z.preprocess(
    (value) => (typeof value === "string" && value.trim() !== "" ? value : undefined),
    z
      .string()
      .transform((value, ctx) => {
        const fils = parseAedToFils(value);
        if (fils === null || fils === 0) {
          ctx.addIssue({ code: "custom", message: "amount" });
          return z.NEVER;
        }
        return fils;
      })
      .optional(),
  ),
  description: requiredText(2000),
  ownership: z.literal("on", { error: "ownership" }),
  whatsappConsent: z.literal("on", { error: "consent" }),
});

/** What a guitar offered on /sell stores beyond the name, phone and photos. */
export type SellOffer = {
  brand: string;
  model?: string;
  year?: number;
  serial?: string;
  condition: (typeof productCondition.enumValues)[number];
  askingPriceFils?: number;
  description: string;
};

export type SellOfferInput = SellOffer & {
  name: string;
  phone: string;
  /** Signed tokens for the photos already uploaded (src/lib/inbox/sell-photos.ts). */
  photoTokens: string[];
};

/**
 * The /sell form. Photos come as `photo` tokens, from 1 to `maxPhotos`. Errors are
 * SellProblem codes by field name.
 */
export function parseSellForm(
  form: FormData,
  maxPhotos: number,
): PublicFormResult<SellOfferInput, SellProblem> {
  const parsed = sellSchema.safeParse(stringFields(form));
  const errors = problemsOf<SellProblem>(parsed.error?.issues ?? [], [
    "required",
    "too_long",
    "phone",
    "consent",
    "ownership",
    "year",
    "amount",
  ]);
  const photoTokens = form
    .getAll("photo")
    .filter((value): value is string => typeof value === "string" && value.length <= 200);
  if (photoTokens.length === 0 || photoTokens.length > maxPhotos) errors.photos = "photos";
  if (!parsed.success || Object.keys(errors).length > 0) return { ok: false, errors };
  // Consent and the ownership tick are required to submit, so they aren't kept as fields.
  const { name, phone, brand, model, year, serial, condition, askingPrice, description } =
    parsed.data;
  return {
    ok: true,
    data: {
      name,
      phone,
      photoTokens,
      brand,
      model,
      year,
      serial,
      condition,
      ...(askingPrice !== undefined ? { askingPriceFils: askingPrice } : {}),
      description,
    },
  };
}

/** Saves a guitar offered on /sell, with photos already claimed for the inbox. */
export async function createSellOffer(
  db: Database,
  input: SellOffer & { name: string; phone: string },
  photoKeys: string[],
  locale: Locale,
): Promise<number> {
  const { name, phone } = input;
  // Field by field, so nothing else the caller holds (photo tokens) is stored.
  const payload: SellOffer & { ownershipConfirmed: true; whatsappConsent: true } = {
    brand: input.brand,
    model: input.model,
    year: input.year,
    serial: input.serial,
    condition: input.condition,
    askingPriceFils: input.askingPriceFils,
    description: input.description,
    ownershipConfirmed: true,
    whatsappConsent: true,
  };
  const [row] = await db
    .insert(inboxSubmissions)
    .values({ kind: "sell", name, phoneE164: phone, locale, payload, photoKeys })
    .returning({ id: inboxSubmissions.id });
  return row.id;
}

/** A guitar offer's details, read back from its payload. */
export function sellOfferOf(submission: InboxSubmission): SellOffer | null {
  if (submission.kind !== "sell") return null;
  const payload = submission.payload as Partial<SellOffer> | null;
  if (!payload || typeof payload.brand !== "string" || typeof payload.description !== "string") {
    return null;
  }
  return {
    brand: payload.brand,
    model: payload.model,
    year: payload.year,
    serial: payload.serial,
    condition: payload.condition ?? "good",
    askingPriceFils: payload.askingPriceFils,
    description: payload.description,
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
