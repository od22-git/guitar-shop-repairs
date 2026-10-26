// The visitor's IP address, for rate limits and the Turnstile check. Vercel (and `next
// start` behind a proxy) puts the client first in x-forwarded-for. It's never stored as
// is: callers keep only a keyed hash (src/lib/signing.ts).
export function clientIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip") || null;
}
