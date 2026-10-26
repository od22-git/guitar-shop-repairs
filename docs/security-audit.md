# Security audit (M8b, Oct 2026)

An `insecure-defaults` audit of the whole app before launch: configuration, secrets, auth, public endpoints, storage and response headers. Each finding is **fixed** or **accepted** with the reason; none is open. Repeat it in M10 (Stripe) and whenever a new secret, public endpoint or third-party script is added.

## Findings

| # | Finding | Status |
|---|---|---|
| 1 | **No security headers.** Pages had no Content-Security-Policy, HSTS, `X-Frame-Options` or `Permissions-Policy`, so the site could be framed (clickjacking on the admin) and an injected script could load anything from anywhere. | **Fixed.** `src/lib/security-headers.ts`, set on every response in `next.config.ts`. Tested in `security-headers.test.ts`, `e2e/security.spec.ts` (headers on every kind of response, every public page in both locales with no CSP violation, Turnstile working, framing refused) and `e2e/admin/csp.spec.ts` (admin pages). |
| 2 | **CI's `BETTER_AUTH_SECRET` is public** (it's in `.github/workflows/ci.yml`). A production deploy that copied it would let anyone sign admin sessions, ticket-access cookies and photo links. | **Fixed.** `src/lib/env-schema.ts` refuses it in production on a real host (`publishedSecrets`), as it already did for Turnstile's test keys; a unit test reads the value from the workflow so the two can't drift. |
| 3 | **The CSP allows inline scripts** (`'unsafe-inline'`). | **Accepted.** A nonce-based CSP needs every page rendered per request, which turns off the static catalog and partial prerendering (Next.js's CSP guide). The risk it covers is script injection, and there's no path for that: React escapes all text, nothing renders user HTML, and the only `dangerouslySetInnerHTML` uses are the product JSON-LD (escaped `<`) and the 2FA QR code (an SVG made on the page from the enrolment URI). The rest of the policy still holds: scripts only from the site and Cloudflare, no `eval`, no plugins, no `<base>` changes, forms post only to the site, no requests to other hosts, no framing. Revisit if a page ever renders user-written HTML. |
| 4 | **The visitor's IP comes from `x-forwarded-for`** (`src/lib/request-ip.ts`), which a client can set. Rate limits and the IP hash on link approvals use it. | **Accepted for Vercel.** Vercel overwrites `x-forwarded-for` with the real client address, so it can't be spoofed there. Self-hosting with `next start` directly on the internet would let a bot rotate the header to dodge the per-IP limits (Turnstile still applies). **M9: confirm the deploy is on Vercel, or put a proxy that sets the header in front.** |

## Checked and fine

- **Configuration fails closed.** Every required variable is validated at startup (`next.config.ts` → `env-schema.ts`); an empty value counts as missing; nothing has a fallback secret. `BETTER_AUTH_SECRET` must be 32+ characters; `.env.example` leaves it empty. Production on a real host refuses `http://` and Turnstile's test keys. The storage driver's `?? ""` only follows the schema's check that every R2 variable is set.
- **Spam checks fail closed.** `verifyTurnstile` says no on a missing or long token, a network error, a timeout or anything but `success: true`. A request with no IP shares one rate-limit bucket rather than skipping the limit (ours and Better Auth's).
- **Admin auth.** Sign-up is disabled (unit and e2e tested). 2FA is required before any admin page or action opens. Sign-in is rate-limited in the database (10 a minute per IP), 10 wrong codes lock 2FA for 15 minutes, backup codes work once each. Session cookies are `Secure` when `SITE_URL` is https (enforced in production). Better Auth checks the request origin; Next.js checks it for server actions.
- **Every admin page, action and route** calls `requireAdmin()`; `e2e/admin-access.spec.ts` reads the build's manifests, so a new one is tested signed out as soon as it exists.
- **Ticket access.** 128-bit random tokens (`crypto.randomBytes`), never the ticket number; the phone check locks per ticket after 5 failures; the access cookie is `HttpOnly`, `SameSite=Lax`, `Secure` on https and signed over the current token, so rotating the link ends access.
- **Signing.** HMAC-SHA256 with a purpose per use (`src/lib/signing.ts`), compared in constant time. No MD5, SHA-1 or `Math.random` anywhere security-related.
- **Files.** Storage keys are validated (no `..`); `/media` serves only the public bucket; repair and sell photos are in the private bucket, behind sign-in or 30-minute signed links. Every upload is re-encoded with sharp (no EXIF/GPS). The public `/sell` upload accepts only same-origin requests, 30 an hour per IP, with a size limit.
- **Private pages** (admin, `/api`, ticket pages) are `private, no-store`, `noindex` and `no-referrer`; ticket pages load no third-party scripts.
- **Leaks.** `poweredByHeader` is off; production errors show the error pages without details; the admin script reads the password without echoing it and never prints it. There's no logging of personal data (Sentry, with scrubbing, comes in M9).

## For M9

- Set real values for `BETTER_AUTH_SECRET` (new, per environment), the Turnstile keys and R2; startup refuses the test ones.
- Deploy on Vercel (finding 4) with an `https://` `SITE_URL`, so HSTS and secure cookies apply.
- Keep the R2 private bucket private (no public access, no r2.dev URL), and add the `inbox-pending/` lifecycle rule.
- Sentry: scrub phone numbers and addresses before sending; if its script runs in the browser, add its host to `connect-src` in `src/lib/security-headers.ts`.
