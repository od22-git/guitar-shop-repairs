import { and, asc, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";

import { upsertCustomer } from "../customers";
import type { Database } from "../db/connect";
import {
  customers,
  deliveryZones,
  orderItems,
  orders,
  payments,
  products,
  type Customer,
  type Order,
  type OrderItem,
  type OrderStatus,
  type Payment,
} from "../db/schema";
import { toWesternDigits } from "../digits";
import { InventoryError, restock, sell } from "../inventory";
import { UAE_VAT_RATE_BPS } from "../money";
import { loadSettings } from "../settings/store";

import type { DeliveryInput, OrderInput, PaymentInput, RefundInput } from "./forms";
import { orderTotals, paidFils } from "./totals";

// Orders made in the admin. An order takes its stock when it's made, through
// src/lib/inventory.ts, in the same transaction, so the last unit can't go to two orders
// (a held item goes to the order for the customer holding it). Cancelling puts the stock
// back. Money received is recorded as payments; what's due is calculated from them.
// Callers revalidate the catalog afterwards.

export type OrderProblem =
  | "not_found"
  | "not_allowed"
  | "product_unavailable"
  | "out_of_stock"
  | "no_zone"
  | "cannot_restock"
  | "overpaid"
  | "refund_too_large"
  | "order_closed";

export class OrderError extends Error {
  override name = "OrderError";
  constructor(
    readonly problem: OrderProblem,
    /** The product a line problem is about. */
    readonly productId?: number,
  ) {
    super(productId ? `${problem} (product ${productId})` : problem);
  }
}

/** Statuses an order still counts in: its stock is taken and its total is owed. */
export const ACTIVE_STATUSES = [
  "pending",
  "confirmed",
  "fulfilled",
] as const satisfies OrderStatus[];
const isActive = (status: OrderStatus) => (ACTIVE_STATUSES as readonly string[]).includes(status);

async function lockOrder(tx: Database, id: number): Promise<Order> {
  const [order] = await tx.select().from(orders).where(eq(orders.id, id)).for("update");
  if (!order) throw new OrderError("not_found");
  return order;
}

/** The fee of the first active delivery zone covering the emirate. */
async function zoneFee(db: Database, delivery: DeliveryInput): Promise<number> {
  if (delivery.feeFils !== undefined) return delivery.feeFils;
  if (delivery.method === "appointment" || !delivery.emirate) return 0;
  const [zone] = await db
    .select({ feeFils: deliveryZones.feeFils })
    .from(deliveryZones)
    .where(
      and(
        eq(deliveryZones.active, true),
        sql`${delivery.emirate}::emirate = any(${deliveryZones.emirates})`,
      ),
    )
    .orderBy(asc(deliveryZones.sort), asc(deliveryZones.id))
    .limit(1);
  if (!zone) throw new OrderError("no_zone");
  return zone.feeFils;
}

/**
 * Makes a confirmed order and takes its stock. Prices are the listed ones unless the
 * line agreed another; VAT is worked out at the rate in the settings now, and kept.
 */
export async function createOrder(
  db: Database,
  input: OrderInput,
): Promise<{ id: number; number: string }> {
  return db.transaction(async (tx) => {
    const shop = await loadSettings(tx);
    const vatRateBps = shop.vat_enabled ? UAE_VAT_RATE_BPS : 0;

    const found = await tx
      .select({
        id: products.id,
        title: products.titleEn,
        sku: products.sku,
        priceFils: products.priceFils,
        status: products.status,
        kind: products.kind,
      })
      .from(products)
      .where(
        inArray(
          products.id,
          input.lines.map((line) => line.productId),
        ),
      );
    const byId = new Map(found.map((product) => [product.id, product]));
    const lines = input.lines.map((line, sort) => {
      const product = byId.get(line.productId);
      const unitPriceFils = line.unitPriceFils ?? product?.priceFils ?? null;
      if (
        !product ||
        // A service add-on has no stock to take; it's sold with the cart (M13).
        product.kind === "service_addon" ||
        (product.status !== "available" && product.status !== "reserved") ||
        unitPriceFils === null
      ) {
        throw new OrderError("product_unavailable", line.productId);
      }
      return {
        productId: product.id,
        titleSnapshot: product.title,
        skuSnapshot: product.sku,
        unitPriceFils,
        quantity: line.quantity,
        sort,
      };
    });

    const { delivery } = input;
    const totals = orderTotals(lines, await zoneFee(tx, delivery), vatRateBps);
    const customerId = await upsertCustomer(tx, input.customer);
    const [order] = await tx
      .insert(orders)
      .values({
        // O-0001 … O-9999, then O-10000 and on.
        number: sql`(select 'O-' || lpad(n::text, greatest(4, length(n::text)), '0') from nextval('order_number_seq') as n)`,
        customerId,
        source: "manual",
        status: "confirmed",
        ...totals,
        vatRateBps,
        trn: vatRateBps > 0 ? shop.trn : null,
        deliveryMethod: delivery.method,
        emirate: delivery.emirate ?? null,
        area: delivery.area ?? null,
        addressLine: delivery.addressLine ?? null,
        landmark: delivery.landmark ?? null,
        note: input.note ?? null,
      })
      .returning({ id: orders.id, number: orders.number });
    await tx.insert(orderItems).values(lines.map((line) => ({ ...line, orderId: order.id })));

    try {
      await sell(tx, lines, { includeReserved: true });
    } catch (error) {
      if (error instanceof InventoryError) throw new OrderError("out_of_stock", error.productId);
      throw error;
    }
    return order;
  });
}

export type OrderBundle = {
  order: Order;
  customer: Customer;
  items: OrderItem[];
  payments: Payment[];
};

export async function loadOrder(db: Database, id: number): Promise<OrderBundle> {
  const [row] = await db
    .select({ order: orders, customer: customers })
    .from(orders)
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .where(eq(orders.id, id));
  if (!row) throw new OrderError("not_found");
  const [items, ledger] = await Promise.all([
    db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, id))
      .orderBy(asc(orderItems.sort), asc(orderItems.id)),
    db
      .select()
      .from(payments)
      .where(eq(payments.orderId, id))
      .orderBy(asc(payments.receivedAt), asc(payments.id)),
  ]);
  return { ...row, items, payments: ledger };
}

