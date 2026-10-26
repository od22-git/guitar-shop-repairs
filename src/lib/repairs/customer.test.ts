import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { repairPhotos, repairTickets } from "@/lib/db/schema";
import { createPgliteDatabase, type TestDatabase } from "@/test/db";

import type { Database } from "../db/connect";
import { toPublicTicket } from "../public-dto";

import {
  accessCookieValue,
  checkPhoneDigits,
  hasAccess,
  isPublicToken,
  parseLastDigits,
  ticketIdByToken,
} from "./access";
import { repairCounts } from "./dashboard";
import { RepairError } from "./errors";
import type { TicketInput } from "./forms";
import { isValidPhotoLink, signedPhotoUrl } from "./photo-links";
import { createQuote, decideQuoteFromLink, setDiagnosisFee } from "./quotes";
import { createTicket, loadTicket, moveTicket, rotatePublicToken } from "./tickets";

// The customer's side of a repair (M6): the phone check and its lockout, the access
// cookie, signed photo links, decisions on the tracking link and what the page shows.

let test: TestDatabase;
let db: Database;

beforeAll(async () => {
  test = await createPgliteDatabase();
  db = test.db;
}, 30_000);
afterAll(() => test?.close());
beforeEach(() => test.reset());

const SECRET = "a-test-secret-that-is-long-enough-000";

const courierIntake: TicketInput = {
  name: "Omar",
  phone: "+971509876543",
  preferredLocale: "ar",
  whatsappConsent: true,
  intakeMethod: "courier",
  termsAccepted: false,
  instrumentBrand: "Gibson",
  instrumentModel: "Les Paul",
  serial: "0123456789",
  colour: undefined,
  issue: "Crackling volume pot",
  intakeNotes: "Finish checking on the headstock",
  accessories: "Hard case",
  etaDate: undefined,
};

async function ticketWithQuote() {
  const { id } = await createTicket(db, courierIntake);
  const quote = await createQuote(db, id, {
    items: [{ label: "New pot", amountFils: 12_000 }],
    approvedInPerson: false,
  });
  await moveTicket(db, id, { expected: "received", to: "diagnosed" });
  const [{ token }] = await db
    .select({ token: repairTickets.publicToken })
    .from(repairTickets)
    .where(eq(repairTickets.id, id));
  return { id, token, quote };
}

describe("the phone check", () => {
  it("finds tickets only by a well-formed, current token", async () => {
    const { id, token } = await ticketWithQuote();
    expect(isPublicToken(token)).toBe(true);
    expect(await ticketIdByToken(db, token)).toBe(id);
    expect(await ticketIdByToken(db, "R-0001")).toBeNull();
    expect(await ticketIdByToken(db, "A".repeat(22))).toBeNull();
    await rotatePublicToken(db, id);
    expect(await ticketIdByToken(db, token)).toBeNull();
  });

  it("reads 4 digits, Arabic-Indic too", () => {
    expect(parseLastDigits("6543")).toBe("6543");
    expect(parseLastDigits("٦٥٤٣")).toBe("6543");
    expect(parseLastDigits(" 65 43 ")).toBe("6543");
    expect(parseLastDigits("654")).toBeNull();
    expect(parseLastDigits("65a3")).toBeNull();
  });

  it("accepts the last 4 digits of the customer's phone", async () => {
    const { token } = await ticketWithQuote();
    expect(await checkPhoneDigits(db, token, "6543")).toEqual({ ok: true });
  });

  it("locks the ticket for 15 minutes after 5 wrong tries, even for the right digits", async () => {
    const { id, token } = await ticketWithQuote();
    const now = new Date("2026-10-26T10:00:00Z");
    for (const left of [4, 3, 2, 1]) {
      expect(await checkPhoneDigits(db, token, "0000", now)).toEqual({
        ok: false,
        problem: "wrong",
        triesLeft: left,
      });
    }
    const until = new Date("2026-10-26T10:15:00Z");
    expect(await checkPhoneDigits(db, token, "0000", now)).toEqual({
      ok: false,
      problem: "locked",
      until,
    });
    const later = new Date("2026-10-26T10:14:59Z");
    expect(await checkPhoneDigits(db, token, "6543", later)).toEqual({
      ok: false,
      problem: "locked",
      until,
    });

    // Once the lock runs out the right digits work, and the count starts over.
    const after = new Date("2026-10-26T10:15:01Z");
    expect(await checkPhoneDigits(db, token, "0000", after)).toMatchObject({ triesLeft: 4 });
    expect(await checkPhoneDigits(db, token, "6543", after)).toEqual({ ok: true });
    const [row] = await db
      .select({ failures: repairTickets.accessFailures, lock: repairTickets.accessLockedUntil })
      .from(repairTickets)
      .where(eq(repairTickets.id, id));
    expect(row).toEqual({ failures: 0, lock: null });
  });

  it("counts every one of a burst of parallel guesses", async () => {
    const { token } = await ticketWithQuote();
    const results = await Promise.all(
      Array.from({ length: 7 }, () => checkPhoneDigits(db, token, "0000")),
    );
    expect(results.filter((r) => !r.ok && r.problem === "locked")).toHaveLength(3);
    expect(await checkPhoneDigits(db, token, "6543")).toMatchObject({ problem: "locked" });
  });

  it("locks per ticket: another ticket's page still opens", async () => {
    const { token } = await ticketWithQuote();
    const other = await createTicket(db, { ...courierIntake, issue: "Second guitar" });
    const [{ token: otherToken }] = await db
      .select({ token: repairTickets.publicToken })
      .from(repairTickets)
      .where(eq(repairTickets.id, other.id));
    for (let i = 0; i < 5; i++) await checkPhoneDigits(db, token, "0000");
    expect(await checkPhoneDigits(db, otherToken, "6543")).toEqual({ ok: true });
  });
});

