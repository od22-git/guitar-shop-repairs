import type { Metadata } from "next";
import Link from "next/link";

import { count } from "drizzle-orm";

import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { products, productStatus } from "@/lib/db/schema";
import { countNewSubmissions } from "@/lib/inbox";
import { repairCounts, UNCOLLECTED_AFTER_DAYS } from "@/lib/repairs/dashboard";

import { statusLabels } from "./products/status";

export const metadata: Metadata = { title: "Overview" };

// What needs doing: repairs (unsent WhatsApp updates, quotes waiting or answered, late
// or uncollected tickets), new inbox items and products by status. Orders, holds and payments join in M7.
export default async function AdminHome() {
  await requireAdmin();
  const [rows, repairs, inbox] = await Promise.all([
    db.select({ status: products.status, n: count() }).from(products).groupBy(products.status),
    repairCounts(db),
    countNewSubmissions(db),
  ]);
  const repairItems = [
    { label: "WhatsApp updates to send", n: repairs.unsent, urgent: true, href: "?status=unsent" },
    { label: "Quotes waiting on customers", n: repairs.quotesWaiting },
    { label: "Quotes answered: your move", n: repairs.quotesAnswered, urgent: true },
    { label: "Past their ETA", n: repairs.pastEta, urgent: true },
    {
      label: `Ready, uncollected over ${UNCOLLECTED_AFTER_DAYS} days`,
      n: repairs.uncollected,
      urgent: true,
    },
    { label: "Open tickets", n: repairs.open },
  ];
  const byStatus = new Map(rows.map((row) => [row.status, row.n]));

  return (
    <>
      <h1 className="text-2xl font-bold">Overview</h1>
      <section aria-labelledby="repairs-heading" className="rounded-lg bg-paper p-4 sm:p-6">
        <h2 id="repairs-heading" className="mb-3 text-lg font-bold">
          Repairs
        </h2>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {repairItems.map(({ label, n, urgent, href }) => (
            <div key={label}>
              <dt className="text-sm text-ink-muted">{label}</dt>
              <dd
                className={`text-2xl font-bold tabular-nums ${urgent && n > 0 ? "text-fiesta-deep" : ""}`}
              >
                {href ? (
                  <Link href={`/admin/repairs${href}`} className="hover:underline">
                    {n}
                  </Link>
                ) : (
                  n
                )}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-5 flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/admin/repairs" className="font-semibold underline underline-offset-4">
            Open tickets
          </Link>
          <Link href="/admin/repairs/new" className="font-semibold underline underline-offset-4">
            New ticket
          </Link>
        </p>
      </section>
      <section aria-labelledby="inbox-heading" className="rounded-lg bg-paper p-4 sm:p-6">
        <h2 id="inbox-heading" className="mb-3 text-lg font-bold">
          Inbox
        </h2>
        <dl>
          <dt className="text-sm text-ink-muted">New bookings and messages</dt>
          <dd className={`text-2xl font-bold tabular-nums ${inbox > 0 ? "text-fiesta-deep" : ""}`}>
            <Link href="/admin/inbox?status=new" className="hover:underline">
              {inbox}
            </Link>
          </dd>
        </dl>
      </section>
      <section aria-labelledby="products-heading" className="rounded-lg bg-paper p-4 sm:p-6">
        <h2 id="products-heading" className="mb-3 text-lg font-bold">
          Products
        </h2>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {productStatus.enumValues.map((status) => (
            <div key={status}>
              <dt className="text-sm text-ink-muted">{statusLabels[status]}</dt>
              <dd className="text-2xl font-bold tabular-nums">
                <Link href={`/admin/products?status=${status}`} className="hover:underline">
                  {byStatus.get(status) ?? 0}
                </Link>
              </dd>
            </div>
          ))}
        </dl>
        <Link
          href="/admin/products/new"
          className="mt-5 inline-block font-semibold underline underline-offset-4"
        >
          Add a product
        </Link>
      </section>
    </>
  );
}
