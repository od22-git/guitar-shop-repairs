import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, inject, it } from "vitest";

import { createPgliteDatabase, createPostgresDatabase, type TestDatabase } from "@/test/db";
import { insertProduct } from "@/test/products";

import type { Database } from "./db/connect";
import { products } from "./db/schema";
import { InventoryError, release, reserve, restock, sell } from "./inventory";

const postgresUrl = inject("testPostgresUrl");

// PGlite runs everywhere but serves one query at a time. A real Postgres server (CI)
// also shows the row locking that settles races between separate connections.
const targets = [
  { name: "PGlite", create: createPgliteDatabase, concurrent: false },
  ...(postgresUrl
    ? [{ name: "Postgres", create: () => createPostgresDatabase(postgresUrl), concurrent: true }]
    : []),
];

async function stock(db: Database, id: number) {
  const [row] = await db
    .select({
      status: products.status,
      quantity: products.quantity,
      soldAt: products.soldAt,
      reservedNote: products.reservedNote,
      reservedUntil: products.reservedUntil,
    })
    .from(products)
    .where(eq(products.id, id));
  return row;
}

async function inventoryError(promise: Promise<unknown>): Promise<InventoryError> {
  const error = await promise.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(InventoryError);
  return error as InventoryError;
}

describe.each(targets)("inventory on $name", ({ create, concurrent }) => {
  let test: TestDatabase;
  let db: Database;

  beforeAll(async () => {
    test = await create();
    db = test.db;
  }, 30_000);
  afterAll(() => test?.close());
  beforeEach(() => test.reset());

  describe("reserve and release", () => {
    it("holds a one-off item and releases it", async () => {
      const id = await insertProduct(db);
      const until = new Date("2026-11-01T12:00:00Z");
      await reserve(db, id, { note: "Deposit AED 500", until });
      expect(await stock(db, id)).toMatchObject({
        status: "reserved",
        quantity: 1,
        reservedNote: "Deposit AED 500",
        reservedUntil: until,
      });

      await release(db, id);
      expect(await stock(db, id)).toMatchObject({
        status: "available",
        reservedNote: null,
        reservedUntil: null,
      });
    });

    it("refuses to hold what isn't available as a single unit", async () => {
      const held = await insertProduct(db, { status: "reserved" });
      const sold = await insertProduct(db, { status: "sold", quantity: 0 });
      const draft = await insertProduct(db, { status: "draft" });
      const several = await insertProduct(db, { kind: "gear", quantity: 3 });
      for (const id of [held, sold, draft, several]) {
        const error = await inventoryError(reserve(db, id));
        expect(error).toMatchObject({ problem: "not_available", productId: id });
      }
      expect(await stock(db, several)).toMatchObject({ status: "available", quantity: 3 });
    });

    it("refuses to release what isn't held", async () => {
      const id = await insertProduct(db);
      expect(await inventoryError(release(db, id))).toMatchObject({ problem: "not_reserved" });
    });
  });

  describe("sell", () => {
    it("marks a guitar sold when it goes", async () => {
      const id = await insertProduct(db);
      await sell(db, [{ productId: id, quantity: 1 }]);
      const after = await stock(db, id);
      expect(after).toMatchObject({ status: "sold", quantity: 0 });
      expect(after.soldAt).toBeInstanceOf(Date);
    });

    it("takes gear units one sale at a time and is sold out at zero", async () => {
      const id = await insertProduct(db, { kind: "gear", quantity: 3 });
      await sell(db, [{ productId: id, quantity: 2 }]);
      expect(await stock(db, id)).toMatchObject({ status: "available", quantity: 1, soldAt: null });

      expect(await inventoryError(sell(db, [{ productId: id, quantity: 2 }]))).toMatchObject({
        problem: "not_available",
        productId: id,
      });
      expect(await stock(db, id)).toMatchObject({ status: "available", quantity: 1 });

      await sell(db, [{ productId: id, quantity: 1 }]);
      expect(await stock(db, id)).toMatchObject({ status: "sold", quantity: 0 });
    });

    it("only sells a held item to its holder", async () => {
      const id = await insertProduct(db, { status: "reserved", reservedNote: "Deposit" });
      await inventoryError(sell(db, [{ productId: id, quantity: 1 }]));
      expect(await stock(db, id)).toMatchObject({ status: "reserved", quantity: 1 });

      await sell(db, [{ productId: id, quantity: 1 }], { includeReserved: true });
      expect(await stock(db, id)).toMatchObject({
        status: "sold",
        quantity: 0,
        reservedNote: null,
      });
    });

    it("never sells drafts, archived or sold products", async () => {
      for (const status of ["draft", "archived"] as const) {
        const id = await insertProduct(db, { status });
        await inventoryError(sell(db, [{ productId: id, quantity: 1 }], { includeReserved: true }));
      }
      const sold = await insertProduct(db, { status: "sold", quantity: 0 });
      await inventoryError(sell(db, [{ productId: sold, quantity: 1 }]));
    });

    it("sells every line or none", async () => {
      const guitar = await insertProduct(db);
      const strings = await insertProduct(db, { kind: "gear", quantity: 5 });
      const soldOut = await insertProduct(db, { kind: "gear", status: "sold", quantity: 0 });

      const error = await inventoryError(
        sell(db, [
          { productId: guitar, quantity: 1 },
          { productId: strings, quantity: 2 },
          { productId: soldOut, quantity: 1 },
        ]),
      );
      expect(error.productId).toBe(soldOut);
      expect(await stock(db, guitar)).toMatchObject({ status: "available", quantity: 1 });
      expect(await stock(db, strings)).toMatchObject({ status: "available", quantity: 5 });

      await sell(db, [
        { productId: strings, quantity: 2 },
        { productId: guitar, quantity: 1 },
      ]);
      expect(await stock(db, guitar)).toMatchObject({ status: "sold", quantity: 0 });
      expect(await stock(db, strings)).toMatchObject({ status: "available", quantity: 3 });
    });

    it("adds up repeated lines for the same product", async () => {
      const id = await insertProduct(db, { kind: "gear", quantity: 2 });
      await inventoryError(
        sell(db, [
          { productId: id, quantity: 2 },
          { productId: id, quantity: 1 },
        ]),
      );
      await sell(db, [
        { productId: id, quantity: 1 },
        { productId: id, quantity: 1 },
      ]);
      expect(await stock(db, id)).toMatchObject({ status: "sold", quantity: 0 });
    });

    it("rejects quantities that aren't whole and positive", async () => {
      const id = await insertProduct(db, { kind: "gear", quantity: 5 });
      for (const quantity of [0, -1, 1.5, Number.NaN]) {
        await expect(sell(db, [{ productId: id, quantity }])).rejects.toThrow(RangeError);
      }
      expect(await stock(db, id)).toMatchObject({ quantity: 5 });
    });
  });

  describe("restock", () => {
    it("brings a sold guitar back", async () => {
      const id = await insertProduct(db);
      await sell(db, [{ productId: id, quantity: 1 }]);
      await restock(db, id);
      expect(await stock(db, id)).toMatchObject({ status: "available", quantity: 1, soldAt: null });
    });

    it("adds gear units and lists sold-out gear again", async () => {
      const id = await insertProduct(db, { kind: "gear", status: "sold", quantity: 0 });
      await restock(db, id, 4);
      expect(await stock(db, id)).toMatchObject({ status: "available", quantity: 4 });
      await restock(db, id, 2);
      expect(await stock(db, id)).toMatchObject({ status: "available", quantity: 6 });
    });

    it("keeps a draft a draft", async () => {
      const id = await insertProduct(db, { kind: "gear", status: "draft", quantity: 0 });
      await restock(db, id, 3);
      expect(await stock(db, id)).toMatchObject({ status: "draft", quantity: 3 });
    });

    it("never gives a guitar a second unit or restocks a held item", async () => {
      const guitar = await insertProduct(db);
      expect(await inventoryError(restock(db, guitar))).toMatchObject({
        problem: "cannot_restock",
      });
      const held = await insertProduct(db, { kind: "gear", status: "reserved" });
      await inventoryError(restock(db, held));
      expect(await stock(db, guitar)).toMatchObject({ quantity: 1 });
      expect(await stock(db, held)).toMatchObject({ status: "reserved", quantity: 1 });
    });
  });

  describe("two buyers, one guitar", () => {
    it("sells it once when both orders arrive together", async () => {
      const id = await insertProduct(db);
      const results = await Promise.allSettled([
        sell(db, [{ productId: id, quantity: 1 }]),
        sell(db, [{ productId: id, quantity: 1 }]),
      ]);
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      const [failed] = results.filter((r) => r.status === "rejected");
      expect(failed.reason).toBeInstanceOf(InventoryError);
      expect(await stock(db, id)).toMatchObject({ status: "sold", quantity: 0 });
    });

    it("fails the second order cleanly when it waits on the first one's transaction", async () => {
      const id = await insertProduct(db);
      let commitFirst!: () => void;
      const firstMayCommit = new Promise<void>((resolve) => (commitFirst = resolve));
      let firstHasSold!: () => void;
      const firstSold = new Promise<void>((resolve) => (firstHasSold = resolve));

      // The first order takes the guitar inside a transaction that stays open...
      const first = db.transaction(async (tx) => {
        await sell(tx, [{ productId: id, quantity: 1 }]);
        firstHasSold();
        await firstMayCommit;
      });
      await firstSold;

      // ...while the second order tries for the same guitar.
      const second = sell(db, [{ productId: id, quantity: 1 }]);
      if (concurrent) {
        // On a server, the second order's UPDATE is blocked on the first one's row lock.
        await expect.poll(() => blockedOnLock(db), { timeout: 5_000 }).toBe(1);
      }
      commitFirst();

      await first;
      expect(await inventoryError(second)).toMatchObject({ problem: "not_available" });
      expect(await stock(db, id)).toMatchObject({ status: "sold", quantity: 0 });
    });

    it("lets exactly as many buyers through as there are units", async () => {
      const id = await insertProduct(db, { kind: "gear", quantity: 3 });
      const results = await Promise.allSettled(
        Array.from({ length: 8 }, () => sell(db, [{ productId: id, quantity: 1 }])),
      );
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(3);
      expect(await stock(db, id)).toMatchObject({ status: "sold", quantity: 0 });
    });
  });
});

/** Sessions in this database currently waiting for a lock. */
async function blockedOnLock(db: Database): Promise<number> {
  const [{ waiting }] = await db
    .select({ waiting: sql<number>`count(*)::int` })
    .from(sql`pg_stat_activity`)
    .where(sql`datname = current_database() and wait_event_type = 'Lock'`);
  return waiting;
}
