import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createPgliteDatabase, type TestDatabase } from "@/test/db";
import { insertProduct } from "@/test/products";

import type { Database } from "../db/connect";
import { customers, deliveryZones, orders, payments, products } from "../db/schema";
import { reserve } from "../inventory";
import { saveSettings } from "../settings/store";

import { parseOrderForm, parsePaymentForm, parseRefundForm, type OrderInput } from "./forms";
import {
  cancelOrder,
  createOrder,
  deleteOrderPayment,
  fulfilOrder,
  listOrders,
  loadOrder,
  orderBalance,
  orderCounts,
  OrderError,
  recordOrderPayment,
  refundOrder,
} from "./index";

let test: TestDatabase;
let db: Database;

beforeAll(async () => {
  test = await createPgliteDatabase();
  db = test.db;
}, 30_000);
afterAll(() => test?.close());
beforeEach(async () => {
  await test.reset();
  await db.insert(deliveryZones).values([
    { nameEn: "RAK", nameAr: "رأس الخيمة", emirates: ["ras_al_khaimah"], feeFils: 2_000 },
    { nameEn: "North", nameAr: "الشمال", emirates: ["dubai", "sharjah"], feeFils: 3_500 },
    {
      nameEn: "Abu Dhabi",
      nameAr: "أبوظبي",
      emirates: ["abu_dhabi"],
      feeFils: 4_500,
      active: false,
    },
  ]);
});

const customer = {
  name: "Omar",
  phone: "+971501234567",
  preferredLocale: "ar" as const,
  whatsappConsent: true,
};

const order = (lines: OrderInput["lines"], delivery: Partial<OrderInput["delivery"]> = {}) => ({
  customer,
  lines,
  delivery: { method: "appointment" as const, ...delivery },
});

async function orderError(promise: Promise<unknown>): Promise<OrderError> {
  const error = await promise.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(OrderError);
  return error as OrderError;
}

async function stock(id: number) {
  const [row] = await db
    .select({ status: products.status, quantity: products.quantity })
    .from(products)
    .where(eq(products.id, id));
  return row;
}

const payment = (kind: "deposit" | "payment" | "refund", amountFils: number) => ({
  kind,
  method: "cash" as const,
  amountFils,
  receivedAt: new Date(),
});

