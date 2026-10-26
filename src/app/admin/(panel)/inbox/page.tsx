import type { Metadata } from "next";
import Link from "next/link";

import { requireAdmin } from "@/lib/auth";
import { formatDateTime } from "@/lib/datetime";
import { db } from "@/lib/db/client";
import { inboxStatus } from "@/lib/db/schema";
import { listSubmissions, repairRequestOf, sellOfferOf, type InboxFilter } from "@/lib/inbox";
import { formatPhone } from "@/lib/phone";

import { inboxStatusLabels, kindLabels } from "./labels";

export const metadata: Metadata = { title: "Inbox" };

const isFilter = (value: unknown): value is InboxFilter =>
  value === "open" ||
  value === "all" ||
  (typeof value === "string" && (inboxStatus.enumValues as readonly string[]).includes(value));

// What the public forms sent: repair bookings and guitars offered on /sell.
export default async function InboxPage({ searchParams }: PageProps<"/admin/inbox">) {
  await requireAdmin();
  const params = await searchParams;
  const filter: InboxFilter = isFilter(params.status) ? params.status : "open";
  const rows = await listSubmissions(db, filter);
  const filters: { value: InboxFilter; label: string }[] = [
    { value: "open", label: "To handle" },
    ...inboxStatus.enumValues.map((value) => ({ value, label: inboxStatusLabels[value] })),
    { value: "all", label: "All" },
  ];

  return (
    <>
      <h1 className="text-2xl font-bold">Inbox</h1>
      <nav aria-label="Filter by status">
        <ul className="flex flex-wrap gap-2">
          {filters.map(({ value, label }) => (
            <li key={value}>
              <Link
                href={`/admin/inbox?status=${value}`}
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
          {filter === "open" ? "Nothing to handle." : "Nothing here."}
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-mist overflow-hidden rounded-lg bg-paper">
          {rows.map((item) => {
            const request = repairRequestOf(item);
            const offer = sellOfferOf(item);
            const instrument = (
              offer
                ? [offer.brand, offer.model]
                : [request?.instrumentBrand, request?.instrumentModel]
            )
              .filter(Boolean)
              .join(" ");
            const summary = request?.issue ?? offer?.description;
            return (
              <li key={item.id}>
                <Link
                  href={`/admin/inbox/${item.id}`}
                  className="flex items-center gap-4 p-3 hover:bg-white"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      {kindLabels[item.kind]} · {item.name}
                    </p>
                    <p className="truncate text-sm text-ink-muted">
                      {instrument && `${instrument} · `}
                      <span dir="ltr">{formatPhone(item.phoneE164)}</span>
                    </p>
                    {summary && (
                      <p dir="auto" className="truncate text-sm text-ink-muted">
                        {offer && item.photoKeys.length > 0 && `${item.photoKeys.length} photos · `}
                        {summary}
                      </p>
                    )}
                  </div>
                  <div className="text-end">
                    <p
                      className={
                        item.status === "new" ? "font-semibold text-fiesta-deep" : "font-medium"
                      }
                    >
                      {inboxStatusLabels[item.status]}
                    </p>
                    <p className="text-sm text-ink-muted">{formatDateTime(item.createdAt, "en")}</p>
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
