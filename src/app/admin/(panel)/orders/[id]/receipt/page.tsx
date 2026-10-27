import type { ReactNode } from "react";

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { createTranslator } from "next-intl";

import { Bdi, Ltr } from "@/components/bdi";
import { brand } from "@/config/brand";
import { requireAdmin } from "@/lib/auth";
import { formatDate } from "@/lib/datetime";
import { db } from "@/lib/db/client";
import { formatMoney } from "@/lib/money";
import { loadOrder, orderBalance, OrderError } from "@/lib/orders";
import { formatPhone } from "@/lib/phone";

import ar from "../../../../../../../messages/ar.json";
import en from "../../../../../../../messages/en.json";

import { PrintButton } from "./print-button";

export const metadata: Metadata = { title: "Receipt" };

const messages = { en, ar };

// The printable receipt, in the customer's language. It says "Receipt" until the shop
// is VAT-registered; an order made with VAT is a tax invoice with the TRN.
export default async function ReceiptPage({ params }: PageProps<"/admin/orders/[id]/receipt">) {
  await requireAdmin();
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id < 1) notFound();
  const bundle = await loadOrder(db, id).catch((error: unknown) => {
    if (error instanceof OrderError) notFound();
    throw error;
  });
  const { order, customer, items } = bundle;
  const locale = customer.preferredLocale;
  const t = createTranslator({ locale, messages: messages[locale], namespace: "Receipt" });
  const money = (fils: number) => <Bdi>{formatMoney(fils, locale)}</Bdi>;
  const balance = orderBalance(order, bundle.payments);
  const vat = order.vatRateBps > 0;
  const ltr = (chunks: ReactNode) => <Ltr>{chunks}</Ltr>;

  return (
    <>
      <p className="flex flex-wrap items-center gap-4 print:hidden">
        <Link href={`/admin/orders/${order.id}`} className="underline underline-offset-4">
          Back to the order
        </Link>
        <PrintButton label={`${t("print")} / Print`} />
      </p>
      <article
        lang={locale}
        dir={locale === "ar" ? "rtl" : "ltr"}
        className="flex flex-col gap-6 rounded-lg bg-white p-6 text-black print:p-0"
      >
        <header className="flex flex-wrap justify-between gap-4">
          <div>
            <p className="text-xl font-bold">{brand.name[locale]}</p>
            <p className="text-grey-600">{brand.location[locale]}</p>
            {vat && order.trn && <p>{t.rich("trn", { trn: order.trn, ltr })}</p>}
          </div>
          <div className="text-end">
            <h1 className="text-2xl font-bold">{vat ? t("taxInvoice") : t("receipt")}</h1>
            <p>{t.rich("order", { number: order.number, ltr })}</p>
            <p>{t("date", { date: formatDate(order.createdAt, locale) })}</p>
          </div>
        </header>

        <section>
          <h2 className="text-sm font-bold text-grey-600">{t("customer")}</h2>
          <p>
            <Bdi>{customer.name}</Bdi>
          </p>
          <p>
            <Ltr>{formatPhone(customer.phoneE164)}</Ltr>
          </p>
        </section>

        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-black text-start">
              <th scope="col" className="py-2 pe-3 text-start">
                {t("item")}
              </th>
              <th scope="col" className="py-2 pe-3 text-end">
                {t("quantity")}
              </th>
              <th scope="col" className="py-2 text-end">
                {t("amount")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-grey-300">
            {items.map((item) => (
              <tr key={item.id}>
                <td className="py-2 pe-3">
                  <Bdi>{item.titleSnapshot}</Bdi>{" "}
                  <Ltr className="text-sm text-grey-600">{item.skuSnapshot}</Ltr>
                </td>
                <td className="py-2 pe-3 text-end tabular-nums">{item.quantity}</td>
                <td className="py-2 text-end tabular-nums">
                  {money(item.unitPriceFils * item.quantity)}
                </td>
              </tr>
            ))}
            {order.deliveryFeeFils > 0 && (
              <tr>
                <td className="py-2 pe-3" colSpan={2}>
                  {t("delivery")}
                </td>
                <td className="py-2 text-end tabular-nums">{money(order.deliveryFeeFils)}</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-black text-lg font-bold">
              <th scope="row" colSpan={2} className="py-2 pe-3 text-start">
                {t("total")}
              </th>
              <td className="py-2 text-end tabular-nums">{money(order.totalFils)}</td>
            </tr>
            {vat && (
              <tr>
                <th scope="row" colSpan={2} className="pe-3 text-start font-normal">
                  {t("vatIncluded", { rate: order.vatRateBps / 100 })}
                </th>
                <td className="text-end tabular-nums">{money(order.vatFils)}</td>
              </tr>
            )}
          </tfoot>
        </table>
        {!vat && <p className="text-sm text-grey-600">{t("notVatRegistered")}</p>}

        {bundle.payments.length > 0 && (
          <section>
            <h2 className="mb-1 font-bold">{t("payments")}</h2>
            <ul>
              {bundle.payments.map((payment) => (
                <li key={payment.id} className="flex justify-between gap-4">
                  <span>
                    {t("paymentLine", {
                      kind: t(payment.kind),
                      method: t(payment.method),
                      date: formatDate(payment.receivedAt, locale),
                    })}
                  </span>
                  <span className="tabular-nums">
                    {payment.kind === "refund" ? "−" : ""}
                    {money(payment.amountFils)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
        <dl className="flex flex-col gap-1 border-t border-grey-300 pt-3">
          <div className="flex justify-between gap-4">
            <dt>{t("paid")}</dt>
            <dd className="tabular-nums">{money(balance.paidFils)}</dd>
          </div>
          {order.status !== "cancelled" && order.status !== "refunded" && (
            <div className="flex justify-between gap-4 font-bold">
              <dt>{t("due")}</dt>
              <dd className="tabular-nums">
                {balance.dueFils > 0 ? money(balance.dueFils) : t("paidInFull")}
              </dd>
            </div>
          )}
        </dl>
        {order.status === "cancelled" && <p className="font-bold">{t("cancelled")}</p>}
        {order.status === "refunded" && <p className="font-bold">{t("refunded")}</p>}
        <p>{t("thanks")}</p>
      </article>
    </>
  );
}
