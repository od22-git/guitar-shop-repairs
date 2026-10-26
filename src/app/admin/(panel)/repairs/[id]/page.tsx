import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAdmin } from "@/lib/auth";
import { endOfDubaiDay, formatDate, formatDateTime } from "@/lib/datetime";
import { db } from "@/lib/db/client";
import { env } from "@/lib/env";
import { formatMoney } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { RepairError } from "@/lib/repairs/errors";
import { eventMessage, instrumentName, trackingUrl } from "@/lib/repairs/notify";
import { canQuote, closeReasonsFrom, nextMoves, undoTarget } from "@/lib/repairs/state-machine";
import { loadTicket, quoteState, type TicketBundle } from "@/lib/repairs/tickets";
import { waMeUrl } from "@/lib/whatsapp/wa-me";

import { Panel } from "../../../_components/form";
import { updateTicketAction } from "../actions";
import {
  closeReasonLabels,
  decisionMethodLabels,
  intakeMethodLabels,
  quoteStatusLabels,
  statusLabels,
} from "../labels";
import { TicketForm } from "../ticket-form";

import { LinkPanel } from "./link-panel";
import { MessagesPanel } from "./messages-panel";
import { PhotosPanel } from "./photos-panel";
import { QuotePanel } from "./quote-panel";
import { StatusPanel } from "./status-panel";
import { UpdateForm } from "./update-form";

export const metadata: Metadata = { title: "Repair ticket" };

async function load(idParam: string): Promise<TicketBundle> {
  const id = Number(idParam);
  if (!Number.isSafeInteger(id) || id < 1) notFound();
  try {
    return await loadTicket(db, id);
  } catch (error) {
    if (error instanceof RepairError) notFound();
    throw error;
  }
}

const day = (value: string | null) => {
  const date = value ? endOfDubaiDay(value) : null;
  return date ? formatDate(date, "en") : null;
};

/** What each event was, for the history. */
function describe(event: TicketBundle["events"][number], bundle: TicketBundle): string {
  const quote = bundle.quotes.find((q) => q.id === event.quoteId);
  switch (event.kind) {
    case "status":
      if (!event.fromStatus) return "Ticket opened";
      return event.toStatus === "closed" && event.closeReason
        ? `Closed: ${closeReasonLabels[event.closeReason].toLowerCase()}`
        : `${statusLabels[event.fromStatus]} → ${statusLabels[event.toStatus ?? "received"]}`;
    case "correction":
      return `Undo: back to ${statusLabels[event.toStatus ?? "received"].toLowerCase()}`;
    case "quote":
      return quote ? `Quote v${quote.version} sent` : "Quote sent";
    case "update":
      return "Update";
  }
}

const toDateValue = (value: string | null) => value ?? "";

