import type { Metadata } from "next";
import Link from "next/link";

import { count } from "drizzle-orm";

import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { products, productStatus } from "@/lib/db/schema";

import { statusLabels } from "./products/status";

export const metadata: Metadata = { title: "Overview" };

// The full dashboard (unsent WhatsApp updates, quotes, overdue holds) grows with the
// repairs and orders milestones. For now: products by status.
export default async function AdminHome() {
  await requireAdmin();
  const rows = await db
    .select({ status: products.status, n: count() })
    .from(products)
    .groupBy(products.status);
  const byStatus = new Map(rows.map((row) => [row.status, row.n]));

  return (
    <>
      <h1 className="text-2xl font-bold">Overview</h1>
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
