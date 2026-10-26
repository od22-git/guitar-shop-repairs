import type { Customer, RepairEvent, RepairQuote, RepairTicket } from "../db/schema";
import { repairMessage } from "../whatsapp/repair-message";
import { waMeUrl } from "../whatsapp/wa-me";

// wa.me links for repair events: the admin taps one, WhatsApp opens with the message to
// the customer in their language, and the event leaves the unsent list. A `Notifier`
// for the WhatsApp Business API can replace this later without changing the events.

/** The customer's tracking page (built in M6): /<locale>/r/<token>. */
export function trackingUrl(siteUrl: string, customer: Customer, ticket: RepairTicket): string {
  return new URL(`/${customer.preferredLocale}/r/${ticket.publicToken}`, siteUrl).toString();
}

export function instrumentName(ticket: Pick<RepairTicket, "instrumentBrand" | "instrumentModel">) {
  return [ticket.instrumentBrand, ticket.instrumentModel].filter(Boolean).join(" ") || null;
}

/** The amount a message quotes: the event's quote, or what's owed once it's ready. */
function totalFor(event: RepairEvent, ticket: RepairTicket, quotes: readonly RepairQuote[]) {
  const quote = event.quoteId ? quotes.find((q) => q.id === event.quoteId) : undefined;
  if (event.kind === "status" && event.toStatus === "ready") {
    if (quote?.status === "approved") return quote.totalFils;
    if (quote?.status === "declined") return ticket.diagnosisFeeFils;
    return null;
  }
  return quote?.totalFils ?? null;
}

export function eventMessage(
  siteUrl: string,
  bundle: { ticket: RepairTicket; customer: Customer; quotes: readonly RepairQuote[] },
  event: RepairEvent,
): { text: string; href: string } {
  const { ticket, customer } = bundle;
  const text = repairMessage({
    locale: customer.preferredLocale,
    customerName: customer.name,
    number: ticket.number,
    instrument: instrumentName(ticket),
    trackingUrl: trackingUrl(siteUrl, customer, ticket),
    event,
    totalFils: totalFor(event, ticket, bundle.quotes),
  });
  return { text, href: waMeUrl(customer.phoneE164, text) };
}
