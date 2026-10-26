"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";

import { eq } from "drizzle-orm";

import { requireAdmin } from "@/lib/auth";
import { CATALOG_TAG } from "@/lib/catalog";
import { db } from "@/lib/db/client";
import { products } from "@/lib/db/schema";
import { parseOrderForm, parsePaymentForm, parseRefundForm } from "@/lib/orders/forms";
import {
  cancelOrder,
  createOrder,
  deleteOrderPayment,
  fulfilOrder,
  OrderError,
  recordOrderPayment,
  refundOrder,
  type OrderProblem,
} from "@/lib/orders";

import type { ActionState } from "../../_components/action-state";

// Every action starts with requireAdmin(): server actions are public endpoints (see
// e2e/admin-access.spec.ts). Making, cancelling or refunding an order changes stock, so
// those expire the catalog cache too; all of them refresh the admin pages.

const messages: Record<OrderProblem, string> = {
  not_found: "This order no longer exists.",
  not_allowed: "That isn't possible from its current status. Reload the page.",
  product_unavailable: "isn't for sale (a draft, archived or sold) or has no price.",
  out_of_stock: "doesn't have that many in stock any more.",
  no_zone:
    "No delivery zone covers that emirate. Type the delivery fee, or turn a zone on in Settings.",
  cannot_restock:
    "can't go back into stock: its stock was changed by hand since. Fix it on the product page first.",
  overpaid: "That's more than is still due.",
  refund_too_large: "That's more than was paid.",
  order_closed: "The order is closed: only refunds can be recorded.",
};

async function productName(id: number | undefined): Promise<string> {
  if (!id) return "A product";
  const [row] = await db
    .select({ title: products.titleEn, sku: products.sku })
    .from(products)
    .where(eq(products.id, id));
  return row ? `${row.title} (${row.sku})` : "A product";
}

async function failure(error: unknown): Promise<ActionState> {
  if (error instanceof OrderError) {
    const message = messages[error.problem];
    // Line problems name the product.
    return {
      ok: false,
      message: /^[a-z]/.test(message)
        ? `${await productName(error.productId)} ${message}`
        : message,
    };
  }
  throw error;
}

function done(message: string, { stock = false } = {}): ActionState {
  if (stock) updateTag(CATALOG_TAG);
  revalidatePath("/admin", "layout");
  return { ok: true, message, at: Date.now() };
}

/** Ids come from bound arguments, which a caller can change: check them. */
function toId(value: unknown): number {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) throw new Error("Invalid id");
  return id;
}

const invalid: ActionState = { ok: false, message: "Check the highlighted fields." };

export async function createOrderAction(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = parseOrderForm(form);
  if (!parsed.ok) return { ...invalid, errors: parsed.errors };
  let id: number;
  try {
    ({ id } = await createOrder(db, parsed.data));
  } catch (error) {
    return failure(error);
  }
  updateTag(CATALOG_TAG);
  redirect(`/admin/orders/${id}?created=1`);
}

export async function recordPaymentAction(
  orderId: number,
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const parsed = parsePaymentForm(form);
  if (!parsed.ok) return { ...invalid, errors: parsed.errors };
  try {
    await recordOrderPayment(db, toId(orderId), parsed.data);
  } catch (error) {
    return failure(error);
  }
  return done(parsed.data.kind === "refund" ? "Refund recorded." : "Payment recorded.");
}

export async function deletePaymentAction(paymentId: number): Promise<ActionState> {
  await requireAdmin();
  const orderId = await deleteOrderPayment(db, toId(paymentId));
  if (orderId === null) return { ok: false, message: "That payment was already removed." };
  return done("Payment removed.");
}

export async function fulfilAction(orderId: number): Promise<ActionState> {
  await requireAdmin();
  try {
    await fulfilOrder(db, toId(orderId));
  } catch (error) {
    return failure(error);
  }
  return done("Marked as handed over.");
}

export async function cancelAction(orderId: number): Promise<ActionState> {
  await requireAdmin();
  try {
    await cancelOrder(db, toId(orderId));
  } catch (error) {
    return failure(error);
  }
  return done("Cancelled. The items are back in stock.", { stock: true });
}

export async function refundAction(
  orderId: number,
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const parsed = parseRefundForm(form);
  if (!parsed.ok) return { ...invalid, errors: parsed.errors };
  try {
    await refundOrder(db, toId(orderId), parsed.data);
  } catch (error) {
    return failure(error);
  }
  return done(parsed.data.restock ? "Refunded. The items are back in stock." : "Refunded.", {
    stock: parsed.data.restock,
  });
}
