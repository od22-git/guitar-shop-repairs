import { sql } from "drizzle-orm";

import type { Database } from "./db/connect";
import { rateLimits } from "./db/schema";

// Fixed-window limits for the public forms, kept in Postgres so they hold across
// serverless instances. One row per key; a row whose window has passed starts over
// when it's next hit, so old rows need no cleaning beyond that (plus `pruneRateLimits`).

/**
 * Counts one hit on `key` and says whether it's within `limit` per `windowSeconds`.
 * Atomic: parallel hits each get their own count.
 */
export async function hitRateLimit(
  db: Database,
  key: string,
  limit: number,
  windowSeconds: number,
  now = new Date(),
): Promise<boolean> {
  const windowStart = new Date(now.getTime() - windowSeconds * 1000);
  const [row] = await db
    .insert(rateLimits)
    .values({ key, windowStart: now, count: 1 })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`case when ${rateLimits.windowStart} <= ${windowStart.toISOString()} then 1 else ${rateLimits.count} + 1 end`,
        windowStart: sql`case when ${rateLimits.windowStart} <= ${windowStart.toISOString()} then ${now.toISOString()}::timestamptz else ${rateLimits.windowStart} end`,
      },
    })
    .returning({ count: rateLimits.count });
  return row.count <= limit;
}

/** Deletes rows whose window ended more than a day ago. */
export async function pruneRateLimits(db: Database, now = new Date()): Promise<void> {
  const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  await db.delete(rateLimits).where(sql`${rateLimits.windowStart} < ${cutoff.toISOString()}`);
}