describe("the access cookie", () => {
  const now = new Date("2026-10-26T10:00:00Z");

  it("grants access to its own token for 30 days", () => {
    const value = accessCookieValue(SECRET, "token-one-aaaaaaaaaaaa", now);
    expect(hasAccess(SECRET, "token-one-aaaaaaaaaaaa", value, now)).toBe(true);
    const day29 = new Date(now.getTime() + 29 * 24 * 60 * 60 * 1000);
    const day31 = new Date(now.getTime() + 31 * 24 * 60 * 60 * 1000);
    expect(hasAccess(SECRET, "token-one-aaaaaaaaaaaa", value, day29)).toBe(true);
    expect(hasAccess(SECRET, "token-one-aaaaaaaaaaaa", value, day31)).toBe(false);
  });

  it("is refused for another token (a rotated link), another secret, or tampering", () => {
    const value = accessCookieValue(SECRET, "token-one-aaaaaaaaaaaa", now);
    expect(hasAccess(SECRET, "token-two-aaaaaaaaaaaa", value, now)).toBe(false);
    expect(hasAccess(`${SECRET}x`, "token-one-aaaaaaaaaaaa", value, now)).toBe(false);
    const [expires, signature] = value.split(".");
    const extended = `${Number(expires) + 999_999}.${signature}`;
    expect(hasAccess(SECRET, "token-one-aaaaaaaaaaaa", extended, now)).toBe(false);
    expect(hasAccess(SECRET, "token-one-aaaaaaaaaaaa", undefined, now)).toBe(false);
    expect(hasAccess(SECRET, "token-one-aaaaaaaaaaaa", "garbage", now)).toBe(false);
  });
});

describe("signed photo links", () => {
  const file = "repairs/3/0123456789abcdef0123-640.webp";
  const now = new Date("2026-10-26T10:00:00Z");

  it("work for their file for 30 minutes", () => {
    const url = new URL(signedPhotoUrl(SECRET, file, now), "http://localhost");
    expect(url.pathname).toBe(`/api/ticket-photos/${file}`);
    const e = url.searchParams.get("e");
    const s = url.searchParams.get("s");
    expect(isValidPhotoLink(SECRET, file, e, s, now)).toBe(true);
    expect(isValidPhotoLink(SECRET, file, e, s, new Date(now.getTime() + 29 * 60_000))).toBe(true);
    expect(isValidPhotoLink(SECRET, file, e, s, new Date(now.getTime() + 31 * 60_000))).toBe(false);
    expect(isValidPhotoLink(SECRET, file.replace("-640", "-1920"), e, s, now)).toBe(false);
    expect(isValidPhotoLink(SECRET, file, String(Number(e) + 60), s, now)).toBe(false);
    expect(isValidPhotoLink(SECRET, file, e, null, now)).toBe(false);
  });
});

