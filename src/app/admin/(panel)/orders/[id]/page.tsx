import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAdmin } from "@/lib/auth";
import { dubaiDateInputValue, formatDate, formatDateTime } from "@/lib/datetime";
import { db } from "@/lib/db/client";
import { filsToDecimalString, formatMoney } from "@/lib/money";
import { loadOrder, orderBalance, OrderError, type OrderBundle } from "@/lib/orders";
import { formatPhone } from "@/lib/phone";
import { waMeUrl } from "@/lib/whatsapp/wa-me";

import { Panel } from "../../../_components/form";
import { PaymentsPanel } from "../../../_components/payments-panel";
import { deletePaymentAction, recordPaymentAction } from "../actions";
import {
  deliveryMethodLabels,
  emirateLabels,
  orderStatusLabels,
  paymentKindLabels,
  paymentMethodLabels,
} from "../labels";

import { StatusPanel } from "./order-panels";

export const metadata: Metadata = { title: "Order" };

async function load(idParam: string): Promise<OrderBundle> {
  const id = Number(idParam);
  if (!Number.isSafeInteger(id) || id < 1) notFound();
  try {
    return await loadOrder(db, id);
  } catch (error) {
    if (error instanceof OrderError) notFound();
    throw error;
  }
}

const aed = (fils: number) => formatMoney(fils, "en");

export default async function OrderPage({ params, searchParams }: PageProps<"/admin/orders/[id]">) {
  await requireAdmin();
  const [{ id }, { created }] = await Promise.all([params, searchParams]);
  const bundle = await load(id);
  const { order, customer, items } = bundle;
  const balance = orderBalance(order, bundle.payments);
  const address = [
    order.addressLine,
    order.area,
    order.landmark && `near ${order.landmark}`,
    order.emirate && emirateLabels[order.emirate],
  ].filter(Boolean);

  return (
    <>
      <p>
        <Link href="/admin/orders" className="underline underline-offset-4">
          Orders
        </Link>
      </p>
      <div>
        <h1 className="text-2xl font-bold">
          Order <span dir="ltr">{order.number}</span>
        </h1>
        <p className="text-grey-600">
          {orderStatusLabels[order.status]} · made {formatDateTime(order.createdAt, "en")}
          {order.fulfilledAt && ` · handed over ${formatDate(order.fulfilledAt, "en")}`}
          {order.cancelledAt && ` · cancelled ${formatDate(order.cancelledAt, "en")}`}
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
          · receipt in {customer.preferredLocale === "ar" ? "Arabic" : "English"}
        </p>
      </div>
      {created && <p role="status">Order made. The items are out of the shop.</p>}

      <Panel title="Items">
        <table className="w-full text-start">
          <thead className="sr-only">
            <tr>
              <th scope="col">Item</th>
              <th scope="col">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-grey-300">
            {items.map((item) => (
              <tr key={item.id}>
                <td className="py-2 pe-3">
                  <Link
                    href={`/admin/products/${item.productId}`}
                    className="underline underline-offset-4"
                  >
                    {item.titleSnapshot}
                  </Link>{" "}
                  <span className="text-sm text-grey-600" dir="ltr">
                    {item.skuSnapshot}
                  </span>
                  {item.quantity > 1 && (
                    <span className="block text-sm text-grey-600">
                      {item.quantity} × {aed(item.unitPriceFils)}
                    </span>
                  )}
                </td>
                <td className="py-2 text-end tabular-nums">
                  {aed(item.unitPriceFils * item.quantity)}
                </td>
              </tr>
            ))}
            <tr>
              <td className="py-2 pe-3">Delivery</td>
              <td className="py-2 text-end tabular-nums">{aed(order.deliveryFeeFils)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-black font-bold">
              <th scope="row" className="py-2 pe-3 text-start">
                Total
              </th>
              <td className="py-2 text-end tabular-nums" data-testid="order-total">
                {aed(order.totalFils)}
              </td>
            </tr>
            <tr className="text-grey-600">
              <th scope="row" className="pe-3 text-start font-normal">
                {order.vatRateBps > 0 ? `Includes VAT at ${order.vatRateBps / 100}%` : "VAT"}
              </th>
              <td className="text-end tabular-nums" data-testid="order-vat">
                {order.vatRateBps > 0 ? aed(order.vatFils) : "Not registered"}
              </td>
            </tr>
          </tfoot>
        </table>
        <p className="mt-4">
          <Link
            href={`/admin/orders/${order.id}/receipt`}
            className="font-semibold underline underline-offset-4"
          >
            {order.vatRateBps > 0 ? "Tax invoice" : "Receipt"} (printable)
          </Link>
        </p>
      </Panel>

      <PaymentsPanel
        record={recordPaymentAction.bind(null, order.id)}
        remove={deletePaymentAction}
        canPay={["pending", "confirmed", "fulfilled"].includes(order.status)}
        today={dubaiDateInputValue(new Date())}
        balance={{
          paid: aed(balance.paidFils),
          due: balance.dueFils > 0 ? aed(balance.dueFils) : null,
          dueValue: filsToDecimalString(balance.dueFils).replace(/\.00$/, ""),
          toRefund: balance.toRefundFils > 0 ? aed(balance.toRefundFils) : null,
        }}
        payments={bundle.payments.map((payment) => ({
          id: payment.id,
          label: `${paymentKindLabels[payment.kind]}, ${paymentMethodLabels[payment.method].toLowerCase()}`,
          amount: `${payment.kind === "refund" ? "−" : ""}${aed(payment.amountFils)}`,
          at: formatDate(payment.receivedAt, "en"),
          detail: [payment.providerRef, payment.note].filter(Boolean).join(" · "),
        }))}
      />

      <StatusPanel
        orderId={order.id}
        status={order.status}
        paid={filsToDecimalString(Math.max(balance.paidFils, 0)).replace(/\.00$/, "")}
        due={balance.dueFils > 0 ? aed(balance.dueFils) : null}
        stockReturned={order.stockReturned}
      />

      <Panel title="Handover">
        <p>{deliveryMethodLabels[order.deliveryMethod]}</p>
        {address.length > 0 && <p dir="auto">{address.join(", ")}</p>}
        {order.note && <p className="mt-2 whitespace-pre-line text-grey-600">{order.note}</p>}
      </Panel>
    </>
  );
}
