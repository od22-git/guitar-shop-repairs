import type { Metadata } from "next";
import Link from "next/link";

import { and, asc, inArray, isNotNull, ne } from "drizzle-orm";

import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { emirate, products } from "@/lib/db/schema";
import { filsToDecimalString, formatMoney } from "@/lib/money";
import { listDeliveryZones } from "@/lib/settings/store";

import { createOrderAction } from "../actions";
import { emirateLabels } from "../labels";
import { OrderForm } from "../order-form";

export const metadata: Metadata = { title: "New order" };

export default async function NewOrderPage({ searchParams }: PageProps<"/admin/orders/new">) {
  await requireAdmin();
  const [{ product }, forSale, zones] = await Promise.all([
    searchParams,
    db
      .select({
        id: products.id,
        kind: products.kind,
        title: products.titleEn,
        sku: products.sku,
        priceFils: products.priceFils,
        quantity: products.quantity,
        status: products.status,
        reservedNote: products.reservedNote,
      })
      .from(products)
      .where(
        and(
          inArray(products.status, ["available", "reserved"]),
          isNotNull(products.priceFils),
          // Add-ons come with the cart (M13); they have no stock to take.
          ne(products.kind, "service_addon"),
        ),
      )
      .orderBy(asc(products.titleEn)),
    listDeliveryZones(db),
  ]);
  const start = forSale.find((p) => String(p.id) === product)?.id;

  return (
    <>
      <p>
        <Link href="/admin/orders" className="underline underline-offset-4">
          Orders
        </Link>
      </p>
      <h1 className="text-2xl font-bold">New order</h1>
      <p className="text-grey-600">
        For a sale agreed on WhatsApp or in person. Its items leave the shop as soon as it’s made;
        record deposits and payments on the next screen.
      </p>
      <OrderForm
        action={createOrderAction}
        start={start}
        products={forSale.map((p) => {
          const price = p.priceFils ?? 0;
          const extra =
            p.status === "reserved"
              ? ` · on hold${p.reservedNote ? `: ${p.reservedNote}` : ""}`
              : p.kind !== "guitar"
                ? ` · ${p.quantity} in stock`
                : "";
          return {
            id: p.id,
            label: `${p.title} (${p.sku}) · ${formatMoney(price, "en")}${extra}`,
            price: filsToDecimalString(price).replace(/\.00$/, ""),
            priceLabel: formatMoney(price, "en"),
            gear: p.kind !== "guitar",
          };
        })}
        emirates={emirate.enumValues.map((value) => {
          const zone = zones.find((z) => z.active && z.emirates.includes(value));
          return {
            value,
            label: emirateLabels[value],
            fee: zone ? formatMoney(zone.feeFils, "en") : null,
          };
        })}
      />
    </>
  );
}
