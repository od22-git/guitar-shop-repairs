import { asc, eq } from "drizzle-orm";
import sharp from "sharp";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { customers, repairEvents, repairQuotes, repairTickets } from "@/lib/db/schema";
import { createPgliteDatabase, type TestDatabase } from "@/test/db";

import type { Database } from "../db/connect";
import type { Storage } from "../storage/types";

import { repairCounts } from "./dashboard";
import { RepairError } from "./errors";
import { parseQuoteForm, parseTicketForm, parseUpdateForm, type TicketInput } from "./forms";
import { eventMessage } from "./notify";
import { addRepairPhoto, deleteRepairPhoto, isRepairPhotoFile } from "./photos";
import { createQuote, decideQuote } from "./quotes";
import {
  createTicket,
  loadTicket,
  markNotified,
  moveTicket,
  postUpdate,
  rotatePublicToken,
  undoLastStatus,
  unsentEvents,
} from "./tickets";

let test: TestDatabase;
let db: Database;

beforeAll(async () => {
  test = await createPgliteDatabase();
  db = test.db;
}, 30_000);
afterAll(() => test?.close());
beforeEach(() => test.reset());

const intake: TicketInput = {
  name: "Sara",
  phone: "+971501234567",
  preferredLocale: "en",
  whatsappConsent: true,
  intakeMethod: "drop_off",
  termsAccepted: true,
  instrumentBrand: "Fender",
  instrumentModel: "Jazzmaster",
  serial: "MX21012345",
  colour: undefined,
  issue: "Buzzing on the low E",
  intakeNotes: "Small ding on the back, photographed",
  accessories: "Gig bag, strap",
  etaDate: undefined,
};

const item = (label: string, amountFils: number) => ({ label, amountFils });
const quote = (items = [item("Setup", 25_000)], approvedInPerson = false) => ({
  items,
  approvedInPerson,
});

async function rejects(promise: Promise<unknown>, problem: string) {
  await expect(promise).rejects.toSatisfy(
    (error) => error instanceof RepairError && error.problem === problem,
  );
}

function form(entries: [string, string][]): FormData {
  const data = new FormData();
  for (const [key, value] of entries) data.append(key, value);
  return data;
}

const status = async (id: number) =>
  (await db.select().from(repairTickets).where(eq(repairTickets.id, id)))[0];

describe("intake", () => {
  it("numbers tickets R-0001 onwards, with an unguessable tracking token", async () => {
    const first = await createTicket(db, intake);
    const second = await createTicket(db, intake);
    expect([first.number, second.number]).toEqual(["R-0001", "R-0002"]);
    const ticket = await status(first.id);
    expect(ticket.publicToken).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(ticket.publicToken).not.toContain("0001");
    expect(ticket.status).toBe("received");
  });

  it("matches a returning customer by their normalised phone number", async () => {
    await createTicket(db, intake);
    const typed = parseTicketForm(
      form([
        ["name", "Sara A."],
        ["phone", "٠٥٠ ١٢٣ ٤٥٦٧"],
        ["preferredLocale", "ar"],
        ["intakeMethod", "courier"],
        ["issue", "Bass needs a setup"],
      ]),
    );
    expect(typed.ok).toBe(true);
    if (!typed.ok) return;
    expect(typed.data.phone).toBe("+971501234567");
    await createTicket(db, typed.data);

    const rows = await db.select().from(customers);
    expect(rows).toHaveLength(1);
    // Latest name and language; the consent given earlier is kept.
    expect(rows[0]).toMatchObject({ name: "Sara A.", preferredLocale: "ar" });
    expect(rows[0].whatsappConsentAt).toBeInstanceOf(Date);
    expect(await db.select().from(repairTickets)).toHaveLength(2);
  });

  it("takes a foreign mobile number, and refuses landlines and junk", () => {
    const parse = (phone: string) =>
      parseTicketForm(
        form([
          ["name", "A"],
          ["phone", phone],
          ["preferredLocale", "en"],
          ["intakeMethod", "courier"],
          ["issue", "x"],
        ]),
      );
    const saudi = parse("+966 50 123 4567");
    expect(saudi.ok && saudi.data.phone).toBe("+966501234567");
    expect(parse("07 228 0000").ok).toBe(false);
    expect(parse("hello").ok).toBe(false);
  });

  it("records the terms acceptance time, required at drop-off (damage disputes)", async () => {
    const missing = parseTicketForm(
      form([
        ["name", "A"],
        ["phone", "0501234567"],
        ["preferredLocale", "en"],
        ["intakeMethod", "drop_off"],
        ["issue", "x"],
      ]),
    );
    expect(missing.ok === false && missing.errors.termsAccepted).toBeTruthy();

    const { id } = await createTicket(db, intake);
    const ticket = await status(id);
    expect(ticket.termsAcceptedAt).toBeInstanceOf(Date);
    expect(ticket.accessories).toBe("Gig bag, strap");
    expect(ticket.intakeNotes).toContain("ding");
  });
});

