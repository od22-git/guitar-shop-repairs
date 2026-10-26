import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createPgliteDatabase, type TestDatabase } from "@/test/db";

import type { Database } from "../db/connect";
import { hitRateLimit, pruneRateLimits } from "../rate-limit";
import { RepairError } from "../repairs/errors";
import { createTicket, loadTicket } from "../repairs/tickets";
import { verifyTurnstile } from "../turnstile";

import {
  countNewSubmissions,
  createRepairRequest,
  getSubmission,
  listSubmissions,
  parseRepairRequestForm,
  repairRequestOf,
  setSubmissionStatus,
} from ".";

// Repair bookings from /repairs: the form, the inbox and converting one into a ticket;
// plus the rate limit and Turnstile check that guard the public form.

let test: TestDatabase;
let db: Database;

beforeAll(async () => {
  test = await createPgliteDatabase();
  db = test.db;
}, 30_000);
afterAll(() => test?.close());
beforeEach(() => test.reset());

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
};

const booking = {
  name: " Khalid ",
  phone: "٠٥٠ ١٢٣ ٤٥٦٧",
  instrumentBrand: "Gibson",
  instrumentModel: "",
  issue: "Buzzing on the low E",
  intakeMethod: "drop_off",
  emirate: "dubai",
  whatsappConsent: "on",
};

describe("the booking form", () => {
  it("normalises the phone (Arabic digits too) and keeps only what applies", () => {
    expect(parseRepairRequestForm(form(booking))).toEqual({
      ok: true,
      data: {
        name: "Khalid",
        phone: "+971501234567",
        instrumentBrand: "Gibson",
        instrumentModel: undefined,
        issue: "Buzzing on the low E",
        intakeMethod: "drop_off",
      },
    });
    const courier = parseRepairRequestForm(form({ ...booking, intakeMethod: "courier" }));
    expect(courier.ok && courier.data.emirate).toBe("dubai");
  });

  it("names every problem at once, as codes the page translates", () => {
    expect(
      parseRepairRequestForm(
        form({ phone: "123", issue: "x".repeat(2001), intakeMethod: "courier" }),
      ),
    ).toEqual({
      ok: false,
      errors: {
        name: "required",
        phone: "phone",
        issue: "too_long",
        emirate: "required",
        whatsappConsent: "consent",
      },
    });
    expect(parseRepairRequestForm(form({ ...booking, intakeMethod: "teleport" }))).toEqual({
      ok: false,
      errors: { intakeMethod: "required" },
    });
  });
});

describe("the inbox", () => {
  it("keeps bookings until converted into a ticket, prefilled from them", async () => {
    const parsed = parseRepairRequestForm(form({ ...booking, intakeMethod: "courier" }));
    if (!parsed.ok) throw new Error("expected a valid booking");
    const id = await createRepairRequest(db, parsed.data, "ar");
    expect(await countNewSubmissions(db)).toBe(1);

    const item = await getSubmission(db, id);
    expect(item).toMatchObject({ kind: "repair_request", status: "new", locale: "ar" });
    expect(item && repairRequestOf(item)).toEqual({
      instrumentBrand: "Gibson",
      instrumentModel: undefined,
      issue: "Buzzing on the low E",
      intakeMethod: "courier",
      emirate: "dubai",
    });

    expect(await setSubmissionStatus(db, id, "replied")).toBe(true);
    expect(await countNewSubmissions(db)).toBe(0);
    expect((await listSubmissions(db)).map((row) => row.id)).toEqual([id]);

    const ticket = await createTicket(
      db,
      {
        name: "Khalid",
        phone: "+971501234567",
        preferredLocale: "ar",
        whatsappConsent: true,
        intakeMethod: "courier",
        termsAccepted: false,
        instrumentBrand: "Gibson",
        instrumentModel: undefined,
        serial: undefined,
        colour: undefined,
        issue: "Buzzing on the low E",
        intakeNotes: undefined,
        accessories: undefined,
        etaDate: undefined,
      },
      { fromInboxId: id },
    );
    expect(await getSubmission(db, id)).toMatchObject({
      status: "converted",
      convertedTicketId: ticket.id,
    });
    expect(await listSubmissions(db)).toEqual([]);
    expect(await setSubmissionStatus(db, id, "archived")).toBe(false);

    // Converting twice would make a second ticket: refused, and nothing is saved.
    await expect(
      createTicket(db, { ...(await asInput(ticket.id)) }, { fromInboxId: id }),
    ).rejects.toThrow(new RepairError("already_converted"));
    expect((await listSubmissions(db, "all")).length).toBe(1);
  });
});

async function asInput(ticketId: number) {
  const { ticket, customer } = await loadTicket(db, ticketId);
  return {
    name: customer.name,
    phone: customer.phoneE164,
    preferredLocale: customer.preferredLocale,
    whatsappConsent: true,
    intakeMethod: ticket.intakeMethod,
    termsAccepted: false,
    issue: ticket.issue,
    instrumentBrand: undefined,
    instrumentModel: undefined,
    serial: undefined,
    colour: undefined,
    intakeNotes: undefined,
    accessories: undefined,
    etaDate: undefined,
  };
}

describe("rate limits", () => {
  it("allows `limit` hits per window, then starts over", async () => {
    const start = new Date("2026-10-26T10:00:00Z");
    const at = (seconds: number) => new Date(start.getTime() + seconds * 1000);
    const results = [];
    for (let i = 0; i < 4; i++) results.push(await hitRateLimit(db, "k", 3, 60, at(i)));
    expect(results).toEqual([true, true, true, false]);
    expect(await hitRateLimit(db, "other", 3, 60, at(5))).toBe(true);
    expect(await hitRateLimit(db, "k", 3, 60, at(61))).toBe(true);

    await pruneRateLimits(db, at(2 * 24 * 60 * 60));
    expect(await hitRateLimit(db, "k", 1, 60, at(2 * 24 * 60 * 60))).toBe(true);
  });
});

describe("Turnstile", () => {
  const answer = (body: unknown, status = 200) =>
    (async () => Response.json(body, { status })) as unknown as typeof fetch;

  it("passes only when Cloudflare says success", async () => {
    let sent: URLSearchParams | undefined;
    const fetcher = (async (_url: string, init: RequestInit) => {
      sent = init.body as URLSearchParams;
      return Response.json({ success: true });
    }) as unknown as typeof fetch;
    expect(await verifyTurnstile("secret", "token", "203.0.113.9", fetcher)).toBe(true);
    expect(Object.fromEntries(sent ?? [])).toEqual({
      secret: "secret",
      response: "token",
      remoteip: "203.0.113.9",
    });

    expect(await verifyTurnstile("secret", "token", null, answer({ success: false }))).toBe(false);
    expect(await verifyTurnstile("secret", "token", null, answer({}, 500))).toBe(false);
    expect(await verifyTurnstile("secret", null, null, answer({ success: true }))).toBe(false);
    const offline = (async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;
    expect(await verifyTurnstile("secret", "token", null, offline)).toBe(false);
  });
});
