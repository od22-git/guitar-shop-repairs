import type { Metadata } from "next";
import Link from "next/link";

import { and, desc, eq, ilike, isNotNull, isNull, ne, or, sql, type SQL } from "drizzle-orm";

import { requireAdmin } from "@/lib/auth";
import { dubaiDateInputValue, formatDate, endOfDubaiDay } from "@/lib/datetime";
import { db } from "@/lib/db/client";
import {
  customers,
  repairEvents,
  repairStatus,
  repairTickets,
  type RepairStatus,
} from "@/lib/db/schema";
import { toWesternDigits } from "@/lib/digits";
import { formatPhone } from "@/lib/phone";
import { instrumentName } from "@/lib/repairs/notify";

import { inputClass, secondaryButton } from "../../_components/form";

import { statusLabels } from "./labels";

export const metadata: Metadata = { title: "Repairs" };

type Filter = RepairStatus | "open" | "unsent" | "all";
const isFilter = (value: unknown): value is Filter =>
  value === "open" ||
  value === "unsent" ||
  value === "all" ||
  (typeof value === "string" && (repairStatus.enumValues as readonly string[]).includes(value));

/** Matches the ticket number, the customer's name or the digits of their phone. */
function search(q: string): SQL | undefined {
  const text = q.trim().slice(0, 60);
  if (!text) return undefined;
  const pattern = `%${text.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const digits = toWesternDigits(text).replace(/\D/g, "");
  return or(
    ilike(repairTickets.number, pattern),
    ilike(customers.name, pattern),
    digits.length >= 3 ? ilike(customers.phoneE164, `%${digits}%`) : undefined,
  );
}

export default async function RepairsPage({ searchParams }: PageProps<"/admin/repairs">) {
  await requireAdmin();
  const params = await searchParams;
  const filter: Filter = isFilter(params.status) ? params.status : "open";
  const q = typeof params.q === "string" ? params.q : "";

  const unsent = db
    .select({ ticketId: repairEvents.ticketId, n: sql<number>`count(*)::int`.as("n") })
    .from(repairEvents)
    .where(isNull(repairEvents.notifiedAt))
    .groupBy(repairEvents.ticketId)
    .as("unsent");
  const rows = await db
    .select({ ticket: repairTickets, customer: customers, unsent: unsent.n })
    .from(repairTickets)
    .innerJoin(customers, eq(customers.id, repairTickets.customerId))
    .leftJoin(unsent, eq(unsent.ticketId, repairTickets.id))
    .where(
      and(
        filter === "open"
          ? ne(repairTickets.status, "closed")
          : filter === "unsent"
            ? isNotNull(unsent.n)
            : filter === "all"
              ? undefined
              : eq(repairTickets.status, filter),
        search(q),
      ),
    )
    .orderBy(desc(repairTickets.updatedAt), desc(repairTickets.id))
    .limit(200);

  const today = dubaiDateInputValue(new Date());
  const filters: { value: Filter; label: string }[] = [
    { value: "open", label: "Open" },
    { value: "unsent", label: "Updates to send" },
    ...repairStatus.enumValues.map((value) => ({ value, label: statusLabels[value] })),
    { value: "all", label: "All" },
  ];
  const href = (value: Filter) =>
    `/admin/repairs?status=${value}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Repairs</h1>
        <Link
          href="/admin/repairs/new"
          className="inline-flex min-h-11 items-center rounded-md bg-fiesta px-5 font-semibold text-white hover:bg-fiesta-deep"
        >
          New ticket
        </Link>
      </div>

      <form role="search" className="flex gap-2" action="/admin/repairs">
        <input type="hidden" name="status" value={filter} />
        <label htmlFor="repair-search" className="sr-only">
          Search tickets
        </label>
        <input
          id="repair-search"
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Ticket number, name or phone"
          className={inputClass}
        />
        <button type="submit" className={secondaryButton}>
          Search
        </button>
      </form>

      <nav aria-label="Filter by status">
        <ul className="flex flex-wrap gap-2">
          {filters.map(({ value, label }) => (
            <li key={value}>
              <Link
                href={href(value)}
                aria-current={filter === value ? "page" : undefined}
                className="inline-flex min-h-11 items-center rounded-full border border-ink-muted px-4 aria-[current=page]:border-ink aria-[current=page]:bg-ink aria-[current=page]:text-mist"
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {rows.length === 0 ? (
        <p className="rounded-lg bg-paper p-6">
          {q
            ? "No tickets match."
            : filter === "open"
              ? "No open tickets."
              : filter === "unsent"
                ? "Every update has been sent."
                : "No tickets here."}
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-mist overflow-hidden rounded-lg bg-paper">
          {rows.map(({ ticket, customer, unsent: unsentCount }) => {
            const late =
              ticket.etaDate !== null &&
              ticket.etaDate < today &&
              ["received", "diagnosed", "in_repair"].includes(ticket.status);
            const eta = ticket.etaDate ? endOfDubaiDay(ticket.etaDate) : null;
            return (
              <li key={ticket.id}>
                <Link
                  href={`/admin/repairs/${ticket.id}`}
                  className="flex items-center gap-4 p-3 hover:bg-white"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      <span dir="ltr">{ticket.number}</span> · {customer.name}
                    </p>
                    <p className="truncate text-sm text-ink-muted">
                      {instrumentName(ticket) ?? "Instrument"} ·{" "}
                      <span dir="ltr">{formatPhone(customer.phoneE164)}</span>
                    </p>
                  </div>
                  <div className="text-end">
                    <p className="font-medium">{statusLabels[ticket.status]}</p>
                    {eta && (
                      <p
                        className={
                          late ? "text-sm font-medium text-fiesta-deep" : "text-sm text-ink-muted"
                        }
                      >
                        {late ? "Past ETA " : "ETA "}
                        {formatDate(eta, "en")}
                      </p>
                    )}
                    {unsentCount ? (
                      <p className="text-sm font-semibold text-fiesta-deep">
                        {unsentCount === 1
                          ? "1 message to send"
                          : `${unsentCount} messages to send`}
                      </p>
                    ) : null}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