describe("the repair walkthrough", () => {
  it("runs a full repair: diagnose, approve in person, repair, ready, collected", async () => {
    const { id } = await createTicket(db, intake);
    await rejects(moveTicket(db, id, { expected: "received", to: "diagnosed" }), "needs_quote");
    const q = await createQuote(db, id, quote([item("Setup", 25_000), item("Strings", 5_000)]));
    expect(q.version).toBe(1);
    await moveTicket(db, id, { expected: "received", to: "diagnosed" });
    await rejects(moveTicket(db, id, { expected: "diagnosed", to: "in_repair" }), "needs_approval");
    await decideQuote(db, q.id, { version: 1, decision: "approved", method: "in_person" });
    await moveTicket(db, id, { expected: "diagnosed", to: "in_repair" });
    await moveTicket(db, id, { expected: "in_repair", to: "ready" });
    await moveTicket(db, id, { expected: "ready", to: "closed", closeReason: "collected" });

    const bundle = await loadTicket(db, id);
    expect(bundle.ticket).toMatchObject({ status: "closed", closeReason: "collected" });
    expect(bundle.quotes[0]).toMatchObject({ totalFils: 30_000, status: "approved" });
    expect(bundle.quotes[0].items.map((i) => i.label)).toEqual(["Setup", "Strings"]);
    expect(bundle.events.map((e) => e.toStatus)).toEqual([
      "received",
      "diagnosed",
      "in_repair",
      "ready",
      "closed",
    ]);
    // Approved in person: the "diagnosed" quote message is no longer needed.
    const unsent = (await unsentEvents(db, id)).map((row) => row.event.toStatus);
    expect(unsent).toEqual(["received", "in_repair", "ready", "closed"]);
  });

  it("starts a simple fixed-price job at once when approved in person at drop-off", async () => {
    const { id } = await createTicket(db, intake);
    await createQuote(db, id, quote([item("Setup", 25_000)], true));
    await moveTicket(db, id, { expected: "received", to: "in_repair" });
    expect((await status(id)).status).toBe("in_repair");
  });

  it("needs approval again for a new version found mid-repair", async () => {
    const { id } = await createTicket(db, intake);
    const v1 = await createQuote(db, id, quote([item("Setup", 25_000)], true));
    await moveTicket(db, id, { expected: "received", to: "in_repair" });

    const v2 = await createQuote(
      db,
      id,
      quote([item("Setup", 25_000), item("Fret level", 40_000)]),
    );
    expect(v2.version).toBe(2);
    const quotes = await db
      .select()
      .from(repairQuotes)
      .where(eq(repairQuotes.ticketId, id))
      .orderBy(asc(repairQuotes.version));
    expect(quotes.map((q) => q.status)).toEqual(["superseded", "pending"]);
    await rejects(moveTicket(db, id, { expected: "in_repair", to: "ready" }), "quote_pending");
    // The new version is its own message, with the approval link.
    const [message] = (await unsentEvents(db, id)).filter((row) => row.event.kind === "quote");
    expect(message.event.quoteId).toBe(v2.id);

    // The superseded version can't be decided any more.
    await rejects(
      decideQuote(db, v1.id, { version: 1, decision: "approved", method: "whatsapp" }),
      "stale_quote",
    );
    await decideQuote(db, v2.id, { version: 2, decision: "approved", method: "whatsapp" });
    await moveTicket(db, id, { expected: "in_repair", to: "ready" });
  });

  it("sends a declined quote to Ready with a diagnosis fee, then closes", async () => {
    const { id } = await createTicket(db, intake);
    const q = await createQuote(db, id, quote([item("Rewire", 60_000)]));
    await moveTicket(db, id, { expected: "received", to: "diagnosed" });
    await decideQuote(db, q.id, {
      version: 1,
      decision: "declined",
      method: "whatsapp",
      diagnosisFeeFils: 5_000,
    });
    await rejects(moveTicket(db, id, { expected: "diagnosed", to: "in_repair" }), "needs_approval");
    await moveTicket(db, id, { expected: "diagnosed", to: "ready" });

    const bundle = await loadTicket(db, id);
    const ready = bundle.events.at(-1)!;
    expect(eventMessage("https://shop.example", bundle, ready).text).toContain("AED 50");
    await moveTicket(db, id, { expected: "ready", to: "closed", closeReason: "collected" });
  });

  it("decides a quote once, for the version the customer saw", async () => {
    const { id } = await createTicket(db, intake);
    const v1 = await createQuote(db, id, quote());
    // The quote changed while their page was open.
    await rejects(
      decideQuote(db, v1.id, { version: 2, decision: "approved", method: "link" }),
      "stale_quote",
    );
    await decideQuote(db, v1.id, { version: 1, decision: "approved", method: "link", ipHash: "h" });
    // Approving twice.
    await rejects(
      decideQuote(db, v1.id, { version: 1, decision: "approved", method: "link" }),
      "stale_quote",
    );
    await rejects(
      decideQuote(db, 999, { version: 1, decision: "approved", method: "link" }),
      "not_found",
    );
    const [row] = await db.select().from(repairQuotes).where(eq(repairQuotes.id, v1.id));
    expect(row).toMatchObject({ status: "approved", decisionMethod: "link", decisionIpHash: "h" });
  });

  it("posts an update with a new ETA and its own message", async () => {
    const { id } = await createTicket(db, intake);
    await postUpdate(db, id, { publicNote: "Waiting for parts", etaDate: "2026-11-20" });
    expect((await status(id)).etaDate).toBe("2026-11-20");
    const bundle = await loadTicket(db, id);
    const update = bundle.events.at(-1)!;
    expect(update).toMatchObject({ kind: "update", notifiedAt: null });
    const { text, href } = eventMessage("https://shop.example", bundle, update);
    expect(text).toContain("Waiting for parts");
    expect(text).toContain("20 November 2026");
    expect(href.startsWith("https://wa.me/971501234567?text=")).toBe(true);

    // An internal note alone has nothing to send.
    await postUpdate(db, id, { internalNote: "Ordered from supplier" });
    expect((await loadTicket(db, id)).events.at(-1)!.notifiedAt).toBeInstanceOf(Date);
    expect(parseUpdateForm(form([["publicNote", " "]])).ok).toBe(false);
  });

  it("undoes a wrong status with a correction, never deleting history", async () => {
    const { id } = await createTicket(db, intake);
    await createQuote(db, id, quote([item("Setup", 25_000)], true));
    await moveTicket(db, id, { expected: "received", to: "in_repair" });
    await moveTicket(db, id, { expected: "in_repair", to: "ready" });
    // The customer already heard "ready": the correction is a message too.
    const readyEvent = (await loadTicket(db, id)).events.at(-1)!;
    await markNotified(db, readyEvent.id);

    expect(await undoLastStatus(db, id)).toBe("in_repair");
    let bundle = await loadTicket(db, id);
    expect(bundle.ticket.status).toBe("in_repair");
    expect(bundle.events.map((e) => e.kind)).toEqual(["status", "status", "status", "correction"]);
    expect(bundle.events.at(-1)).toMatchObject({
      fromStatus: "ready",
      toStatus: "in_repair",
      notifiedAt: null,
    });

    // Undo again: never told about "in repair", so neither message needs sending.
    expect(await undoLastStatus(db, id)).toBe("received");
    bundle = await loadTicket(db, id);
    expect(bundle.events.at(-1)!.notifiedAt).toBeInstanceOf(Date);
    expect(bundle.events[1].notifiedAt).toBeInstanceOf(Date);
    await rejects(undoLastStatus(db, id), "nothing_to_undo");
  });

  it("undoes a close, clearing the reason", async () => {
    const { id } = await createTicket(db, intake);
    await moveTicket(db, id, { expected: "received", to: "closed", closeReason: "cancelled" });
    await rejects(postUpdate(db, id, { publicNote: "x" }), "closed");
    await rejects(createQuote(db, id, quote()), "cannot_quote");
    await undoLastStatus(db, id);
    expect(await status(id)).toMatchObject({ status: "received", closeReason: null });
  });

  it("refuses a move made from a stale page", async () => {
    const { id } = await createTicket(db, intake);
    await createQuote(db, id, quote());
    await moveTicket(db, id, { expected: "received", to: "diagnosed" });
    await rejects(moveTicket(db, id, { expected: "received", to: "diagnosed" }), "not_allowed");
  });

  it("closes an uncollected instrument as abandoned only once it's ready", async () => {
    const { id } = await createTicket(db, intake);
    await rejects(
      moveTicket(db, id, { expected: "received", to: "closed", closeReason: "abandoned" }),
      "bad_reason",
    );
    await createQuote(db, id, quote([item("Setup", 25_000)], true));
    await moveTicket(db, id, { expected: "received", to: "in_repair" });
    await moveTicket(db, id, { expected: "in_repair", to: "ready" });

    // Flagged on the dashboard after two weeks at Ready.
    const later = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
    expect((await repairCounts(db)).uncollected).toBe(0);
    expect((await repairCounts(db, later)).uncollected).toBe(1);
    await moveTicket(db, id, { expected: "ready", to: "closed", closeReason: "abandoned" });
    expect((await repairCounts(db, later)).uncollected).toBe(0);
  });

  it("rotates the tracking link", async () => {
    const { id } = await createTicket(db, intake);
    const before = (await status(id)).publicToken;
    const after = await rotatePublicToken(db, id);
    expect(after).not.toBe(before);
    expect((await status(id)).publicToken).toBe(after);
  });
});

