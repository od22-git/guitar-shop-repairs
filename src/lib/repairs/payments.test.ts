import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { payments } from "@/lib/db/schema";
import { createPgliteDatabase, type TestDatabase } from "@/test/db";

import type { Database } from "../db/connect";
import { orderCounts } from "../orders";
import type { PaymentInput } from "../orders/forms";
import { toPublicTicket } from "../public-dto";

import { ticketBalance, ticketChargeFils } from "./balance";
import { RepairError } from "./errors";
import type { TicketInput } from "./forms";
import { deleteTicketPayment, recordTicketPayment } from "./payments";
import { createQuote, decideQuote } from "./quotes";
import { createTicket, loadTicket, moveTicket } from "./tickets";

// Payments on repair tickets (M7b): the same ledger as orders, against what the repair
// costs, and the balance the tracking page shows.

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
  serial: undefined,
  colour: undefined,
  issue: "Setup",
  intakeNotes: undefined,
  accessories: undefined,
  etaDate: undefined,
};

const pay = (amountFils: number, kind: PaymentInput["kind"] = "payment"): PaymentInput => ({
  kind,
  method: "cash",
  amountFils,
  receivedAt: new Date(),
});

async function rejects(promise: Promise<unknown>, problem: string) {
  await expect(promise).rejects.toSatisfy(
    (error) => error instanceof RepairError && error.problem === problem,
  );
}

/** A fixed-price job approved at drop-off, for AED 300. */
async function approvedTicket() {
  const { id } = await createTicket(db, intake);
  await createQuote(db, id, {
    items: [{ label: "Full setup", amountFils: 30_000 }],
    approvedInPerson: true,
  });
  return id;
}

const page = async (id: number) => toPublicTicket(await loadTicket(db, id), (file) => file);

describe("what a repair costs", () => {
  it("is the approved total, the diagnosis fee after a decline, or nothing yet", () => {
    const ticket = { diagnosisFeeFils: 5_000 };
    expect(ticketChargeFils(ticket, { status: "approved", totalFils: 30_000 })).toBe(30_000);
    expect(ticketChargeFils(ticket, { status: "declined", totalFils: 30_000 })).toBe(5_000);
    expect(ticketChargeFils({ diagnosisFeeFils: null }, { status: "declined", totalFils: 1 })).toBe(
      null,
    );
    expect(ticketChargeFils(ticket, { status: "pending", totalFils: 30_000 })).toBeNull();
    expect(ticketChargeFils(ticket, null)).toBeNull();
  });

  it("balances against payments less refunds", () => {
    const ledger = [
      { kind: "deposit", amountFils: 10_000 },
      { kind: "payment", amountFils: 5_000 },
      { kind: "refund", amountFils: 2_000 },
    ] as const;
    expect(ticketBalance(30_000, ledger)).toEqual({
      chargeFils: 30_000,
      paidFils: 13_000,
      dueFils: 17_000,
    });
    expect(ticketBalance(null, ledger).dueFils).toBe(0);
  });
});

