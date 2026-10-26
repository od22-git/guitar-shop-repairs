import { randomBytes } from "node:crypto";

import { and, asc, desc, eq, inArray, isNull, ne, sql } from "drizzle-orm";

import type { Database } from "../db/connect";
import {
  customers,
  repairEvents,
  repairPhotos,
  repairQuoteItems,
  repairQuotes,
  repairTickets,
  type RepairCloseReason,
  type RepairQuote,
  type RepairStatus,
  type RepairTicket,
} from "../db/schema";

import { markConverted } from "../inbox";

import { RepairError } from "./errors";
import type { TicketDetailsInput, TicketInput, UpdateInput } from "./forms";
import { moveProblem, undoTarget, type CurrentQuote } from "./state-machine";

// Repair tickets in the admin: intake, status changes through the state machine, Post
// update, Undo and the tracking link. Every change that the customer should hear about
// adds an event, which stays on the unsent list until its WhatsApp message is sent
// (src/lib/repairs/notify.ts). Changes run in a transaction on the locked ticket, so two
// taps at once can't both apply.

/** 128 random bits for the tracking link, never derived from the ticket number. */
export function newPublicToken(): string {
  return randomBytes(16).toString("base64url");
}

/** The ticket, locked for the rest of the transaction. */
async function lockTicket(tx: Database, id: number): Promise<RepairTicket> {
  const [ticket] = await tx
    .select()
    .from(repairTickets)
    .where(eq(repairTickets.id, id))
    .for("update");
  if (!ticket) throw new RepairError("not_found");
  return ticket;
}

/** The live (latest, not superseded) quote, if there is one. */
export async function currentQuote(db: Database, ticketId: number): Promise<RepairQuote | null> {
  const [quote] = await db
    .select()
    .from(repairQuotes)
    .where(and(eq(repairQuotes.ticketId, ticketId), ne(repairQuotes.status, "superseded")));
  return quote ?? null;
}

export const quoteState = (quote: RepairQuote | null): CurrentQuote =>
  quote ? (quote.status as Exclude<RepairQuote["status"], "superseded">) : "none";

const nullable = <T>(value: T | undefined) => value ?? null;

function detailColumns(input: TicketDetailsInput) {
  return {
    instrumentBrand: nullable(input.instrumentBrand),
    instrumentModel: nullable(input.instrumentModel),
    serial: nullable(input.serial),
    colour: nullable(input.colour),
    issue: input.issue,
    intakeNotes: nullable(input.intakeNotes),
    accessories: nullable(input.accessories),
    etaDate: nullable(input.etaDate),
  };
}

/**
 * Opens a ticket. A returning customer is matched on their phone number and their name
 * and language are updated to what was entered; WhatsApp consent, once given, is kept.
 * `fromInboxId` is the online booking it was converted from, marked converted with it.
 */
export async function createTicket(
  db: Database,
  input: TicketInput,
  { fromInboxId }: { fromInboxId?: number } = {},
): Promise<{ id: number; number: string }> {
  return db.transaction(async (tx) => {
    const now = new Date();
    const [customer] = await tx
      .insert(customers)
      .values({
        name: input.name,
        phoneE164: input.phone,
        preferredLocale: input.preferredLocale,
        whatsappConsentAt: input.whatsappConsent ? now : null,
      })
      .onConflictDoUpdate({
        target: customers.phoneE164,
        set: {
          name: input.name,
          preferredLocale: input.preferredLocale,
          whatsappConsentAt: sql`coalesce(${customers.whatsappConsentAt}, excluded.whatsapp_consent_at)`,
        },
      })
      .returning({ id: customers.id });

    const [ticket] = await tx
      .insert(repairTickets)
      .values({
        // R-0001 … R-9999, then R-10000 and on.
        number: sql`(select 'R-' || lpad(n::text, greatest(4, length(n::text)), '0') from nextval('repair_ticket_number_seq') as n)`,
        publicToken: newPublicToken(),
        customerId: customer.id,
        intakeMethod: input.intakeMethod,
        termsAcceptedAt: input.termsAccepted ? now : null,
        ...detailColumns(input),
      })
      .returning({ id: repairTickets.id, number: repairTickets.number });

    await tx.insert(repairEvents).values({
      ticketId: ticket.id,
      kind: "status",
      fromStatus: null,
      toStatus: "received",
      etaDate: nullable(input.etaDate),
    });
    if (fromInboxId !== undefined && !(await markConverted(tx, fromInboxId, ticket.id))) {
      throw new RepairError("already_converted");
    }
    return ticket;
  });
}

export async function updateTicketDetails(
  db: Database,
  id: number,
  input: TicketDetailsInput,
): Promise<void> {
  const updated = await db
    .update(repairTickets)
    .set(detailColumns(input))
    .where(eq(repairTickets.id, id))
    .returning({ id: repairTickets.id });
  if (updated.length === 0) throw new RepairError("not_found");
}

/**
 * Moves the ticket to another status, if the state machine allows it from the status and
 * quote it has now. `expected` is the status the admin saw, so a stale page can't apply
 * a move meant for an earlier state.
 */
export async function moveTicket(
  db: Database,
  id: number,
  move: {
    expected: RepairStatus;
    to: RepairStatus;
    closeReason?: RepairCloseReason;
    note?: string;
  },
): Promise<void> {
  await db.transaction(async (tx) => {
    const ticket = await lockTicket(tx, id);
    if (ticket.status !== move.expected) throw new RepairError("not_allowed");
    const quote = await currentQuote(tx, id);
    const problem = moveProblem({ status: ticket.status, quote: quoteState(quote) }, move);
    if (problem) throw new RepairError(problem);

    const closeReason = move.to === "closed" ? (move.closeReason ?? null) : null;
    await tx
      .update(repairTickets)
      .set({ status: move.to, closeReason })
      .where(eq(repairTickets.id, id));
    await tx.insert(repairEvents).values({
      ticketId: id,
      kind: "status",
      fromStatus: ticket.status,
      toStatus: move.to,
      closeReason,
      quoteId: quote?.id ?? null,
      publicNote: move.note ?? null,
    });
  });
}