describe("the dashboard", () => {
  it("counts unsent messages, waiting quotes and tickets past their ETA", async () => {
    const a = await createTicket(db, { ...intake, etaDate: "2026-01-01" });
    await createTicket(db, { ...intake, etaDate: "2999-01-01" });
    await createQuote(db, a.id, quote());
    await moveTicket(db, a.id, { expected: "received", to: "diagnosed" });

    const counts = await repairCounts(db);
    expect(counts).toMatchObject({ unsent: 3, quotesWaiting: 1, pastEta: 1, open: 2 });

    // Each tap on Send clears one.
    for (const row of await unsentEvents(db)) await markNotified(db, row.event.id);
    expect((await repairCounts(db)).unsent).toBe(0);
  });
});

describe("the quote builder", () => {
  it("reads rows in order, skipping blank ones", () => {
    const parsed = parseQuoteForm(
      form([
        ["itemLabel", "Setup"],
        ["itemAmount", "250"],
        ["itemLabel", ""],
        ["itemAmount", ""],
        ["itemLabel", "Nut"],
        ["itemAmount", "1,200.50"],
        ["approvedInPerson", "on"],
      ]),
    );
    expect(parsed).toEqual({
      ok: true,
      data: {
        items: [item("Setup", 25_000), item("Nut", 120_050)],
        notes: undefined,
        approvedInPerson: true,
      },
    });
  });

  it("names the row with the problem", () => {
    const parsed = parseQuoteForm(
      form([
        ["itemLabel", "Setup"],
        ["itemAmount", "abc"],
        ["itemLabel", ""],
        ["itemAmount", "10"],
      ]),
    );
    expect(parsed).toEqual({
      ok: false,
      errors: { "itemAmount.0": expect.any(String), "itemLabel.1": "Describe the work" },
    });
    expect(parseQuoteForm(form([])).ok).toBe(false);
  });
});

