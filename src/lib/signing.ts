import { createHmac, timingSafeEqual } from "node:crypto";

// Keyed hashes for the public side of the site: the tracking-page access cookie, signed
// photo URLs, tokens for photos sent with the /sell form and the hashed IP kept with a
// link approval. Each use names its
// purpose, so a value made for one can't be replayed as another; the key is the app's
// secret (BETTER_AUTH_SECRET), passed in by the caller.

export type SigningPurpose =
  "repair-access" | "repair-photo" | "sell-photo" | "ip-hash" | "rate-limit";

/** HMAC-SHA256 of `data` under `secret`, separated by purpose; base64url. */
export function sign(secret: string, purpose: SigningPurpose, data: string): string {
  return createHmac("sha256", secret).update(`${purpose}\0${data}`).digest("base64url");
}

/** Compares two strings in constant time (for their length). */
export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** An IP address as a keyed hash: enough to tell two apart, never the address. */
export function hashIp(secret: string, ip: string): string {
  return sign(secret, "ip-hash", ip).slice(0, 32);
}
