# Walkthrough regression map (M8b)

Every row of the use-case walkthrough in [`PLAN.md`](PLAN.md#use-case-walkthrough-checked-for-gaps), with the test that covers it, or a note on how it's checked by hand. `e2e/…` tests run on desktop and mobile (the admin ones signed in as `admin-desktop` and `admin-mobile`); `src/…` are Vitest unit tests. CI runs all of them on every PR.

## Browsing and ordering

| Case | Covered by |
|---|---|
| Browser language is neither EN nor AR, or a crawler | `e2e/i18n.spec.ts` "any other language, or none, falls back to English"; "pages announce both languages and x-default" |
| Language switch | `e2e/i18n.spec.ts` "goes to the same page in the other language and is remembered", "keeps the current path" |
| Arabic text missing for a product | `e2e/catalog.spec.ts` "an item without Arabic text falls back to English, marked as English" (`dir="auto"`); `src/lib/localized.test.ts` |
| Guitar sells while someone is viewing it | `e2e/admin/orders.spec.ts` "hold, order, deposit, pay in full and hand over: the guitar shows Sold"; `e2e/admin/products.spec.ts` "…see edits in the shop at once"; `e2e/catalog.spec.ts` "a sold guitar offers similar ones"; SKU in the message: `src/lib/whatsapp/product-message.test.ts`, `e2e/catalog.spec.ts` exact wa.me URL |
| Deposit to hold a guitar | `e2e/admin/orders.spec.ts` (hold → deposit → order); overdue flag: `src/lib/orders/orders.test.ts` "filters open and owing orders…" (`overdueHolds`) |
| Two orders for the last unit | `src/lib/inventory.test.ts` race tests (PGlite, and real Postgres connections in CI); `src/lib/orders/orders.test.ts` "lets only one of two orders have the last unit" |
| Order cancelled or returned | `e2e/admin/orders.spec.ts` "cancelling an order puts its stock back"; `src/lib/orders/orders.test.ts` cancel, refund with and without restock |
| Customer wants several items | `src/lib/orders/orders.test.ts` "takes the stock, snapshots the lines…" (a guitar and two pedals in one order) |
| COD, bank transfer or cash; receipt says "Receipt" until VAT | `e2e/admin/orders.spec.ts` "VAT on and off…"; `src/lib/orders/orders.test.ts` payments and refunds; `src/lib/orders/totals.test.ts` |
| Choosing a NANOCORE bundle (M10) | `e2e/bundles.spec.ts` "pick a bundle and order it on WhatsApp with the exact message" (en and ar, with and without the extra tone), "every bundle shows the product's one stock state and price"; `src/lib/admin/variants.test.ts`; `src/lib/whatsapp/product-message.test.ts` |
| Stand-in photos on a real product (M10) | `e2e/bundles.spec.ts` (labelled on the card and the page); `src/lib/db/seed.test.ts` (flagged and credited) |
| Delivery address and fee | `src/lib/orders/orders.test.ts` zone fee, typed fee, address only for courier; `e2e/content.spec.ts` "the delivery policy lists the delivery zones' fees" |

## Repairs

| Case | Covered by |
|---|---|
| Returning customer | `src/lib/repairs/repairs.test.ts` "matches a returning customer by their normalised phone number" |
| Customer books online | `e2e/admin/tracking.spec.ts` "an online booking lands in the inbox and becomes a ticket"; `src/lib/inbox/inbox.test.ts` |
| Simple fixed-price job | `src/lib/repairs/repairs.test.ts` "starts a simple fixed-price job at once…"; `e2e/admin/repairs.spec.ts` intake to collection |
| Extra problem found mid-repair | `src/lib/repairs/repairs.test.ts` "needs approval again for a new version found mid-repair"; `e2e/admin/tracking.spec.ts` "an approval on a quote that changed is refused, and the new version can be approved" |
| Customer declines the quote | `src/lib/repairs/repairs.test.ts` "sends a declined quote to Ready with a diagnosis fee, then closes"; `src/lib/repairs/customer.test.ts` decline on the link |
| Approves twice, or the quote changed | `src/lib/repairs/repairs.test.ts` "decides a quote once…"; `src/lib/repairs/customer.test.ts` "refuses a superseded version…"; `e2e/admin/tracking.spec.ts` stale approval |
| Waiting weeks for parts | `src/lib/repairs/repairs.test.ts` "posts an update with a new ETA and its own message"; `e2e/admin/repairs.spec.ts` (Post update step) |
| Wrong status clicked | `src/lib/repairs/repairs.test.ts` "undoes a wrong status with a correction…"; `e2e/admin/repairs.spec.ts` (Undo step) |
| Guitar never collected | `src/lib/repairs/repairs.test.ts` "closes an uncollected instrument as abandoned only once it's ready" (the 14-day dashboard flag) |
| Damage dispute | `src/lib/repairs/repairs.test.ts` "records the terms acceptance time…" and intake photos "keeps them in the private bucket, without EXIF"; `e2e/admin/repairs.spec.ts` "intake photos are private and have no EXIF" |
| Ticket link forwarded or leaked | `e2e/admin/tracking.spec.ts` "five wrong tries lock the ticket's page for 15 minutes", "a rotated or invalid link is a 404…"; `src/lib/repairs/customer.test.ts` lockout per ticket, parallel guesses, DTO leaves out personal data |
| WhatsApp preview of the ticket link | `e2e/admin/walkthrough.spec.ts` "a ticket link's preview shows only the brand and 'Repair ticket'" (**new in M8b**) |
| You forget to tap Send | `src/lib/repairs/repairs.test.ts` "counts unsent messages…"; `e2e/admin/repairs.spec.ts` (messages wait until sent) |
| Foreign or GCC customer phone | `src/lib/phone.test.ts`; `src/lib/repairs/repairs.test.ts` "takes a foreign mobile number…"; `e2e/admin/walkthrough.spec.ts` "a GCC customer's ticket opens with the last 4 digits of their number" (**new in M8b**) |

## Admin and operations

| Case | Covered by |
|---|---|
| Updating tickets from your phone | Every admin e2e test also runs as `admin-mobile` (Pixel 7). wa.me opening the WhatsApp app itself: **manual check in M9** on a real phone |
| Lost phone or 2FA | `src/lib/auth/auth.test.ts` "signs in once with each backup code, for a lost phone" (**new in M8b**), "resets 2FA so the admin can set it up again" |
| Forgotten password | `src/lib/auth/auth.test.ts` "resets the password and signs every session out"; `e2e/admin/auth.setup.ts` runs the scripts |
| Database mistake or loss | **M9** (Neon restore + nightly backup Action, restore tested once there) |
| Slow upload of a large iPhone photo | Browser shrinking (`src/lib/photo-shrink.ts`) runs in `e2e/admin/products.spec.ts` and `e2e/sell.spec.ts` uploads; a real 10 MB iPhone photo over mobile data: **manual check in M9** |

## Security

| Case | Covered by |
|---|---|
| Admin actions called directly | `e2e/admin-access.spec.ts` "every admin action refuses a signed-out caller" (read from the build manifest), plus pages and routes |
| Admin-only data on public pages | `src/lib/catalog/load.test.ts` "keeps cost, serials and hold notes out…"; `e2e/catalog.spec.ts` "never shows the serial"; `src/lib/repairs/customer.test.ts` "leaves out the customer, serial, notes…" |
| Spam on public forms | Turnstile: `src/lib/inbox/inbox.test.ts` "passes only when Cloudflare says success", `e2e/security.spec.ts` "the spam check loads under the CSP"; honeypot: `e2e/admin/walkthrough.spec.ts` "a booking with the hidden honeypot filled in is refused…" (**new in M8b**); rate limits: `src/lib/inbox/inbox.test.ts` "allows `limit` hits per window…"; length limits: `src/lib/inbox/inbox.test.ts`, `src/lib/inbox/sell.test.ts` |
| Error monitoring (Sentry) | **M9** (Sentry with scrubbing is set up there) |

## Also checked in M8b

- **Every public page in both locales** loads with status 200, the right `lang`/`dir`, a heading and nothing blocked by the CSP: `e2e/security.spec.ts`. Axe on the same pages: `e2e/a11y.spec.ts`.
- **500 pages** (`[locale]/error.tsx`, `admin/error.tsx`, `global-error.tsx`): checked by hand in M8a. A production build has no way to make a page fail on purpose, and adding one (even behind a flag) would be a new public endpoint, so it stays a manual check.
