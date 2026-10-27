import type { Metadata } from "next";
import Link from "next/link";

import { formatDate } from "@/lib/datetime";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { orderStatus } from "@/lib/db/schema";
import { formatMoney } from "@/lib/money";
import { listOrders, orderBalance, type OrderFilter } from "@/lib/orders";
import { formatPhone } from "@/lib/phone";

import { inputClass, secondaryButton } from "../../_components/form";

import { orderStatusLabels } from "./labels";

export const metadata: Metadata = { title: "Orders" };

const isFilter = (value: unknown): value is OrderFilter =>
  value === "open" ||
  value === "due" ||
  value === "all" ||
  (typeof value === "string" && (orderStatus.enumValues as readonly string[]).includes(value));

export default async function OrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  await requireAdmin();
  const params = await searchParams;
  const filter: OrderFilter = isFilter(params.status) ? params.status : "open";
  const q = typeof params.q === "string" ? params.q : "";
  const rows = await listOrders(db, filter, q);

  const filters: { value: OrderFilter; label: string }[] = [
    { value: "open", label: "To hand over" },
    { value: "due", label: "Money due" },
    { value: "fulfilled", label: orderStatusLabels.fulfilled },
    { value: "cancelled", label: orderStatusLabels.cancelled },
    { value: "refunded", label: orderStatusLabels.refunded },
    { value: "all", label: "All" },
  ];
  const href = (value: OrderFilter) =>
    `/admin/orders?status=${value}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Orders</h1>
        <Link
          href="/admin/orders/new"
          className="inline-flex min-h-11 items-center rounded-md bg-black px-5 font-semibold text-white hover:bg-grey-800"
        >
          New order
        </Link>
      </div>

      <form role="search" className="flex gap-2" action="/admin/orders">
        <input type="hidden" name="status" value={filter} />
        <label htmlFor="order-search" className="sr-only">
          Search orders
        </label>
        <input
          id="order-search"
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Order number, name or phone"
          className={inputClass}
        />
        <button type="submit" className={secondaryButton}>
          Search
        </button>
      </form>

      <nav aria-label="Filter orders">
        <ul className="flex flex-wrap gap-2">
          {filters.map(({ value, label }) => (
            <li key={value}>
              <Link
                href={href(value)}
                aria-current={filter === value ? "page" : undefined}
                className="inline-flex min-h-11 items-center rounded-full border border-grey-600 px-4 aria-[current=page]:border-black aria-[current=page]:bg-black aria-[current=page]:text-white"
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {rows.length === 0 ? (
        <p className="rounded-lg bg-white p-6">
          {q ? "No orders match." : filter === "open" ? "Nothing to hand over." : "No orders here."}
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-grey-300 overflow-hidden rounded-lg bg-white">
          {rows.map(({ order, customer, paidFils }) => {
            const { dueFils, toRefundFils } = orderBalance(order, [
              { kind: "payment", amountFils: paidFils },
            ]);
            return (
              <li key={order.id}>
                <Link
                  href={`/admin/orders/${order.id}`}
                  className="flex items-center gap-4 p-3 hover:bg-white"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      <span dir="ltr">{order.number}</span> · {customer.name}
                    </p>
                    <p className="truncate text-sm text-grey-600">
                      {formatDate(order.createdAt, "en")} ·{" "}
                      <span dir="ltr">{formatPhone(customer.phoneE164)}</span>
                    </p>
                  </div>
                  <div className="text-end">
                    <p className="font-medium tabular-nums">{formatMoney(order.totalFils, "en")}</p>
                    <p className="text-sm text-grey-600">{orderStatusLabels[order.status]}</p>
                    {dueFils > 0 && (
                      <p className="text-sm font-semibold text-red">
                        {formatMoney(dueFils, "en")} due
                      </p>
                    )}
                    {toRefundFils > 0 && (
                      <p className="text-sm font-semibold text-red">
                        {formatMoney(toRefundFils, "en")} to refund
                      </p>
                    )}
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
