import { and, eq, inArray, sql } from "drizzle-orm";

import type { Database } from "./db/connect";
import { products, type ProductStatus } from "./db/schema";

// Stock changes. Each is one conditional UPDATE whose WHERE clause states what must
// be true for it to apply, so concurrent requests can't both take the last unit:
// Postgres locks the row, and the second UPDATE re-checks its WHERE against the
// first one's committed result and matches nothing. Callers (admin actions, orders)
// revalidate the catalog pages afterwards.

export type InventoryProblem = "not_available" | "not_reserved" | "cannot_restock";

export class InventoryError extends Error {
  override name = "InventoryError";
  constructor(
    readonly problem: InventoryProblem,
    readonly productId: number,
  ) {
    super(`${problem} (product ${productId})`);
  }
}

export type StockLine = { productId: number; quantity: number };

function assertQuantity(quantity: number) {
  if (!Number.isSafeInteger(quantity) || quantity < 1) {
    throw new RangeError(`Quantity must be a whole number of at least 1, got ${quantity}`);
  }
}

/**
 * Puts a one-off item on hold for a customer, e.g. after a deposit. Only an available
 * listing with a single unit can be held. `until` is when the hold is due to end; the
 * dashboard flags it once that passes (nothing releases it automatically).
 */
export async function reserve(
  db: Database,
  productId: number,
  hold: { note?: string | null; until?: Date | null } = {},
): Promise<void> {
  const updated = await db
    .update(products)
    .set({ status: "reserved", reservedNote: hold.note ?? null, reservedUntil: hold.until ?? null })
    .where(
      and(eq(products.id, productId), eq(products.status, "available"), eq(products.quantity, 1)),
    )
    .returning({ id: products.id });
  if (updated.length === 0) throw new InventoryError("not_available", productId);
}

/** Ends a hold: the item is available again. */
export async function release(db: Database, productId: number): Promise<void> {
  const updated = await db
    .update(products)
    .set({ status: "available", reservedNote: null, reservedUntil: null })
    .where(and(eq(products.id, productId), eq(products.status, "reserved")))
    .returning({ id: products.id });
  if (updated.length === 0) throw new InventoryError("not_reserved", productId);
}

/**
 * Takes stock for a sale: all lines or none (one transaction). A line fails when the
 * product isn't for sale or has fewer units than asked; the error names it. Held items
 * are only sold with `includeReserved`, for the sale to the customer holding them.
 * A product whose last unit goes is marked sold.
 */
export async function sell(
  db: Database,
  lines: readonly StockLine[],
  { includeReserved = false }: { includeReserved?: boolean } = {},
): Promise<void> {
  // One update per product, in id order so two multi-line sales lock rows in the same
  // order and can't deadlock.
  const wanted = new Map<number, number>();
  for (const { productId, quantity } of lines) {
    assertQuantity(quantity);
    wanted.set(productId, (wanted.get(productId) ?? 0) + quantity);
  }
  const sellable: ProductStatus[] = includeReserved ? ["available", "reserved"] : ["available"];

  await db.transaction(async (tx) => {
    for (const [productId, quantity] of [...wanted].sort(([a], [b]) => a - b)) {
      const left = sql`${products.quantity} - ${quantity}`;
      const updated = await tx
        .update(products)
        .set({
          quantity: left,
          status: sql`case when ${left} = 0 then 'sold'::product_status else 'available'::product_status end`,
          soldAt: sql`case when ${left} = 0 then now() else ${products.soldAt} end`,
          reservedNote: null,
          reservedUntil: null,
        })
        .where(
          and(
            eq(products.id, productId),
            inArray(products.status, sellable),
            sql`${products.quantity} >= ${quantity}`,
          ),
        )
        .returning({ id: products.id });
      if (updated.length === 0) throw new InventoryError("not_available", productId);
    }
  });
}

/**
 * Puts units back, e.g. when an order is cancelled or an item comes back. A sold
 * product becomes available again. A guitar holds at most one unit, a service add-on
 * has no stock, and a held item can't be restocked (release the hold first).
 */
export async function restock(db: Database, productId: number, quantity = 1): Promise<void> {
  assertQuantity(quantity);
  const total = sql`${products.quantity} + ${quantity}`;
  const updated = await db
    .update(products)
    .set({
      quantity: total,
      status: sql`case when ${products.status} = 'sold' then 'available'::product_status else ${products.status} end`,
      soldAt: null,
    })
    .where(
      and(
        eq(products.id, productId),
        inArray(products.status, ["draft", "available", "sold", "archived"]),
        // A guitar holds one unit; a service add-on has no stock.
        sql`${products.kind} <> 'service_addon' and (${products.kind} <> 'guitar' or ${total} <= 1)`,
      ),
    )
    .returning({ id: products.id });
  if (updated.length === 0) throw new InventoryError("cannot_restock", productId);
}
