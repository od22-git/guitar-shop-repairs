// Cloudflare Turnstile, the spam check on public forms. The widget puts a token in the
// form as `cf-turnstile-response`; the server confirms it with Cloudflare once. Tests
// and CI use Cloudflare's test keys, which always pass.

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export const TURNSTILE_FIELD = "cf-turnstile-response";

/** Whether Cloudflare accepts the token. Any failure to ask counts as a no. */
export async function verifyTurnstile(
  secret: string,
  token: string | null,
  ip: string | null,
  fetcher: typeof fetch = fetch,
): Promise<boolean> {
  if (!token || token.length > 2048) return false;
  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set("remoteip", ip);
  try {
    const response = await fetcher(VERIFY_URL, {
      method: "POST",
      body,
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return false;
    const result = (await response.json()) as { success?: unknown };
    return result.success === true;
  } catch {
    return false;
  }
}