export type OrderBalance = {
  /** Received, less refunds. */
  paidFils: number;
  /** Still owed on an active order; 0 once paid, or on a cancelled or refunded one. */
  dueFils: number;
  /** Paid on a cancelled order and not yet given back. */
  toRefundFils: number;
};

export function orderBalance(
  order: Pick<Order, "status" | "totalFils">,
  ledger: readonly Pick<Payment, "kind" | "amountFils">[],
): OrderBalance {
  const paid = paidFils(ledger);
  const active = isActive(order.status);
  return {
    paidFils: paid,
    dueFils: active ? Math.max(order.totalFils - paid, 0) : 0,
    toRefundFils: order.status === "cancelled" ? Math.max(paid, 0) : 0,
  };
}

/** Handed over or delivered. Allowed with money still due (cash on delivery). */
export async function fulfilOrder(db: Database, id: number): Promise<void> {
  const updated = await db
    .update(orders)
    .set({ status: "fulfilled", fulfilledAt: new Date() })
    .where(and(eq(orders.id, id), inArray(orders.status, ["pending", "confirmed"])))
    .returning({ id: orders.id });
  if (updated.length === 0) {
    const [exists] = await db.select({ id: orders.id }).from(orders).where(eq(orders.id, id));
    throw new OrderError(exists ? "not_allowed" : "not_found");
  }
}

async function returnStock(tx: Database, orderId: number) {
  const items = await tx
    .select({ productId: orderItems.productId, quantity: orderItems.quantity })
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId))
    .orderBy(asc(orderItems.productId));
  for (const item of items) {
    try {
      await restock(tx, item.productId, item.quantity);
    } catch (error) {
      if (error instanceof InventoryError) throw new OrderError("cannot_restock", item.productId);
      throw error;
    }
  }
}

/** Cancels an order that hasn't been handed over, and puts its items back in stock. */
export async function cancelOrder(db: Database, id: number): Promise<void> {
  await db.transaction(async (tx) => {
    const order = await lockOrder(tx, id);
    if (order.status !== "pending" && order.status !== "confirmed") {
      throw new OrderError("not_allowed");
    }
    await returnStock(tx, id);
    await tx
      .update(orders)
      .set({ status: "cancelled", cancelledAt: new Date(), stockReturned: true })
      .where(eq(orders.id, id));
  });
}

async function paidOn(tx: Database, where: SQL): Promise<number> {
  return paidFils(
    await tx
      .select({ kind: payments.kind, amountFils: payments.amountFils })
      .from(payments)
      .where(where),
  );
}

/**
 * A refund after fulfilment (a return): records the money given back, if any, and puts
 * the items back in stock if they came back in sellable condition.
 */
export async function refundOrder(db: Database, id: number, input: RefundInput): Promise<void> {
  await db.transaction(async (tx) => {
    const order = await lockOrder(tx, id);
    if (order.status !== "fulfilled") throw new OrderError("not_allowed");
    if (input.amountFils !== undefined) {
      if (input.amountFils > (await paidOn(tx, eq(payments.orderId, id)))) {
        throw new OrderError("refund_too_large");
      }
      await tx.insert(payments).values({
        orderId: id,
        kind: "refund",
        method: input.method,
        amountFils: input.amountFils,
        receivedAt: new Date(),
        note: input.note ?? null,
      });
    }
    if (input.restock) await returnStock(tx, id);
    await tx
      .update(orders)
      .set({ status: "refunded", stockReturned: input.restock })
      .where(eq(orders.id, id));
  });
}

