import type { Payment, RepairQuote, RepairTicket } from "../db/schema";
import { paidFils } from "../orders/totals";

// What a repair costs and what's still owed on it, from its live quote and its payments
// (src/lib/repairs/payments.ts). Shared by the admin and the tracking page.

/** What the repair costs: the approved total, the diagnosis fee after a decline, or null. */
export function ticketChargeFils(
  ticket: Pick<RepairTicket, "diagnosisFeeFils">,
  quote: Pick<RepairQuote, "status" | "totalFils"> | null | undefined,
): number | null {
  if (quote?.status === "approved") return quote.totalFils;
  if (quote?.status === "declined") return ticket.diagnosisFeeFils;
  return null;
}

export type TicketBalance = {
  /** Null until a price is agreed. */
  chargeFils: number | null;
  /** Received, less refunds. */
  paidFils: number;
  /** Still owed; 0 when nothing is agreed yet or it's paid. */
  dueFils: number;
};

export function ticketBalance(
  chargeFils: number | null,
  ledger: readonly Pick<Payment, "kind" | "amountFils">[],
): TicketBalance {
  const paid = paidFils(ledger);
  return { chargeFils, paidFils: paid, dueFils: Math.max((chargeFils ?? 0) - paid, 0) };
}
