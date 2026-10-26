import { and, eq, ne, sql } from "drizzle-orm";

import type { Database } from "../db/connect";
import { payments, repairQuotes, repairTickets } from "../db/schema";
import type { PaymentInput } from "../orders/forms";

import { ticketBalance, ticketChargeFils } from "./balance";
import { RepairError } from "./errors";

// Money for a repair, recorded by hand on the ticket in the same ledger as orders
// (`payments.ticket_id`). What the customer owes is the approved quote's total or, after
// a decline, the diagnosis fee; until one of those is agreed nothing is owed, so nothing
// but a refund can be recorded. The balance is calculated from the ledger, never stored.

/**
 * Records money received for, or given back on, a repair. Nothing can take more than is
 * still owed, or refund more than was paid. The ticket is locked, so two taps at once
 * can't both pass the check.
 */
export async function recordTicketPayment(
  db: Database,
  ticketId: number,
  input: PaymentInput,
): Promise<void> {
  await db.transaction(async (tx) => {
    const [ticket] = await tx
      .select()
      .from(repairTickets)
      .where(eq(repairTickets.id, ticketId))
      .for("update");
    if (!ticket) throw new RepairError("not_found");
    const [quote] = await tx
      .select()
      .from(repairQuotes)
      .where(and(eq(repairQuotes.ticketId, ticketId), ne(repairQuotes.status, "superseded")));
    const ledger = await tx
      .select({ kind: payments.kind, amountFils: payments.amountFils })
      .from(payments)
      .where(eq(payments.ticketId, ticketId));
    const balance = ticketBalance(ticketChargeFils(ticket, quote), ledger);

    if (input.kind === "refund") {
      if (input.amountFils > balance.paidFils) throw new RepairError("refund_too_large");
    } else {
      if (balance.chargeFils === null) throw new RepairError("no_charge");
      if (input.amountFils > balance.dueFils) throw new RepairError("overpaid");
    }
    await tx.insert(payments).values({
      ticketId,
      kind: input.kind,
      method: input.method,
      amountFils: input.amountFils,
      receivedAt: input.receivedAt,
      providerRef: input.providerRef ?? null,
      note: input.note ?? null,
    });
  });
}

/** Removes a repair payment recorded by mistake. Returns its ticket, or null if it was gone. */
export async function deleteTicketPayment(db: Database, paymentId: number): Promise<number | null> {
  const [deleted] = await db
    .delete(payments)
    .where(and(eq(payments.id, paymentId), sql`${payments.ticketId} is not null`))
    .returning({ ticketId: payments.ticketId });
  return deleted?.ticketId ?? null;
}
