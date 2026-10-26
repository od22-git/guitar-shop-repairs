import { and, eq, inArray, isNull, max, ne, or } from "drizzle-orm";

import type { Database } from "../db/connect";
import {
  repairEvents,
  repairQuoteItems,
  repairQuotes,
  repairTickets,
  type RepairDecisionMethod,
} from "../db/schema";

import { RepairError } from "./errors";
import type { QuoteInput } from "./forms";
import { canQuote } from "./state-machine";

// Versioned quotes. Writing a new version supersedes the one before, even an approved
// one, and the new one needs approving again ("extra problem found mid-repair"). A
// decision names the version it is for and applies once: a stale page, a second tap or
// a superseded version is refused with "stale_quote".

/** Adds the next version, pending (or approved, when agreed in person on the spot). */
export async function createQuote(
  db: Database,
  ticketId: number,
  input: QuoteInput,
): Promise<{ id: number; version: number }> {
  const quote = await db.transaction(async (tx) => {
    const [ticket] = await tx
      .select({ status: repairTickets.status })
      .from(repairTickets)
      .where(eq(repairTickets.id, ticketId))
      .for("update");
    if (!ticket) throw new RepairError("not_found");
    if (!canQuote(ticket.status)) throw new RepairError("cannot_quote");

    const [{ last }] = await tx
      .select({ last: max(repairQuotes.version) })
      .from(repairQuotes)
      .where(eq(repairQuotes.ticketId, ticketId));
    await tx
      .update(repairQuotes)
      .set({ status: "superseded" })
      .where(and(eq(repairQuotes.ticketId, ticketId), ne(repairQuotes.status, "superseded")));

    const [row] = await tx
      .insert(repairQuotes)
      .values({
        ticketId,
        version: (last ?? 0) + 1,
        totalFils: input.items.reduce((sum, item) => sum + item.amountFils, 0),
        notes: input.notes ?? null,
      })
      .returning({ id: repairQuotes.id, version: repairQuotes.version });
    await tx
      .insert(repairQuoteItems)
      .values(input.items.map((item, sort) => ({ quoteId: row.id, ...item, sort })));

    // Before diagnosis the quote goes out with the "diagnosed" message; after that, a
    // new version is its own message.
    if (ticket.status !== "received") {
      await tx.insert(repairEvents).values({ ticketId, kind: "quote", quoteId: row.id });
    }
    return row;
  });

  if (input.approvedInPerson) {
    await decideQuote(db, quote.id, {
      version: quote.version,
      decision: "approved",
      method: "in_person",
    });
  }
  return quote;
}

export type QuoteDecision = {
  /** The version the customer saw; anything else is stale. */
  version: number;
  decision: "approved" | "declined";
  method: RepairDecisionMethod;
  /** A hash of the approving IP, for link approvals. */
  ipHash?: string;
  /** Charged on a decline, under the repair terms. */
  diagnosisFeeFils?: number;
};

/**
 * The customer's decision on the tracking page (after the phone check). The quote must
 * be the ticket's own; approving also accepts the repair terms if they weren't accepted
 * at intake (courier customers).
 */
export async function decideQuoteFromLink(
  db: Database,
  ticketId: number,
  input: {
    quoteId: number;
    version: number;
    decision: "approved" | "declined";
    acceptTerms: boolean;
    ipHash: string;
  },
): Promise<void> {
  await db.transaction(async (tx) => {
    const [ticket] = await tx
      .select({ termsAcceptedAt: repairTickets.termsAcceptedAt })
      .from(repairTickets)
      .where(eq(repairTickets.id, ticketId))
      .for("update");
    const [quote] = await tx
      .select({ ticketId: repairQuotes.ticketId })
      .from(repairQuotes)
      .where(eq(repairQuotes.id, input.quoteId));
    if (!ticket || quote?.ticketId !== ticketId) throw new RepairError("not_found");
    const needsTerms = input.decision === "approved" && ticket.termsAcceptedAt === null;
    if (needsTerms && !input.acceptTerms) throw new RepairError("needs_terms");

    await decideQuote(tx, input.quoteId, {
      version: input.version,
      decision: input.decision,
      method: "link",
      ipHash: input.ipHash,
    });
    if (needsTerms) {
      await tx
        .update(repairTickets)
        .set({ termsAcceptedAt: new Date() })
        .where(eq(repairTickets.id, ticketId));
    }
  });
}

/**
 * Sets or clears the diagnosis fee on a ticket whose quote was declined, e.g. after the
 * customer declined on the tracking page.
 */
export async function setDiagnosisFee(
  db: Database,
  ticketId: number,
  feeFils: number | null,
): Promise<void> {
  await db.transaction(async (tx) => {
    const [quote] = await tx
      .select({ status: repairQuotes.status })
      .from(repairQuotes)
      .where(and(eq(repairQuotes.ticketId, ticketId), ne(repairQuotes.status, "superseded")));
    if (quote?.status !== "declined") throw new RepairError("not_declined");
    await tx
      .update(repairTickets)
      .set({ diagnosisFeeFils: feeFils })
      .where(eq(repairTickets.id, ticketId));
  });
}

/** Records the customer's decision, once, on the version they saw. Returns the ticket id. */
export async function decideQuote(
  db: Database,
  quoteId: number,
  decision: QuoteDecision,
): Promise<number> {
  return db.transaction(async (tx) => {
    const [quote] = await tx
      .update(repairQuotes)
      .set({
        status: decision.decision,
        decidedAt: new Date(),
        decisionMethod: decision.method,
        decisionIpHash: decision.ipHash ?? null,
      })
      .where(
        and(
          eq(repairQuotes.id, quoteId),
          eq(repairQuotes.version, decision.version),
          eq(repairQuotes.status, "pending"),
        ),
      )
      .returning({ ticketId: repairQuotes.ticketId });
    if (!quote) {
      const [exists] = await tx
        .select({ id: repairQuotes.id })
        .from(repairQuotes)
        .where(eq(repairQuotes.id, quoteId));
      throw new RepairError(exists ? "stale_quote" : "not_found");
    }

    if (decision.decision === "declined") {
      await tx
        .update(repairTickets)
        .set({ diagnosisFeeFils: decision.diagnosisFeeFils ?? null })
        .where(eq(repairTickets.id, quote.ticketId));
    }
    // A decision taken in person or on WhatsApp means the customer already knows about
    // the quote: its unsent messages are dropped from the list. (After a link approval
    // they had the message, or they couldn't have opened the link.)
    await tx
      .update(repairEvents)
      .set({ notifiedAt: new Date() })
      .where(
        and(
          eq(repairEvents.quoteId, quoteId),
          isNull(repairEvents.notifiedAt),
          or(
            eq(repairEvents.kind, "quote"),
            and(eq(repairEvents.kind, "status"), inArray(repairEvents.toStatus, ["diagnosed"])),
          ),
        ),
      );
    return quote.ticketId;
  });
}
