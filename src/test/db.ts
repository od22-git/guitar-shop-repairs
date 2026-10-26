import { randomUUID } from "node:crypto";

import { PGlite } from "@electric-sql/pglite";
import { sql } from "drizzle-orm";
import { drizzle as drizzleNodePg } from "drizzle-orm/node-postgres";
import { migrate as migrateNodePg } from "drizzle-orm/node-postgres/migrator";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import pg from "pg";

import type { Database } from "@/lib/db/connect";
import * as schema from "@/lib/db/schema";

declare module "vitest" {
  export interface ProvidedContext {
    /** TEST_DATABASE_URL, or "" when there is no Postgres server to test against. */
    testPostgresUrl: string;
  }
}

const migrationsFolder = new URL("../../drizzle", import.meta.url).pathname;

export type TestDatabase = {
  db: Database;
  /** Empties every table and restarts ids, between tests. */
  reset: () => Promise<void>;
  close: () => Promise<void>;
};

async function truncateAll(db: Database) {
  await db.execute(sql`alter sequence repair_ticket_number_seq restart`);
  await db.execute(sql`alter sequence order_number_seq restart`);
  await db.execute(
    sql`truncate table product_images, products, categories, settings, delivery_zones, auth_users, auth_sessions, auth_accounts, auth_verifications, auth_two_factors, auth_rate_limits, customers, repair_tickets, repair_quotes, repair_quote_items, repair_events, repair_photos, inbox_submissions, rate_limits, orders, order_items, payments restart identity cascade`,
  );
}

/** A fresh in-memory Postgres (PGlite) with every migration applied. */
export async function createPgliteDatabase(): Promise<TestDatabase> {
  const client = new PGlite();
  const db = drizzlePglite({ client, schema });
  await migratePglite(db, { migrationsFolder });
  return { db, reset: () => truncateAll(db), close: () => client.close() };
}

/**
 * A new, empty database on a real Postgres server, migrated, and dropped on close.
 * `serverUrl` needs permission to create databases.
 */
export async function createPostgresDatabase(serverUrl: string): Promise<TestDatabase> {
  const name = `test_${randomUUID().replaceAll("-", "")}`;
  const admin = new pg.Client({ connectionString: serverUrl });
  await admin.connect();
  await admin.query(`create database ${name}`);

  const url = new URL(serverUrl);
  url.pathname = `/${name}`;
  const pool = new pg.Pool({ connectionString: url.toString(), max: 10 });
  const db = drizzleNodePg({ client: pool, schema });
  await migrateNodePg(db, { migrationsFolder });

  return {
    db,
    reset: () => truncateAll(db),
    close: async () => {
      await pool.end();
      await admin.query(`drop database ${name}`);
      await admin.end();
    },
  };
}