/**
 * Records money received for, or given back on, an order. A cancelled or refunded order
 * takes only refunds; nothing can take more than is due, or refund more than was paid.
 */
export async function recordOrderPayment(
  db: Database,
  orderId: number,
  input: PaymentInput,
): Promise<void> {
  await db.transaction(async (tx) => {
    const order = await lockOrder(tx, orderId);
    const paid = await paidOn(tx, eq(payments.orderId, orderId));
    if (input.kind === "refund") {
      if (input.amountFils > paid) throw new OrderError("refund_too_large");
    } else {
      if (!isActive(order.status)) throw new OrderError("order_closed");
      if (input.amountFils > order.totalFils - paid) throw new OrderError("overpaid");
    }
    await tx.insert(payments).values({
      orderId,
      kind: input.kind,
      method: input.method,
      amountFils: input.amountFils,
      receivedAt: input.receivedAt,
      providerRef: input.providerRef ?? null,
      note: input.note ?? null,
    });
  });
}

/** Removes a payment recorded by mistake. Returns its order, or null if it was gone. */
export async function deleteOrderPayment(db: Database, paymentId: number): Promise<number | null> {
  const [deleted] = await db
    .delete(payments)
    .where(and(eq(payments.id, paymentId), sql`${payments.orderId} is not null`))
    .returning({ orderId: payments.orderId });
  return deleted?.orderId ?? null;
}

export type OrderFilter = "open" | "due" | OrderStatus | "all";

/** Matches the order number, the customer's name or the digits of their phone. */
function search(q: string): SQL | undefined {
  const text = q.trim().slice(0, 60);
  if (!text) return undefined;
  const pattern = `%${text.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const digits = toWesternDigits(text).replace(/\D/g, "");
  return or(
    ilike(orders.number, pattern),
    ilike(customers.name, pattern),
    digits.length >= 3 ? ilike(customers.phoneE164, `%${digits}%`) : undefined,
  );
}

/** Net paid per order, as a subquery. */
function paidByOrder(db: Database) {
  return db
    .select({
      orderId: payments.orderId,
      paid: sql<number>`sum(case when ${payments.kind} = 'refund' then -${payments.amountFils} else ${payments.amountFils} end)::int`.as(
        "paid",
      ),
    })
    .from(payments)
    .groupBy(payments.orderId)
    .as("paid_by_order");
}

/**
 * Newest first. "open" is what's still to hand over (pending, confirmed); "due" is any
 * active order with money still owed.
 */
export async function listOrders(db: Database, filter: OrderFilter = "open", q = "") {
  const paid = paidByOrder(db);
  const due = sql`${orders.totalFils} - coalesce(${paid.paid}, 0)`;
  return db
    .select({
      order: orders,
      customer: customers,
      paidFils: sql<number>`coalesce(${paid.paid}, 0)::int`,
    })
    .from(orders)
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .leftJoin(paid, eq(paid.orderId, orders.id))
    .where(
      and(
        filter === "open"
          ? inArray(orders.status, ["pending", "confirmed"])
          : filter === "due"
            ? and(inArray(orders.status, ACTIVE_STATUSES), sql`${due} > 0`)
            : filter === "all"
              ? undefined
              : eq(orders.status, filter),
        search(q),
      ),
    )
    .orderBy(desc(orders.id))
    .limit(200);
}

/** For the overview. */
export async function orderCounts(db: Database, now = new Date()) {
  const paid = paidByOrder(db);
  const yearAgo = new Date(now);
  yearAgo.setFullYear(yearAgo.getFullYear() - 1);
  const [[counts], [holds], [received]] = await Promise.all([
    db
      .select({
        toHandOver: sql<number>`count(*) filter (where ${orders.status} in ('pending', 'confirmed'))::int`,
        balanceDue: sql<number>`count(*) filter (where ${orders.status} in ('pending', 'confirmed', 'fulfilled') and ${orders.totalFils} > coalesce(${paid.paid}, 0))::int`,
        toRefund: sql<number>`count(*) filter (where ${orders.status} = 'cancelled' and coalesce(${paid.paid}, 0) > 0)::int`,
      })
      .from(orders)
      .leftJoin(paid, eq(paid.orderId, orders.id)),
    db
      .select({ overdue: sql<number>`count(*)::int` })
      .from(products)
      .where(
        and(
          eq(products.status, "reserved"),
          sql`${products.reservedUntil} < ${now.toISOString()}::timestamptz`,
        ),
      ),
    // Orders and repairs alike, for the VAT registration threshold.
    db
      .select({
        fils: sql<number>`coalesce(sum(case when ${payments.kind} = 'refund' then -${payments.amountFils} else ${payments.amountFils} end), 0)::bigint`,
      })
      .from(payments)
      .where(sql`${payments.receivedAt} > ${yearAgo.toISOString()}::timestamptz`),
  ]);
  return { ...counts, overdueHolds: holds.overdue, last12MonthsFils: Number(received.fils) };
}
