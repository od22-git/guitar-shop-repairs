import { eq } from "drizzle-orm";

import type { Database } from "../db/connect";
import { customers, repairTickets } from "../db/schema";
import { toWesternDigits } from "../digits";
import { safeEqual, sign } from "../signing";

// Who may see a tracking page (/<locale>/r/<token>). The token in the link finds the
// ticket, but a forwarded or leaked link isn't enough: the visitor also types the last
// 4 digits of the customer's phone number. Five wrong tries lock the ticket's page for
// 15 minutes, counted per ticket because UAE mobile networks share IP addresses. A
// correct answer sets a cookie bound to the token, so rotating the link (admin) ends
// every access given to the old one.

export const MAX_ACCESS_FAILURES = 5;
export const ACCESS_LOCK_MINUTES = 15;
export const ACCESS_COOKIE_DAYS = 30;

/** Tokens are 128 random bits in base64url (newPublicToken). */
export const isPublicToken = (token: string) => /^[A-Za-z0-9_-]{22}$/.test(token);

/** The ticket a tracking link points at, or null for an unknown or rotated token. */
export async function ticketIdByToken(db: Database, token: string): Promise<number | null> {
  if (!isPublicToken(token)) return null;
  const [row] = await db
    .select({ id: repairTickets.id })
    .from(repairTickets)
    .where(eq(repairTickets.publicToken, token));
  return row?.id ?? null;
}

/** The typed digits as 4 Western digits (Arabic-Indic accepted), or null. */
export function parseLastDigits(input: string): string | null {
  const digits = toWesternDigits(input).replace(/[\s-]/g, "");
  return /^\d{4}$/.test(digits) ? digits : null;
}

export type AccessCheck =
  | { ok: true }
  | { ok: false; problem: "wrong"; triesLeft: number }
  | { ok: false; problem: "locked"; until: Date }
  | { ok: false; problem: "not_found" };

/**
 * Checks the last 4 phone digits for the ticket behind `token`, counting a wrong answer
 * against the ticket. Runs on the locked ticket row, so parallel guesses all count.
 */
export async function checkPhoneDigits(
  db: Database,
  token: string,
  lastDigits: string,
  now = new Date(),
): Promise<AccessCheck> {
  if (!isPublicToken(token)) return { ok: false, problem: "not_found" };
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({
        id: repairTickets.id,
        failures: repairTickets.accessFailures,
        lockedUntil: repairTickets.accessLockedUntil,
        phone: customers.phoneE164,
      })
      .from(repairTickets)
      .innerJoin(customers, eq(customers.id, repairTickets.customerId))
      .where(eq(repairTickets.publicToken, token))
      .for("update", { of: repairTickets });
    if (!row) return { ok: false, problem: "not_found" } as const;
    if (row.lockedUntil && row.lockedUntil > now) {
      return { ok: false, problem: "locked", until: row.lockedUntil } as const;
    }

    if (safeEqual(row.phone.slice(-4), lastDigits)) {
      if (row.failures > 0 || row.lockedUntil) {
        await tx
          .update(repairTickets)
          .set({ accessFailures: 0, accessLockedUntil: null })
          .where(eq(repairTickets.id, row.id));
      }
      return { ok: true } as const;
    }

    // A lock that has run out starts a fresh count.
    const failures = (row.lockedUntil ? 0 : row.failures) + 1;
    if (failures >= MAX_ACCESS_FAILURES) {
      const until = new Date(now.getTime() + ACCESS_LOCK_MINUTES * 60 * 1000);
      await tx
        .update(repairTickets)
        .set({ accessFailures: 0, accessLockedUntil: until })
        .where(eq(repairTickets.id, row.id));
      return { ok: false, problem: "locked", until } as const;
    }
    await tx
      .update(repairTickets)
      .set({ accessFailures: failures, accessLockedUntil: null })
      .where(eq(repairTickets.id, row.id));
    return { ok: false, problem: "wrong", triesLeft: MAX_ACCESS_FAILURES - failures } as const;
  });
}

/** One cookie per ticket, so a customer with two repairs can follow both. */
export const accessCookieName = (ticketId: number) => `repair_${ticketId}`;

/** The cookie's value: an expiry and a signature over it and the current token. */
export function accessCookieValue(secret: string, token: string, now = new Date()): string {
  const expires = Math.floor(now.getTime() / 1000) + ACCESS_COOKIE_DAYS * 24 * 60 * 60;
  return `${expires}.${sign(secret, "repair-access", `${token}.${expires}`)}`;
}

/** Whether the cookie grants access to the ticket behind `token` now. */
export function hasAccess(
  secret: string,
  token: string,
  value: string | undefined,
  now = new Date(),
): boolean {
  const [expires, signature] = value?.split(".") ?? [];
  if (!expires || !signature || !/^\d+$/.test(expires)) return false;
  if (Number(expires) * 1000 <= now.getTime()) return false;
  return safeEqual(signature, sign(secret, "repair-access", `${token}.${expires}`));
}