describe("decisions on the tracking link", () => {
  const ipHash = "hashed-ip";

  it("approves the version shown, recording the link, the IP hash and the terms", async () => {
    const { id, quote } = await ticketWithQuote();
    await expect(
      decideQuoteFromLink(db, id, {
        ...quote,
        quoteId: quote.id,
        decision: "approved",
        acceptTerms: false,
        ipHash,
      }),
    ).rejects.toThrow(new RepairError("needs_terms"));

    await decideQuoteFromLink(db, id, {
      quoteId: quote.id,
      version: quote.version,
      decision: "approved",
      acceptTerms: true,
      ipHash,
    });
    const bundle = await loadTicket(db, id);
    expect(bundle.ticket.termsAcceptedAt).toBeInstanceOf(Date);
    expect(bundle.quotes[0]).toMatchObject({
      status: "approved",
      decisionMethod: "link",
      decisionIpHash: ipHash,
    });
    // Once only.
    await expect(
      decideQuoteFromLink(db, id, {
        quoteId: quote.id,
        version: quote.version,
        decision: "declined",
        acceptTerms: true,
        ipHash,
      }),
    ).rejects.toThrow(new RepairError("stale_quote"));
  });

  it("refuses a superseded version, and another ticket's quote", async () => {
    const { id, quote } = await ticketWithQuote();
    await createQuote(db, id, {
      items: [{ label: "New pot and jack", amountFils: 20_000 }],
      approvedInPerson: false,
    });
    await expect(
      decideQuoteFromLink(db, id, {
        quoteId: quote.id,
        version: quote.version,
        decision: "approved",
        acceptTerms: true,
        ipHash,
      }),
    ).rejects.toThrow(new RepairError("stale_quote"));

    const other = await createTicket(db, { ...courierIntake, issue: "Another" });
    await expect(
      decideQuoteFromLink(db, other.id, {
        quoteId: quote.id,
        version: quote.version,
        decision: "approved",
        acceptTerms: true,
        ipHash,
      }),
    ).rejects.toThrow(new RepairError("not_found"));
  });

  it("declines without the terms, and the admin can then set the diagnosis fee", async () => {
    const { id, quote } = await ticketWithQuote();
    await expect(setDiagnosisFee(db, id, 5_000)).rejects.toThrow(new RepairError("not_declined"));
    await decideQuoteFromLink(db, id, {
      quoteId: quote.id,
      version: quote.version,
      decision: "declined",
      acceptTerms: false,
      ipHash,
    });
    expect((await repairCounts(db)).quotesAnswered).toBe(1);
    await setDiagnosisFee(db, id, 5_000);
    await moveTicket(db, id, { expected: "diagnosed", to: "ready" });
    const page = toPublicTicket(await loadTicket(db, id), (file) => `/signed/${file}`);
    expect(page.payment).toEqual({ chargeFils: 5_000, paidFils: 0, dueFils: 5_000 });
    expect(page.termsAccepted).toBe(false);
  });
});

describe("the tracking page's ticket", () => {
  it("leaves out the customer, serial, notes, hidden photos and older quotes", async () => {
    const { id } = await ticketWithQuote();
    await createQuote(db, id, {
      items: [{ label: "New pot and jack", amountFils: 20_000 }],
      approvedInPerson: true,
    });
    await db.insert(repairPhotos).values([
      {
        ticketId: id,
        key: "repairs/1/aaaaaaaaaaaaaaaaaaaa",
        width: 1280,
        height: 960,
        stage: "intake",
      },
      {
        ticketId: id,
        key: "repairs/1/bbbbbbbbbbbbbbbbbbbb",
        width: 1280,
        height: 960,
        stage: "progress",
        customerVisible: true,
      },
    ]);
    const page = toPublicTicket(await loadTicket(db, id), (file) => `/signed/${file}`);
    const json = JSON.stringify(page);
    for (const secret of ["Omar", "+971509876543", "0123456789", "Finish checking", "Hard case"]) {
      expect(json).not.toContain(secret);
    }
    expect(page.quote).toMatchObject({ version: 2, status: "approved", totalFils: 20_000 });
    expect(page.photos).toEqual([
      {
        stage: "progress",
        width: 1280,
        height: 960,
        src: "/signed/repairs/1/bbbbbbbbbbbbbbbbbbbb-640.webp",
        srcLarge: "/signed/repairs/1/bbbbbbbbbbbbbbbbbbbb-1280.webp",
      },
    ]);
    expect(page.events.map((e) => [e.kind, e.toStatus, e.quoteVersion])).toEqual([
      ["status", "received", null],
      ["status", "diagnosed", null],
      ["quote", null, 2],
    ]);
    expect(page.payment).toBeNull();
  });
});
