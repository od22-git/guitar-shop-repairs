import { Pool as NeonPool } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { drizzle as drizzleNodePg } from "drizzle-orm/node-postgres";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import pg from "pg";

import * as schema from "./schema";

/**
 * Any of the app's database handles (Neon, node-postgres, PGlite in tests) or a
 * transaction on one. Library code takes this so it runs the same everywhere.
 */
export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

export const isNeonUrl = (url: string) => new URL(url).hostname.endsWith(".neon.tech");

/**
 * Neon is reached through its serverless Pool, over WebSockets, which supports
 * transactions and suits serverless functions. Any other Postgres (local, the CI
 * service container) uses node-postgres over TCP. Both pools connect lazily.
 */
export function connect(url: string): { db: Database; close: () => Promise<void> } {
  if (isNeonUrl(url)) {
    const pool = new NeonPool({ connectionString: url });
    return { db: drizzleNeon({ client: pool, schema }), close: () => pool.end() };
  }
  const pool = new pg.Pool({ connectionString: url });
  return { db: drizzleNodePg({ client: pool, schema }), close: () => pool.end() };
}