describe("repair photos", () => {
  it("keeps them in the private bucket, without EXIF", async () => {
    const files = new Map<string, Buffer>();
    const storage: Storage = {
      put: async (bucket, key, body) => void files.set(`${bucket}:${key}`, body),
      get: async (bucket, key) => files.get(`${bucket}:${key}`) ?? null,
      delete: async (bucket, keys) => keys.forEach((key) => files.delete(`${bucket}:${key}`)),
    };
    const { id } = await createTicket(db, intake);
    const jpeg = await sharp({
      create: { width: 800, height: 600, channels: 3, background: "#123" },
    })
      .jpeg()
      .withExifMerge({ IFD3: { GPSLatitudeRef: "N", GPSLatitude: "25/1 47/1 0/1" } })
      .toBuffer();

    const photo = await addRepairPhoto(db, storage, id, "intake", jpeg);
    const keys = [...files.keys()];
    expect(keys.every((key) => key.startsWith(`private:repairs/${id}/`))).toBe(true);
    expect(keys.some((key) => key.endsWith("-og.jpg"))).toBe(false);
    expect(keys.every((key) => isRepairPhotoFile(key.slice("private:".length)))).toBe(true);
    const meta = await sharp(files.values().next().value!).metadata();
    expect(meta.exif).toBeUndefined();
    expect(photo.customerVisible).toBe(false);

    await deleteRepairPhoto(db, storage, photo.id);
    expect(files.size).toBe(0);
    expect(await db.select().from(repairEvents).where(eq(repairEvents.kind, "update"))).toEqual([]);
  });
});