describe("recording repair payments", () => {
  it("takes nothing but a refund before a price is agreed", async () => {
    const { id } = await createTicket(db, intake);
    await rejects(recordTicketPayment(db, id, pay(1_000, "deposit")), "no_charge");
    await rejects(recordTicketPayment(db, id, pay(1_000, "refund")), "refund_too_large");
    await rejects(recordTicketPayment(db, 999, pay(1_000)), "not_found");
  });

  it("takes up to what's due, and refunds up to what was paid", async () => {
    const id = await approvedTicket();
    await recordTicketPayment(db, id, pay(10_000, "deposit"));
    await rejects(recordTicketPayment(db, id, pay(20_001)), "overpaid");
    await recordTicketPayment(db, id, pay(20_000));
    await rejects(recordTicketPayment(db, id, pay(1)), "overpaid");
    await rejects(recordTicketPayment(db, id, pay(30_001, "refund")), "refund_too_large");
    await recordTicketPayment(db, id, pay(5_000, "refund"));

    const bundle = await loadTicket(db, id);
    expect(bundle.payments.map((p) => [p.kind, p.amountFils, p.ticketId, p.orderId])).toEqual([
      ["deposit", 10_000, id, null],
      ["payment", 20_000, id, null],
      ["refund", 5_000, id, null],
    ]);
    expect(ticketBalance(30_000, bundle.payments).dueFils).toBe(5_000);
  });

  it("keeps a deposit when a new quote version replaces the approved one", async () => {
    const id = await approvedTicket();
    await recordTicketPayment(db, id, pay(10_000, "deposit"));
    const v2 = await createQuote(db, id, {
      items: [
        { label: "Full setup", amountFils: 30_000 },
        { label: "New nut", amountFils: 15_000 },
      ],
      approvedInPerson: false,
    });
    // Waiting on the customer: no price agreed, but the deposit still shows.
    await rejects(recordTicketPayment(db, id, pay(1_000)), "no_charge");
    expect((await page(id)).payment).toEqual({ chargeFils: null, paidFils: 10_000, dueFils: 0 });

    await decideQuote(db, v2.id, {
      version: v2.version,
      decision: "approved",
      method: "whatsapp",
    });
    await recordTicketPayment(db, id, pay(35_000));
    await rejects(recordTicketPayment(db, id, pay(1)), "overpaid");
  });

  it("removes only repair payments", async () => {
    const id = await approvedTicket();
    await recordTicketPayment(db, id, pay(10_000));
    const [row] = await db.select({ id: payments.id }).from(payments);
    expect(await deleteTicketPayment(db, row.id)).toBe(id);
    expect(await deleteTicketPayment(db, row.id)).toBeNull();
  });

  it("counts towards the overview's 12-month total", async () => {
    const id = await approvedTicket();
    await recordTicketPayment(db, id, pay(30_000));
    await recordTicketPayment(db, id, pay(5_000, "refund"));
    expect((await orderCounts(db)).last12MonthsFils).toBe(25_000);
  });
});

describe("the tracking page's balance", () => {
  it("shows the amount due once Ready, then the balance, then paid in full", async () => {
    const id = await approvedTicket();
    expect((await page(id)).payment).toBeNull();

    // A deposit shows before the work is done.
    await recordTicketPayment(db, id, pay(10_000, "deposit"));
    expect((await page(id)).payment).toEqual({
      chargeFils: 30_000,
      paidFils: 10_000,
      dueFils: 20_000,
    });

    await moveTicket(db, id, { expected: "received", to: "in_repair" });
    await moveTicket(db, id, { expected: "in_repair", to: "ready" });
    expect((await page(id)).payment?.dueFils).toBe(20_000);
    await recordTicketPayment(db, id, pay(20_000));
    expect((await page(id)).payment).toEqual({ chargeFils: 30_000, paidFils: 30_000, dueFils: 0 });

    await moveTicket(db, id, { expected: "ready", to: "closed", closeReason: "collected" });
    expect((await page(id)).payment?.dueFils).toBe(0);
  });

  it("shows nothing owed on a closed ticket with nothing paid, or a cancelled one", async () => {
    const collected = await approvedTicket();
    await moveTicket(db, collected, { expected: "received", to: "in_repair" });
    await moveTicket(db, collected, { expected: "in_repair", to: "ready" });
    await moveTicket(db, collected, {
      expected: "ready",
      to: "closed",
      closeReason: "collected",
    });
    expect((await page(collected)).payment).toBeNull();

    const cancelled = await approvedTicket();
    await recordTicketPayment(db, cancelled, pay(10_000, "deposit"));
    await moveTicket(db, cancelled, {
      expected: "received",
      to: "closed",
      closeReason: "cancelled",
    });
    expect((await page(cancelled)).payment).toBeNull();
  });
});