/**
 * Undoes the latest status change that hasn't been undone, with a correction event. If
 * the customer was never told about the mistaken change, neither message needs sending.
 */
export async function undoLastStatus(db: Database, id: number): Promise<RepairStatus> {
  return db.transaction(async (tx) => {
    const ticket = await lockTicket(tx, id);
    const events = await tx
      .select()
      .from(repairEvents)
      .where(eq(repairEvents.ticketId, id))
      .orderBy(asc(repairEvents.id));
    const target = undoTarget(events);
    if (!target || target.from !== ticket.status) throw new RepairError("nothing_to_undo");

    const undone = events.find((event) => event.id === target.eventId);
    const unsent = undone?.notifiedAt === null;
    const now = new Date();
    if (unsent) {
      await tx
        .update(repairEvents)
        .set({ notifiedAt: now })
        .where(eq(repairEvents.id, target.eventId));
    }
    await tx
      .update(repairTickets)
      .set({ status: target.to, closeReason: null })
      .where(eq(repairTickets.id, id));
    await tx.insert(repairEvents).values({
      ticketId: id,
      kind: "correction",
      fromStatus: target.from,
      toStatus: target.to,
      notifiedAt: unsent ? now : null,
    });
    return target.to;
  });
}

/**
 * A note with no status change ("waiting for parts"), optionally with a new ETA. A note
 * only for the admin needs no message, so it isn't left unsent.
 */
export async function postUpdate(db: Database, id: number, input: UpdateInput): Promise<void> {
  if (!input.publicNote && !input.internalNote && !input.etaDate)
    throw new RepairError("empty_update");
  await db.transaction(async (tx) => {
    const ticket = await lockTicket(tx, id);
    if (ticket.status === "closed") throw new RepairError("closed");
    if (input.etaDate) {
      await tx
        .update(repairTickets)
        .set({ etaDate: input.etaDate })
        .where(eq(repairTickets.id, id));
    }
    const forCustomer = Boolean(input.publicNote || input.etaDate);
    await tx.insert(repairEvents).values({
      ticketId: id,
      kind: "update",
      publicNote: nullable(input.publicNote),
      internalNote: nullable(input.internalNote),
      etaDate: nullable(input.etaDate),
      notifiedAt: forCustomer ? null : new Date(),
    });
  });
}

/** A new tracking link; the old one stops working at once (M6 looks tickets up by it). */
export async function rotatePublicToken(db: Database, id: number): Promise<string> {
  const token = newPublicToken();
  const updated = await db
    .update(repairTickets)
    .set({ publicToken: token })
    .where(eq(repairTickets.id, id))
    .returning({ id: repairTickets.id });
  if (updated.length === 0) throw new RepairError("not_found");
  return token;
}

/** Marks an event's message as sent (or as not needed). Returns its ticket id. */
export async function markNotified(db: Database, eventId: number): Promise<number> {
  const [event] = await db
    .update(repairEvents)
    .set({ notifiedAt: sql`coalesce(${repairEvents.notifiedAt}, now())` })
    .where(eq(repairEvents.id, eventId))
    .returning({ ticketId: repairEvents.ticketId });
  if (!event) throw new RepairError("not_found");
  return event.ticketId;
}

/** Everything the admin's ticket page shows. */
export async function loadTicket(db: Database, id: number) {
  const [row] = await db
    .select({ ticket: repairTickets, customer: customers })
    .from(repairTickets)
    .innerJoin(customers, eq(customers.id, repairTickets.customerId))
    .where(eq(repairTickets.id, id));
  if (!row) throw new RepairError("not_found");

  const [quotes, events, photos] = await Promise.all([
    db
      .select()
      .from(repairQuotes)
      .where(eq(repairQuotes.ticketId, id))
      .orderBy(desc(repairQuotes.version)),
    db
      .select()
      .from(repairEvents)
      .where(eq(repairEvents.ticketId, id))
      .orderBy(asc(repairEvents.id)),
    db
      .select()
      .from(repairPhotos)
      .where(eq(repairPhotos.ticketId, id))
      .orderBy(asc(repairPhotos.id)),
  ]);
  const items =
    quotes.length === 0
      ? []
      : await db
          .select()
          .from(repairQuoteItems)
          .where(
            inArray(
              repairQuoteItems.quoteId,
              quotes.map((quote) => quote.id),
            ),
          )
          .orderBy(asc(repairQuoteItems.sort), asc(repairQuoteItems.id));

  return {
    ...row,
    quotes: quotes.map((quote) => ({
      ...quote,
      items: items.filter((item) => item.quoteId === quote.id),
    })),
    events,
    photos,
  };
}

export type TicketBundle = Awaited<ReturnType<typeof loadTicket>>;

/** Events still waiting for their WhatsApp message, oldest first. */
export async function unsentEvents(db: Database, ticketId?: number) {
  return db
    .select({ event: repairEvents, number: repairTickets.number, customerName: customers.name })
    .from(repairEvents)
    .innerJoin(repairTickets, eq(repairTickets.id, repairEvents.ticketId))
    .innerJoin(customers, eq(customers.id, repairTickets.customerId))
    .where(
      and(
        isNull(repairEvents.notifiedAt),
        ticketId === undefined ? undefined : eq(repairEvents.ticketId, ticketId),
      ),
    )
    .orderBy(asc(repairEvents.id));
}