export default async function TicketPage({
  params,
  searchParams,
}: PageProps<"/admin/repairs/[id]">) {
  await requireAdmin();
  const [{ id }, { created }] = await Promise.all([params, searchParams]);
  const bundle = await load(id);
  const { ticket, customer, quotes, events, photos } = bundle;
  const current = quotes.find((quote) => quote.status !== "superseded") ?? null;
  const state = { status: ticket.status, quote: quoteState(current) };
  const undo = undoTarget(events);
  const instrument = instrumentName(ticket);

  const unsent = events
    .filter((event) => event.notifiedAt === null)
    .map((event) => ({
      id: event.id,
      label: describe(event, bundle),
      at: formatDateTime(event.createdAt, "en"),
      ...eventMessage(env.SITE_URL, bundle, event),
    }));

  return (
    <>
      <p>
        <Link href="/admin/repairs" className="underline underline-offset-4">
          Repairs
        </Link>
      </p>
      <div>
        <h1 className="text-2xl font-bold">
          <span dir="ltr">{ticket.number}</span> · {instrument ?? "Instrument"}
        </h1>
        <p className="text-ink-muted">
          {statusLabels[ticket.status]}
          {ticket.closeReason && ` (${closeReasonLabels[ticket.closeReason].toLowerCase()})`}
          {ticket.etaDate && ticket.status !== "closed" && ` · ETA ${day(ticket.etaDate)}`}
        </p>
        <p className="mt-1">
          {customer.name} ·{" "}
          <a
            href={waMeUrl(customer.phoneE164)}
            target="_blank"
            className="underline underline-offset-4"
          >
            <span dir="ltr">{formatPhone(customer.phoneE164)}</span>
          </a>{" "}
          · messages in {customer.preferredLocale === "ar" ? "Arabic" : "English"}
          {!customer.whatsappConsentAt && " · no WhatsApp consent recorded"}
        </p>
      </div>
      {created && <p role="status">Ticket opened. Send the customer the first message.</p>}

      <MessagesPanel messages={unsent} />

      <StatusPanel
        ticketId={ticket.id}
        status={ticket.status}
        moves={nextMoves(state)}
        closeReasons={closeReasonsFrom(ticket.status)}
        undoTo={undo && undo.from === ticket.status ? undo.to : null}
      />

      <QuotePanel
        ticketId={ticket.id}
        canQuote={canQuote(ticket.status)}
        current={
          current && {
            id: current.id,
            version: current.version,
            status: current.status,
            statusLabel: quoteStatusLabels[current.status],
            total: formatMoney(current.totalFils, "en"),
            notes: current.notes ?? "",
            decided: current.decidedAt
              ? `${current.status === "approved" ? "Approved" : "Declined"} ${decisionMethodLabels[current.decisionMethod ?? "in_person"]}, ${formatDateTime(current.decidedAt, "en")}`
              : null,
            items: current.items.map((item) => ({
              label: item.label,
              amount: formatMoney(item.amountFils, "en"),
              // As typed in the builder, to start the next version from.
              value: (item.amountFils / 100).toFixed(2).replace(/\.00$/, ""),
            })),
          }
        }
        diagnosisFee={
          ticket.diagnosisFeeFils === null ? null : formatMoney(ticket.diagnosisFeeFils, "en")
        }
        older={quotes
          .filter((quote) => quote.status === "superseded")
          .map((quote) => ({
            version: quote.version,
            total: formatMoney(quote.totalFils, "en"),
            items: quote.items.map(
              (item) => `${item.label}: ${formatMoney(item.amountFils, "en")}`,
            ),
          }))}
      />

      {ticket.status !== "closed" && <UpdateForm ticketId={ticket.id} />}

      <PhotosPanel
        ticketId={ticket.id}
        photos={photos.map((photo) => ({
          id: photo.id,
          src: `/api/repair-photos/${photo.key}-640.webp`,
          full: `/api/repair-photos/${photo.key}-1920.webp`,
          width: photo.width,
          height: photo.height,
          stage: photo.stage,
          customerVisible: photo.customerVisible,
        }))}
      />

      <Panel title="History">
        <ol className="flex flex-col gap-3">
          {[...events].reverse().map((event) => (
            <li key={event.id} className="border-b border-mist pb-3">
              <p className="font-medium">{describe(event, bundle)}</p>
              <p className="text-sm text-ink-muted">
                {formatDateTime(event.createdAt, "en")}
                {event.notifiedAt ? " · message sent" : " · message not sent yet"}
              </p>
              {event.etaDate && <p>New ETA: {day(event.etaDate)}</p>}
              {event.publicNote && <p className="whitespace-pre-line">{event.publicNote}</p>}
              {event.internalNote && (
                <p className="whitespace-pre-line text-ink-muted">Internal: {event.internalNote}</p>
              )}
            </li>
          ))}
        </ol>
      </Panel>

      <Panel title="Intake">
        <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-ink-muted">Opened</dt>
            <dd>{formatDateTime(ticket.createdAt, "en")}</dd>
          </div>
          <div>
            <dt className="text-sm text-ink-muted">How it arrived</dt>
            <dd>{intakeMethodLabels[ticket.intakeMethod]}</dd>
          </div>
          <div>
            <dt className="text-sm text-ink-muted">Repair terms</dt>
            <dd>
              {ticket.termsAcceptedAt
                ? `Accepted ${formatDateTime(ticket.termsAcceptedAt, "en")}`
                : "Not accepted yet"}
            </dd>
          </div>
        </dl>
      </Panel>

      <LinkPanel ticketId={ticket.id} url={trackingUrl(env.SITE_URL, customer, ticket)} />

      <h2 className="text-xl font-bold">Details</h2>
      <TicketForm
        action={updateTicketAction.bind(null, ticket.id)}
        creating={false}
        values={{
          instrumentBrand: ticket.instrumentBrand ?? "",
          instrumentModel: ticket.instrumentModel ?? "",
          serial: ticket.serial ?? "",
          colour: ticket.colour ?? "",
          issue: ticket.issue,
          intakeNotes: ticket.intakeNotes ?? "",
          accessories: ticket.accessories ?? "",
          etaDate: toDateValue(ticket.etaDate),
        }}
      />
    </>
  );
}
