import type { RepairCloseReason, RepairQuoteStatus, RepairStatus } from "../db/schema";

// How a repair ticket moves: received → diagnosed → in_repair → ready → closed, with the
// quote deciding what may happen next. Pure rules, used by src/lib/repairs/tickets.ts
// (inside a transaction, on the locked ticket) and by the admin to offer only the moves
// that would work.
//
//   received  → diagnosed   once there's a quote
//   received  → in_repair   a fixed-price job approved at drop-off
//   diagnosed → in_repair   the quote is approved
//   diagnosed → ready       the quote is declined: ready to collect, unrepaired
//   in_repair → ready       nothing waiting on the customer (no pending new version)
//   ready     → closed      collected, delivered, or abandoned under the repair terms
//   open      → closed      cancelled, before it's ready
//
// "Undo last status" steps back one change at a time (see undoTarget); it records a
// correction instead of deleting history.

/** The ticket's live quote: the latest version, or none yet. */
export type CurrentQuote = Exclude<RepairQuoteStatus, "superseded"> | "none";

export type TicketState = { status: RepairStatus; quote: CurrentQuote };

export type Move = { to: RepairStatus; closeReason?: RepairCloseReason };

export type MoveProblem =
  | "closed"
  | "not_allowed"
  | "needs_quote"
  | "needs_approval"
  | "needs_decline"
  | "quote_pending"
  | "needs_reason"
  | "bad_reason";

type Rule = {
  from: RepairStatus;
  to: RepairStatus;
  check: (quote: CurrentQuote) => MoveProblem | null;
};

const anyQuote = (quote: CurrentQuote) => (quote === "none" ? "needs_quote" : null);
const approved = (quote: CurrentQuote) =>
  quote === "approved" ? null : quote === "none" ? "needs_quote" : "needs_approval";
const declined = (quote: CurrentQuote) => (quote === "declined" ? null : "needs_decline");
const decided = (quote: CurrentQuote) =>
  quote === "approved" || quote === "declined"
    ? null
    : quote === "pending"
      ? "quote_pending"
      : "needs_quote";
const always = () => null;

const rules: Rule[] = [
  { from: "received", to: "diagnosed", check: anyQuote },
  { from: "received", to: "in_repair", check: approved },
  { from: "diagnosed", to: "in_repair", check: approved },
  { from: "diagnosed", to: "ready", check: declined },
  { from: "in_repair", to: "ready", check: decided },
  { from: "ready", to: "closed", check: always },
  { from: "received", to: "closed", check: always },
  { from: "diagnosed", to: "closed", check: always },
  { from: "in_repair", to: "closed", check: always },
];

/** Why a ticket is closed, by the status it's closed from. */
export function closeReasonsFrom(status: RepairStatus): RepairCloseReason[] {
  if (status === "ready") return ["collected", "delivered", "abandoned"];
  if (status === "closed") return [];
  return ["cancelled"];
}

/** Why the move can't happen, or null if it can. */
export function moveProblem(state: TicketState, move: Move): MoveProblem | null {
  if (state.status === "closed") return "closed";
  const rule = rules.find((r) => r.from === state.status && r.to === move.to);
  if (!rule) return "not_allowed";
  if (move.to === "closed") {
    if (!move.closeReason) return "needs_reason";
    if (!closeReasonsFrom(state.status).includes(move.closeReason)) return "bad_reason";
  } else if (move.closeReason) {
    return "bad_reason";
  }
  return rule.check(state.quote);
}

/** Every status the ticket could go to from here, and what's in the way of each. */
export function nextMoves(state: TicketState): { to: RepairStatus; problem: MoveProblem | null }[] {
  if (state.status === "closed") return [];
  return rules
    .filter((rule) => rule.from === state.status)
    .map((rule) => ({ to: rule.to, problem: rule.check(state.quote) }));
}

/** Whether a new quote version can be written now: not once the work is finished. */
export function canQuote(status: RepairStatus): boolean {
  return status === "received" || status === "diagnosed" || status === "in_repair";
}

type StatusChange = {
  id: number;
  kind: "status" | "update" | "correction" | "quote";
  fromStatus: RepairStatus | null;
  toStatus: RepairStatus | null;
};

/**
 * What "Undo last status" would do (and which event it undoes), from the ticket's events in order: the latest change
 * that hasn't been undone, reversed. Each correction undoes the change before it, so
 * repeated undos walk back through the history. Opening the ticket can't be undone.
 */
export function undoTarget(
  events: readonly StatusChange[],
): { from: RepairStatus; to: RepairStatus; eventId: number } | null {
  const changes: { from: RepairStatus; to: RepairStatus; eventId: number }[] = [];
  for (const event of events) {
    if (event.kind === "status" && event.fromStatus && event.toStatus) {
      changes.push({ from: event.fromStatus, to: event.toStatus, eventId: event.id });
    } else if (event.kind === "correction") {
      changes.pop();
    }
  }
  const last = changes.at(-1);
  return last ? { from: last.to, to: last.from, eventId: last.eventId } : null;
}
