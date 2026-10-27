import type { Metadata } from "next";
import Link from "next/link";

import { count } from "drizzle-orm";

import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { products, productStatus } from "@/lib/db/schema";
import { countNewSubmissions } from "@/lib/inbox";
import { formatMoney } from "@/lib/money";
import { orderCounts } from "@/lib/orders";
import { repairCounts, UNCOLLECTED_AFTER_DAYS } from "@/lib/repairs/dashboard";

import { statusLabels } from "./products/status";

export const metadata: Metadata = { title: "Overview" };

// What needs doing: orders (to hand over, money due or to refund, holds past their date),
// repairs (unsent WhatsApp updates, quotes waiting or answered, late or uncollected
// tickets), new inbox items and products by status. The year's payments are there to
// watch the VAT registration threshold.

/** UAE mandatory VAT registration: AED 375,000 of taxable supplies in 12 months. */
const VAT_THRESHOLD_FILS = 37_500_000;
export default async function AdminHome() {
  await requireAdmin();
  const [rows, repairs, inbox, orders] = await Promise.all([
    db.select({ status: products.status, n: count() }).from(products).groupBy(products.status),
    repairCounts(db),
    countNewSubmissions(db),
    orderCounts(db),
  ]);
  const orderItems = [
    { label: "To hand over", n: orders.toHandOver, href: "/admin/orders?status=open" },
    { label: "Money due", n: orders.balanceDue, urgent: true, href: "/admin/orders?status=due" },
    {
      label: "Cancelled, to refund",
      n: orders.toRefund,
      urgent: true,
      href: "/admin/orders?status=cancelled",
    },
    {
      label: "Holds past their date",
      n: orders.overdueHolds,
      urgent: true,
      href: "/admin/products?status=reserved",
    },
  ];
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
      <section aria-labelledby="orders-heading" className="rounded-lg bg-white p-4 sm:p-6">
        <h2 id="orders-heading" className="mb-3 text-lg font-bold">
          Orders
        </h2>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {orderItems.map(({ label, n, urgent, href }) => (
            <div key={label}>
              <dt className="text-sm text-grey-600">{label}</dt>
              <dd
                className={`text-2xl font-bold tabular-nums ${urgent && n > 0 ? "text-red" : ""}`}
              >
                <Link href={href} className="hover:underline">
                  {n}
                </Link>
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-4">
          <span className="text-sm text-grey-600">Received in the last 12 months: </span>
          <span className="font-bold tabular-nums">
            {formatMoney(orders.last12MonthsFils, "en")}
          </span>
          <span className="text-sm text-grey-600">
            {" "}
            of the {formatMoney(VAT_THRESHOLD_FILS, "en")} VAT registration threshold
          </span>
        </p>
        <p className="mt-5 flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/admin/orders" className="font-semibold underline underline-offset-4">
            Open orders
          </Link>
          <Link href="/admin/orders/new" className="font-semibold underline underline-offset-4">
            New order
          </Link>
        </p>
      </section>
      <section aria-labelledby="repairs-heading" className="rounded-lg bg-white p-4 sm:p-6">
        <h2 id="repairs-heading" className="mb-3 text-lg font-bold">
          Repairs
        </h2>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {repairItems.map(({ label, n, urgent, href }) => (
            <div key={label}>
              <dt className="text-sm text-grey-600">{label}</dt>
              <dd
                className={`text-2xl font-bold tabular-nums ${urgent && n > 0 ? "text-red" : ""}`}
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
      <section aria-labelledby="inbox-heading" className="rounded-lg bg-white p-4 sm:p-6">
        <h2 id="inbox-heading" className="mb-3 text-lg font-bold">
          Inbox
        </h2>
        <dl>
          <dt className="text-sm text-grey-600">New bookings and messages</dt>
          <dd className={`text-2xl font-bold tabular-nums ${inbox > 0 ? "text-red" : ""}`}>
            <Link href="/admin/inbox?status=new" className="hover:underline">
              {inbox}
            </Link>
          </dd>
        </dl>
      </section>
      <section aria-labelledby="products-heading" className="rounded-lg bg-white p-4 sm:p-6">
        <h2 id="products-heading" className="mb-3 text-lg font-bold">
          Products
        </h2>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {productStatus.enumValues.map((status) => (
            <div key={status}>
              <dt className="text-sm text-grey-600">{statusLabels[status]}</dt>
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
