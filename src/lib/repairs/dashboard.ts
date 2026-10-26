import { and, count, eq, inArray, isNull, lt, ne, sql } from "drizzle-orm";

import type { Database } from "../db/connect";
import { dubaiDateInputValue } from "../datetime";
import { repairEvents, repairQuotes, repairTickets } from "../db/schema";

// Repair numbers for the admin overview, worked out when read (there are no cron jobs).

/** A ticket Ready this long without being collected is flagged. */
export const UNCOLLECTED_AFTER_DAYS = 14;

export async function repairCounts(db: Database, now = new Date()) {
  const today = dubaiDateInputValue(now);
  const readySince = new Date(now.getTime() - UNCOLLECTED_AFTER_DAYS * 24 * 60 * 60 * 1000);
  const [[unsent], [waiting], [answered], [overdue], [uncollected], [open]] = await Promise.all([
    db.select({ n: count() }).from(repairEvents).where(isNull(repairEvents.notifiedAt)),
    db
      .select({ n: count() })
      .from(repairQuotes)
      .innerJoin(repairTickets, eq(repairTickets.id, repairQuotes.ticketId))
      .where(and(eq(repairQuotes.status, "pending"), ne(repairTickets.status, "closed"))),
    // The customer has answered (often on the tracking link): start the repair, or get
    // it ready to collect.
    db
      .select({ n: count() })
      .from(repairQuotes)
      .innerJoin(repairTickets, eq(repairTickets.id, repairQuotes.ticketId))
      .where(
        and(
          inArray(repairQuotes.status, ["approved", "declined"]),
          eq(repairTickets.status, "diagnosed"),
        ),
      ),
    db
      .select({ n: count() })
      .from(repairTickets)
      .where(
        and(
          inArray(repairTickets.status, ["received", "diagnosed", "in_repair"]),
          lt(repairTickets.etaDate, today),
        ),
      ),
    db
      .select({ n: count() })
      .from(repairTickets)
      .where(
        and(
          eq(repairTickets.status, "ready"),
          // When it last became Ready.
          lt(
            sql`(select max(${repairEvents.createdAt}) from ${repairEvents} where ${repairEvents.ticketId} = ${repairTickets.id} and ${repairEvents.toStatus} = 'ready')`,
            readySince.toISOString(),
          ),
        ),
      ),
    db.select({ n: count() }).from(repairTickets).where(ne(repairTickets.status, "closed")),
  ]);
  return {
    unsent: unsent.n,
    quotesWaiting: waiting.n,
    quotesAnswered: answered.n,
    pastEta: overdue.n,
    uncollected: uncollected.n,
    open: open.n,
  };
}
