import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

import { parseEnv } from "../src/lib/env-schema";
import * as schema from "../src/lib/db/schema";

// Database access for command-line scripts. They connect with node-postgres over TCP,
// which works for Neon too, so they don't need the app's WebSocket driver.

/** Loads .env.local like Next does (real environment variables win), then validates. */
export function scriptEnv() {
  try {
    process.loadEnvFile(".env.local");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  return parseEnv(process.env);
}

export async function withDatabase<T>(
  run: (db: ReturnType<typeof drizzle<typeof schema>>) => Promise<T>,
): Promise<T> {
  const pool = new pg.Pool({ connectionString: scriptEnv().DATABASE_URL, max: 1 });
  try {
    return await run(drizzle({ client: pool, schema }));
  } finally {
    await pool.end();
  }
}