describe("createOrder", () => {
  it("takes the stock, snapshots the lines and adds the zone's delivery fee", async () => {
    const guitar = await insertProduct(db, { priceFils: 345_000 });
    const pedal = await insertProduct(db, { kind: "gear", quantity: 5, priceFils: 45_000 });
    const { id, number } = await createOrder(
      db,
      order(
        [
          { productId: guitar, quantity: 1 },
          { productId: pedal, quantity: 2, unitPriceFils: 40_000 },
        ],
        { method: "courier", emirate: "dubai", area: "Al Barsha" },
      ),
    );
    expect(number).toBe("O-0001");
    const bundle = await loadOrder(db, id);
    expect(bundle.order).toMatchObject({
      status: "confirmed",
      subtotalFils: 425_000,
      deliveryFeeFils: 3_500,
      totalFils: 428_500,
      vatFils: 0,
      vatRateBps: 0,
      trn: null,
      emirate: "dubai",
      area: "Al Barsha",
    });
    expect(bundle.items.map((item) => [item.productId, item.unitPriceFils, item.quantity])).toEqual(
      [
        [guitar, 345_000, 1],
        [pedal, 40_000, 2],
      ],
    );
    expect(bundle.customer).toMatchObject({ name: "Omar", preferredLocale: "ar" });
    expect(await stock(guitar)).toEqual({ status: "sold", quantity: 0 });
    expect(await stock(pedal)).toEqual({ status: "available", quantity: 3 });
  });

  it("works VAT out of the total while it's on, and keeps the TRN", async () => {
    await saveSettings(db, { vat_enabled: true, trn: "100123456700003" });
    const guitar = await insertProduct(db, { priceFils: 345_000 });
    const { id } = await createOrder(
      db,
      order([{ productId: guitar, quantity: 1 }], { method: "courier", emirate: "ras_al_khaimah" }),
    );
    const { order: saved } = await loadOrder(db, id);
    // 345000 × 5/105 → 16429, and 2000 × 5/105 → 95.
    expect(saved).toMatchObject({
      totalFils: 347_000,
      vatFils: 16_429 + 95,
      vatRateBps: 500,
      trn: "100123456700003",
    });
  });

  it("sells a held item to the order for it", async () => {
    const guitar = await insertProduct(db);
    await reserve(db, guitar, { note: "Omar, deposit" });
    await createOrder(db, order([{ productId: guitar, quantity: 1 }]));
    expect(await stock(guitar)).toEqual({ status: "sold", quantity: 0 });
  });

  it("refuses unlisted products, missing stock and emirates with no active zone, changing nothing", async () => {
    const draft = await insertProduct(db, { status: "draft" });
    const pedal = await insertProduct(db, { kind: "gear", quantity: 1 });
    const guitar = await insertProduct(db);
    expect(
      (await orderError(createOrder(db, order([{ productId: draft, quantity: 1 }])))).problem,
    ).toBe("product_unavailable");
    // A service add-on has no stock to take; it's sold with the cart (M13).
    const addon = await insertProduct(db, { kind: "service_addon", quantity: 0 });
    expect(
      (await orderError(createOrder(db, order([{ productId: addon, quantity: 1 }])))).problem,
    ).toBe("product_unavailable");
    const short = await orderError(
      createOrder(
        db,
        order([
          { productId: guitar, quantity: 1 },
          { productId: pedal, quantity: 2 },
        ]),
      ),
    );
    expect([short.problem, short.productId]).toEqual(["out_of_stock", pedal]);
    expect(
      (
        await orderError(
          createOrder(
            db,
            order([{ productId: guitar, quantity: 1 }], {
              method: "courier",
              emirate: "abu_dhabi",
            }),
          ),
        )
      ).problem,
    ).toBe("no_zone");
    // Nothing half-done: no orders, no customer, the guitar still for sale.
    expect(await db.select().from(orders)).toHaveLength(0);
    expect(await db.select().from(customers)).toHaveLength(0);
    expect(await stock(guitar)).toEqual({ status: "available", quantity: 1 });
  });

  it("takes a typed delivery fee over the zone's", async () => {
    const guitar = await insertProduct(db);
    const { id } = await createOrder(
      db,
      order([{ productId: guitar, quantity: 1 }], {
        method: "courier",
        emirate: "abu_dhabi",
        feeFils: 0,
      }),
    );
    expect((await loadOrder(db, id)).order.deliveryFeeFils).toBe(0);
  });

  it("lets only one of two orders have the last unit", async () => {
    const guitar = await insertProduct(db);
    const results = await Promise.allSettled([
      createOrder(db, order([{ productId: guitar, quantity: 1 }])),
      createOrder(db, order([{ productId: guitar, quantity: 1 }])),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await db.select().from(orders)).toHaveLength(1);
  });
});

describe("payments and the balance", () => {
  it("takes a deposit and payments up to the total, and refunds up to what was paid", async () => {
    const guitar = await insertProduct(db, { priceFils: 300_000 });
    const { id } = await createOrder(db, order([{ productId: guitar, quantity: 1 }]));
    await recordOrderPayment(db, id, payment("deposit", 50_000));
    let bundle = await loadOrder(db, id);
    expect(orderBalance(bundle.order, bundle.payments)).toEqual({
      paidFils: 50_000,
      dueFils: 250_000,
      toRefundFils: 0,
    });
    expect(
      (await orderError(recordOrderPayment(db, id, payment("payment", 250_001)))).problem,
    ).toBe("overpaid");
    await recordOrderPayment(db, id, payment("payment", 250_000));
    bundle = await loadOrder(db, id);
    expect(orderBalance(bundle.order, bundle.payments).dueFils).toBe(0);
    expect((await orderError(recordOrderPayment(db, id, payment("refund", 300_001)))).problem).toBe(
      "refund_too_large",
    );
  });

  it("removes a payment entered by mistake", async () => {
    const guitar = await insertProduct(db);
    const { id } = await createOrder(db, order([{ productId: guitar, quantity: 1 }]));
    await recordOrderPayment(db, id, payment("payment", 10_000));
    const [{ id: paymentId }] = await db.select({ id: payments.id }).from(payments);
    expect(await deleteOrderPayment(db, paymentId)).toBe(id);
    expect(await deleteOrderPayment(db, paymentId)).toBeNull();
  });
});

describe("fulfil, cancel and refund", () => {
  it("cancelling puts the stock back and asks for the deposit to be returned", async () => {
    const guitar = await insertProduct(db);
    const pedal = await insertProduct(db, { kind: "gear", quantity: 3 });
    const { id } = await createOrder(
      db,
      order([
        { productId: guitar, quantity: 1 },
        { productId: pedal, quantity: 2 },
      ]),
    );
    await recordOrderPayment(db, id, payment("deposit", 20_000));
    await cancelOrder(db, id);
    expect(await stock(guitar)).toEqual({ status: "available", quantity: 1 });
    expect(await stock(pedal)).toEqual({ status: "available", quantity: 3 });
    let bundle = await loadOrder(db, id);
    expect(bundle.order).toMatchObject({ status: "cancelled", stockReturned: true });
    expect(orderBalance(bundle.order, bundle.payments)).toEqual({
      paidFils: 20_000,
      dueFils: 0,
      toRefundFils: 20_000,
    });
    // Only refunds from now on, and a second cancel is refused.
    expect((await orderError(recordOrderPayment(db, id, payment("payment", 1)))).problem).toBe(
      "order_closed",
    );
    await recordOrderPayment(db, id, payment("refund", 20_000));
    bundle = await loadOrder(db, id);
    expect(orderBalance(bundle.order, bundle.payments).toRefundFils).toBe(0);
    expect((await orderError(cancelOrder(db, id))).problem).toBe("not_allowed");
  });

  it("a fulfilled order can't be cancelled, only refunded, with stock back if asked", async () => {
    const guitar = await insertProduct(db, { priceFils: 200_000 });
    const { id } = await createOrder(db, order([{ productId: guitar, quantity: 1 }]));
    await recordOrderPayment(db, id, payment("payment", 200_000));
    await fulfilOrder(db, id);
    expect((await orderError(fulfilOrder(db, id))).problem).toBe("not_allowed");
    expect((await orderError(cancelOrder(db, id))).problem).toBe("not_allowed");
    expect(
      (
        await orderError(
          refundOrder(db, id, { amountFils: 200_001, method: "cash", restock: true }),
        )
      ).problem,
    ).toBe("refund_too_large");
    await refundOrder(db, id, { amountFils: 180_000, method: "bank_transfer", restock: true });
    const bundle = await loadOrder(db, id);
    expect(bundle.order).toMatchObject({ status: "refunded", stockReturned: true });
    expect(orderBalance(bundle.order, bundle.payments)).toEqual({
      paidFils: 20_000,
      dueFils: 0,
      toRefundFils: 0,
    });
    expect(await stock(guitar)).toEqual({ status: "available", quantity: 1 });
  });

  it("can refund without restocking", async () => {
    const guitar = await insertProduct(db);
    const { id } = await createOrder(db, order([{ productId: guitar, quantity: 1 }]));
    await fulfilOrder(db, id);
    await refundOrder(db, id, { method: "cash", restock: false });
    expect(await stock(guitar)).toEqual({ status: "sold", quantity: 0 });
    expect(await db.select().from(payments)).toHaveLength(0);
  });

  it("says which product can't go back into stock", async () => {
    const guitar = await insertProduct(db);
    const { id } = await createOrder(db, order([{ productId: guitar, quantity: 1 }]));
    // Put back by hand already, so a guitar can't take a second unit.
    await db
      .update(products)
      .set({ status: "available", quantity: 1, soldAt: null })
      .where(eq(products.id, guitar));
    const error = await orderError(cancelOrder(db, id));
    expect([error.problem, error.productId]).toEqual(["cannot_restock", guitar]);
    expect((await loadOrder(db, id)).order.status).toBe("confirmed");
  });
});

describe("lists and counts", () => {
  it("filters open and owing orders, and totals a year of payments", async () => {
    const a = await insertProduct(db, { priceFils: 100_000 });
    const b = await insertProduct(db, { priceFils: 50_000 });
    const held = await insertProduct(db);
    await reserve(db, held, { until: new Date("2026-01-01T00:00:00Z") });
    const first = await createOrder(db, order([{ productId: a, quantity: 1 }]));
    const second = await createOrder(db, order([{ productId: b, quantity: 1 }]));
    await recordOrderPayment(db, second.id, payment("payment", 50_000));
    await fulfilOrder(db, second.id);
    await recordOrderPayment(db, first.id, {
      ...payment("deposit", 10_000),
      receivedAt: new Date("2025-06-01T00:00:00Z"),
    });

    expect((await listOrders(db, "open")).map((row) => row.order.id)).toEqual([first.id]);
    expect((await listOrders(db, "due")).map((row) => row.order.id)).toEqual([first.id]);
    expect((await listOrders(db, "all", "O-0002")).map((row) => row.order.id)).toEqual([second.id]);
    expect((await listOrders(db, "all", "50 123 4567")).length).toBe(2);

    const counts = await orderCounts(db, new Date("2026-10-26T00:00:00Z"));
    expect(counts).toEqual({
      toHandOver: 1,
      balanceDue: 1,
      toRefund: 0,
      overdueHolds: 1,
      // The deposit from June 2025 is over a year old.
      last12MonthsFils: 50_000,
    });
  });
});

describe("forms", () => {
  const form = (entries: [string, string][]) => {
    const data = new FormData();
    for (const [key, value] of entries) data.append(key, value);
    return data;
  };
  const head: [string, string][] = [
    ["name", "Omar"],
    ["phone", "٠٥٠ ١٢٣ ٤٥٦٧"],
    ["preferredLocale", "ar"],
  ];

  it("reads the lines, skipping blank rows, and the address only for courier", () => {
    const parsed = parseOrderForm(
      form([
        ...head,
        ["productId", "3"],
        ["quantity", "1"],
        ["unitPrice", "3,200"],
        ["productId", ""],
        ["quantity", "1"],
        ["unitPrice", ""],
        ["productId", "7"],
        ["quantity", "2"],
        ["unitPrice", ""],
        ["deliveryMethod", "appointment"],
        ["emirate", "dubai"],
        ["area", "Marina"],
      ]),
    );
    expect(parsed).toEqual({
      ok: true,
      data: {
        customer: {
          name: "Omar",
          phone: "+971501234567",
          preferredLocale: "ar",
          whatsappConsent: false,
        },
        lines: [
          { productId: 3, quantity: 1, unitPriceFils: 320_000 },
          { productId: 7, quantity: 2 },
        ],
        delivery: { method: "appointment" },
        note: undefined,
      },
    });
  });

  it("names the problem fields", () => {
    const parsed = parseOrderForm(
      form([
        ["name", ""],
        ["phone", "123"],
        ["preferredLocale", "en"],
        ["productId", "3"],
        ["quantity", "0"],
        ["unitPrice", ""],
        ["productId", "4"],
        ["quantity", "1"],
        ["unitPrice", "-5"],
        ["deliveryMethod", "courier"],
      ]),
    );
    expect(parsed.ok).toBe(false);
    expect(parsed.ok ? {} : Object.keys(parsed.errors).sort()).toEqual(
      ["emirate", "name", "phone", "quantity.0", "unitPrice.1"].sort(),
    );
    const empty = parseOrderForm(form([...head, ["deliveryMethod", "appointment"]]));
    expect(empty.ok ? {} : empty.errors).toEqual({ "productId.0": "Add at least one product" });
  });

  it("reads payments and refunds", () => {
    const paid = parsePaymentForm(
      form([
        ["kind", "deposit"],
        ["method", "bank_transfer"],
        ["amount", "500"],
        ["receivedOn", "2026-10-01"],
        ["providerRef", "FT123"],
      ]),
    );
    expect(paid.ok && paid.data).toMatchObject({
      kind: "deposit",
      method: "bank_transfer",
      amountFils: 50_000,
      providerRef: "FT123",
    });
    expect(paid.ok && paid.data.receivedAt.toISOString()).toBe("2026-10-01T19:59:59.999Z");
    const bad = parsePaymentForm(
      form([
        ["kind", "deposit"],
        ["method", "card_online"],
        ["amount", "0"],
        ["receivedOn", "2999-01-01"],
      ]),
    );
    expect(bad.ok ? [] : Object.keys(bad.errors).sort()).toEqual([
      "amount",
      "method",
      "receivedOn",
    ]);
    expect(parseRefundForm(form([["method", "cash"]]))).toEqual({
      ok: true,
      data: { method: "cash", restock: false, note: undefined },
    });
  });
});
