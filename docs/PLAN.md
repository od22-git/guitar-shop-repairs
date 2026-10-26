# Plan: Electric guitar shop + repair tracking site (RAK, UAE)

## Context

A home-based business in Ras Al Khaimah that sells **used electric guitars and guitar gear** and does **guitar repairs** needs a bilingual (EN/AR) website. The site has to:
- show a small catalog (fewer than 50 products);
- let customers order on WhatsApp;
- give each repair customer a **private tracking link**, with a WhatsApp update at each status change;
- give one admin a place to manage products, tickets and orders.

The site **goes live without online payments**. Stripe checkout is added after launch, once the trade licence and Stripe account are approved. Tone packs are **out of scope**. The repo currently holds only `.claude/skills/`, so this is greenfield.

**Decisions taken in Q&A:**
- **Launch with no gateway.** Payments are recorded by hand in admin: cash at handover, cash on delivery through the courier, or bank transfer. Stripe Checkout is a post-launch milestone behind a `PaymentProvider` adapter.
- WhatsApp updates use **wa.me links** that the admin taps to send. The code has a `Notifier` interface so the Business API can be added later.
- Under 50 products. Single admin. **No customer accounts at all.** **WhatsApp only, no email.**
- Home-based: the address is never published. Drop-off is by appointment on WhatsApp, plus courier delivery and pickup across the UAE.
- Repairs: quote, then customer approval. Payment is recorded by the admin, with an online Pay button after Stripe.
- Language follows the browser (remembered in a cookie). Arabic is RTL in **Tajawal**, paired with a separate Latin font in the same style.
- Colours: **Custom Colour Chart** (1960s factory guitar finishes), tuned and contrast-checked in M1:
  - `#E6EEF1` Sonic Blue mist (background)
  - `#13294B` Lake Placid deep (ink)
  - `#D2383A` Fiesta Red (accent)
  - `#C8A55A` Shoreline Gold (secondary)
  - `#4A2F27` Rosewood (wood)
- Brand name is a **placeholder** in one config file. Not VAT-registered: prices are final AED, and VAT is a switch plus a TRN field. A "Sell us your guitar" form feeds an admin inbox.
- **WhatsApp Business app** (free) on a dedicated number. wa.me links are free too.
- **Vercel Hobby (free)** while building and reviewing the result. Switch to **Pro** before the site takes real orders publicly.
- **Images:** product photos are always yours. Brand and atmosphere images start as curated **free-licence stock** (I search and pick them) and are replaced by your own photos over time. See "Images".

## Can you go live in RAK before the licence? (read this first)

- **Technically, yes.** Nothing in the launch milestones (M0–M9) needs a payment gateway or the WhatsApp API. They only need hosting, a domain and a WhatsApp Business **app** number, none of which ask for a trade licence.
- **Legally, selling guitars and charging for repairs is commercial activity, and that needs a licence in the UAE.** That includes taking WhatsApp orders and bank transfers. Trading without one risks fines from RAK DED. I'm not a lawyer, so confirm with RAK DED.
- **What a gateway like Stripe adds is a longer approval on top of the licence.** The licence itself is the part you need first. Usually the quickest and cheapest routes in RAK are:
  - RAK DED **Virtual Trader / e-commerce** licence;
  - the **"Alghad" home-business** licence, if guitar sales and repair are among its allowed activities;
  - a **RAKEZ freelancer permit** or e-commerce licence.

  Check fees and allowed activities directly; the online figures are from 2019–2021 and from consultants.
- **Recommended path:**
  1. Build M0–M9 now and deploy to a private preview URL.
  2. Apply for the simplest licence **under the brand name you'll use**; the site and the licence must match.
  3. Make the site public the day the licence arrives.
  4. Apply for Stripe afterwards and add M10.

  Launch day isn't blocked by Stripe at all.

## Stack

| Concern | Choice | Why |
|---|---|---|
| App | Next.js (latest stable, App Router), TypeScript strict, Server Components + Server Actions | Required. Follow `vercel-react-best-practices` (`server-auth-actions`, `server-serialization`, `async-parallel`, `bundle-*`) |
| DB | PostgreSQL on **Neon**, **Drizzle ORM** + drizzle-kit migrations, Neon **Pool (WebSocket) driver** (supports transactions, safe for serverless); **PGlite** for unit tests; real Postgres for e2e (GitHub Actions service container) | Typed SQL; transactions are needed for stock updates |
| i18n | **next-intl**, `/[locale]` (`en`, `ar`), locale from `Accept-Language` + cookie, `x-default` → en, `dir="rtl"` for ar | Mature App Router i18n |
| Styling | Tailwind CSS v4, **logical properties only** (`ms-/me-/ps-/pe-`, `start/end`), tokens as CSS variables; Radix primitives with `DirectionProvider` | RTL without mirrored CSS; accessible |
| Fonts | **Outfit** (Latin, `next/font/google`) + **Tajawal** (Arabic subset, self-hosted via `next/font/local` so it can be scaled 112% to match Outfit). Picked in M1 from a side-by-side render of Outfit, Albert Sans and Figtree; see `docs/design.md` | `frontend-design`: a deliberate choice |
| Admin auth | **Better Auth**: email + password, **TOTP 2FA**, sign-up disabled (and tested as disabled), CLI scripts to create the admin and reset password/2FA (there's no email to reset by) | One admin; no hand-rolled crypto |
| Images | `Storage` interface: **Cloudflare R2** in prod (a **public** bucket for product photos, a **private** bucket for repair, sell-form and backup files), local filesystem in dev/tests | Customer photos are never public |
| Image pipeline | Browser resizes and compresses (max 2400 px, ≤ 2 MB, converts HEIC from iPhones) → server route re-encodes with **sharp** (checks it's a real image, **removes EXIF/GPS**, fixes orientation) → stores 3 WebP widths | **Photos taken at home carry GPS coordinates that would reveal your address.** No runtime image-optimisation costs |
| Spam | Cloudflare **Turnstile** + honeypot field on public forms (Cloudflare's test keys in tests) | Free |
| Phone numbers | `libphonenumber-js`, stored as E.164; accepts `05x…`, `+971…`, `00971…` and **Arabic-Indic digits** (٠٥٠…) | Arabic keyboards type Arabic digits |
| Payments (post-launch) | `PaymentProvider` → `StripeProvider` (hosted Checkout Sessions) | Card data never touches our server |
| Validation | Zod for env, forms and webhooks; `env.ts` **fails on missing required vars**. Stripe vars are optional, but the checkout switch refuses to turn on without them | `insecure-defaults` |
| Tests/CI | Vitest, Playwright (Chromium pre-installed), GitHub Actions: lint, typecheck, unit, build, e2e | Every PR must be green |
| Hosting | **Vercel Hobby (free)** while building and reviewing. Before the public launch with real sales, move to **Vercel Pro (~$20/mo)**, because Hobby's terms forbid commercial use. Nothing in the plan depends on Pro-only features: there are no Vercel cron jobs (backups run on GitHub Actions), and image sizes are made at upload, so Hobby's image-optimisation quota doesn't matter | You decide on Pro once you like the result |

**Formatting rules:**
- Money is **integer fils**. Prices are entered as the final amount. When VAT is on, the VAT inside a price is `round(price × 5/105)` per line.
- Numbers display with Western digits in Arabic (`ar-AE-u-nu-latn`).
- All times are shown in **Asia/Dubai**, because servers run in UTC.
- Phone numbers, prices, serials and ticket numbers inside Arabic text are wrapped in `<bdi>` or `dir="ltr"`, so `+971` doesn't render as `971+`.

## Architecture

One Next.js app holds the public site and `/admin`, backed by Postgres and R2 (Stripe later). There are **no cron jobs**: expiries and overdue items are computed when read, or arrive by webhook.

```
src/
  app/[locale]/(site)/...      public pages (en/ar)
  app/admin/...                admin: English UI, bilingual content fields, MOBILE-FIRST (you'll use it at the bench)
  app/api/upload/route.ts      image pipeline (admin + rate-limited public forms)
  app/api/webhooks/stripe/route.ts   (M10)
  lib/env.ts, lib/db/{schema,client}.ts, lib/money.ts, lib/phone.ts, lib/datetime.ts
  lib/repairs/state-machine.ts transitions, quote rules, approval methods
  lib/inventory.ts             reserve / sell / release / restock, as conditional updates in transactions
  lib/whatsapp/{notifier,wa-me,templates}.ts
  lib/payments/{provider,stripe}.ts  (M10)
  lib/storage/{index,r2,fs}.ts, lib/images.ts
  lib/auth.ts                  Better Auth + requireAdmin(), called in EVERY admin action and route
  lib/rate-limit.ts            Postgres-backed
  lib/public-dto.ts            the only shapes sent to public pages (no cost, serials policy, internal notes)
  config/brand.ts
messages/{en,ar}.json
```

**Caching rule:** catalog pages are static. **Every** admin change to a product, stock or settings calls `revalidateTag`, so both locales, the listing, the product page and the sitemap update immediately. A sold guitar must never show "Available". Ticket and admin pages are fully dynamic, sent with `Cache-Control: private, no-store`, `noindex` and `Referrer-Policy: no-referrer`, and load no third-party scripts.

## Data model (Drizzle)

- `categories` (slug, name_en/ar, sort)
- `products`
  - `kind` (`guitar` | `gear`), `category_id`, `slug` (**locked once published**, so shared links never break), `sku`, `brand`, `model`, `year`
  - `title_en/ar`, `description_en/ar`, `tech_notes_en/ar`
  - `condition` (`mint`, `excellent`, `very_good`, `good`, `fair`)
  - `price_fils`, optional `compare_at_fils` (price drops), **`cost_fils` (admin-only; profit tracking and the future VAT margin scheme)**
  - `quantity` (guitars = 1)
  - `status` (`draft`, `available`, `reserved`, `sold`, `archived`), `reserved_note`, `reserved_until`
  - `specs` jsonb: body, finish, neck, fretboard, frets, scale, pickups, weight_kg, serial, case, mods
  - `published_at`, `sold_at`
  - **Publishing requires** an English title, a price, at least one photo and a category.
- `product_images` (product_id, key, w, h, alt_en/ar, sort)
- `customers` (name, phone_e164 unique, preferred_locale, whatsapp_consent_at). Contact records, not accounts.
- `repair_tickets`
  - `number` (`R-0001`, for conversations only, **never** used for access), `public_token` (128-bit, rotatable), `customer_id`
  - Instrument: brand, model, serial, colour. Issue, intake notes, accessories received.
  - `intake_method` (`drop_off` | `courier`), `terms_accepted_at`, `eta_date`
  - `status` (`received`, `diagnosed`, `in_repair`, `ready`, `closed`), `close_reason` (`collected`, `delivered`, `abandoned`, `cancelled`)
- `repair_quotes` (ticket_id, **version**, status `pending` | `approved` | `declined` | `superseded`, total_fils, notes, decided_at, `decision_method` (`link`, `whatsapp`, `in_person`), decision_ip_hash)
- `repair_quote_items` (quote_id, label, amount_fils)
- `repair_events` (ticket_id, kind `status` | `update` | `correction`, from, to, public_note, internal_note, created_at, notified_at)
- `repair_photos` (ticket_id, key, stage `intake` | `progress` | `done`, customer_visible). Private bucket; shown through short-lived signed URLs.
- `orders`
  - `number`, `customer_id`, `source` (`manual` | `online`)
  - `status` (`pending`, `confirmed`, `fulfilled`, `cancelled`, `refunded`)
  - `subtotal_fils`, `delivery_fee_fils`, `vat_fils`, `vat_rate_bps`, `total_fils`
  - `delivery_method` (`courier` | `appointment`), emirate, area, address line, landmark
  - `provider_session_id`, `reserved_until`
- `order_items` (order_id, product_id, title_snapshot, unit_price_fils, qty)
- **`payments`** (order_id **or** ticket_id, amount_fils, method `cash` | `cod` | `bank_transfer` | `card_online`, kind `deposit` | `payment` | `refund`, received_at, provider_ref, note). Deposits, part payments and refunds all live here; balance due is calculated.
- `payment_events` (provider, event_id **unique**, processed_at). M10.
- `delivery_zones` (name_en/ar, emirates[], fee_fils, active)
- `inbox_submissions` (kind `sell` | `repair_request` | `contact`, name, phone, locale, payload jsonb, photo_keys[], status `new` | `replied` | `converted` | `archived`, converted_ticket_id)
- `settings` (key, jsonb): `whatsapp_number`, `brand`, `vat_enabled`, `trn`, `checkout_enabled` (M10)
- `rate_limits` (key, window_start, count; old rows deleted when read)
- Better Auth tables

## Pages

**Public**, each available at `/en/...` and `/ar/...`:
- Home
- `/shop`, `/shop/[category]` (Electric guitars, Pedals, Amps, Parts & accessories), with filters for brand, pickup layout, body style, condition and price
- `/product/[slug]`:
  - gallery (keyboard and swipe, swipes the right way in RTL, **photos never mirrored**)
  - specs, condition grade (linked to a condition guide), tech notes
  - stock badge: Available, On hold, Sold, or sold out for gear
  - **Order on WhatsApp** (hidden when sold; shows "Ask about similar" instead)
- `/repairs`: services and starting prices, how drop-off and courier pickup work, **Book a repair** form
- `/r/[token]`: ticket tracking
- `/sell`: sell us your guitar, with photos, serial and a proof-of-ownership tick box
- `/about`, `/faq` (includes the **condition guide**), `/contact` (WhatsApp + phone call link)
- `/policies/{terms,privacy,returns,delivery,repair-terms}`
- `sitemap.xml` (published products only, both locales), `robots.txt`, hreflang, Product JSON-LD with availability, OG images (main photo, for WhatsApp and Instagram sharing). Drafts and archived items return 404.

**Admin** (`/admin`, English, 2FA, mobile-first, `noindex`):
- Dashboard:
  - **unsent WhatsApp updates**
  - quotes waiting on customers
  - overdue reservations
  - tickets past their ETA
  - tickets Ready but uncollected for a long time
  - new inbox items
  - 12-month payments total (to track the VAT threshold)
- Products: list, new, edit. Includes reserve/hold, mark sold, restock, and checks before publishing.
- Repairs: list, new, ticket view:
  - status buttons, **Post update** (a note with no status change), **Undo last status**
  - quote builder with versions; record approval (link, WhatsApp or in person)
  - photos, payments, rotate link, **Send on WhatsApp**
- Orders: list, new (manual), view: payments, fulfil, cancel (restores stock), refund (optional restock), **printable receipt**
- Inbox: reply on WhatsApp, **convert a repair request into a ticket**, archive
- Settings: WhatsApp number, brand, VAT + TRN, delivery zone fees

## Images

**Rule: never use images copied from other websites or Google Images.** They belong to someone else, and using them on a commercial site is copyright infringement. For a product listing it's also misleading, since a used guitar must show *that* guitar.

| Image type | Source | When |
|---|---|---|
| **Product photos** (every guitar and item) | **Always yours.** Taken with the shot list below. The upload pipeline removes GPS, resizes and makes web sizes | From M4, when you add products |
| **Sample products** (for development) | Free-licence stock (Unsplash/Pexels), marked `is_sample`; a launch check blocks going live while any remain | M2 seed; deleted before launch |
| **Brand and atmosphere** (home hero, repairs page, about, section backgrounds) | **I search Unsplash and Pexels** (both allow free commercial use with no attribution required) for images that fit the colour palette and mood: close-ups of electric guitar details, pickups, frets, amp knobs, a luthier's bench, hands at work. Candidates are shown to you as a contact sheet before use. I avoid photos where a brand logo is the focus. Each one is logged in `docs/IMAGE_CREDITS.md` (source URL, author, licence) | M1b (the set the redesign is built around) and M8 (final picks) |
| **Your own brand photos** (recommended over time) | Your bench, your tools, your hands working on a guitar, guitars against a wall painted in the palette, RAK scenery. These make the site truly yours | Swap in any time; each swap is just a file upload |
| **Graphics** | Built in code: colour-chart swatches, condition-grade badges, status timeline, icons. No stock needed | M1 |

**Shot list for your product photos** (given to you as a printable checklist in M4):
- One backdrop and one light setup for every guitar, so the shop looks consistent. Plain wall or card in a palette colour; daylight from a window, or two cheap softbox lights.
- Per guitar: full front, full back, headstock front and back (serial visible), body close-up, pickups and controls, neck joint, frets, case, and **every flaw** up close.
- Shoot in landscape and in portrait; the site crops for each. Phone cameras are fine with the lens wiped and HDR on.

**What I won't do:** AI-generated guitar images. They often have wrong strings, frets or hardware, which guitar players spot instantly and read as fake.

## Use-case walkthrough (checked for gaps)

Each row is a case found in this review and the plan's answer.

**Browsing and ordering**

| Case | Handling |
|---|---|
| Browser language is neither EN nor AR, or it's a crawler | English, with `x-default` hreflang |
| Language switch | Same page in the other locale (slugs are shared) |
| Arabic text missing for a product | Falls back to English with `dir="auto"` so the mixed text still reads correctly |
| Guitar sells while someone is viewing it | Stock is revalidated on change; WhatsApp messages include the SKU so you can tell them; the Sold page offers "Ask about similar" |
| Customer pays a deposit to hold a guitar | Admin sets **On hold** with an `until` date and records the deposit; the dashboard flags it once overdue |
| Two orders for the last unit | `UPDATE … WHERE quantity >= n AND status = 'available'` inside a transaction; the second order fails cleanly |
| Order cancelled or returned | Stock and status are restored, and a refund is recorded in `payments` |
| Customer wants several items | Without a cart, the WhatsApp message covers one product; you combine items in one manual order |
| Customer pays COD, bank transfer or cash | Recorded as payments; balance due is calculated; the receipt is printable (it says "Receipt", **not "Tax invoice"**, until VAT-registered) |
| Delivery address | UAE-friendly fields (emirate, area, address, landmark) plus phone; the fee comes from delivery zones |

**Repairs**

| Case | Handling |
|---|---|
| Returning customer | Matched by normalised phone number; one ticket per instrument |
| Customer books online | Request goes to the inbox; **Convert to ticket** prefills the ticket once the guitar arrives |
| Simple fixed-price job (e.g. a setup) | Quote recorded as approved **in person** at drop-off, so repair can start at once |
| Extra problem found mid-repair | A new quote version marks the old one superseded and needs approval again; the ticket shows "Waiting for your approval" |
| Customer declines the quote | Goes to Ready for collection with an optional diagnosis-fee line, then Closed |
| Customer approves twice, or the quote changed while their page was open | Approval is one-time and includes the quote version; a stale or decided version is rejected with "this quote changed, please reload" |
| Waiting weeks for parts | **Post update** with a note and new ETA, with its own WhatsApp message |
| Wrong status clicked | **Undo last status** adds a correction event (history is never deleted) |
| Guitar never collected | Dashboard flags long-uncollected Ready tickets; close as `abandoned` under the repair terms |
| Damage dispute | Intake photos, accessories list and the terms acceptance time on the ticket |
| Ticket link forwarded or leaked | It needs the last 4 phone digits; that check locks after 5 failures for 15 minutes per ticket (per ticket, because UAE mobile networks share IP addresses); the admin can rotate the link; nothing personal shows before the check |
| WhatsApp preview of the ticket link | The preview only shows the brand and "Repair ticket"; no personal data |
| You forget to tap Send | The unsent-updates badge on the dashboard |
| Foreign or GCC customer phone | E.164 handles any country; the last-4 check works the same |

**Admin and operations**

| Case | Handling |
|---|---|
| Updating tickets from your phone at the bench | Admin is mobile-first; wa.me opens the WhatsApp app directly |
| Lost phone or 2FA | Recovery codes plus a reset script |
| Forgotten password | Reset script (there's no email) |
| Database mistake or loss | Neon's short point-in-time restore plus a **nightly `pg_dump` to the private R2 bucket** via GitHub Actions |
| Slow upload of a large iPhone photo | Browser compresses it first, so uploads are about 1 MB |

**Security**

| Case | Handling |
|---|---|
| Admin actions called directly (server actions are public endpoints) | `requireAdmin()` in each, with an e2e test that calls them logged out |
| Admin-only data leaking to public pages | Public pages read only `public-dto.ts` shapes (no cost, internal notes or private photos) |
| Spam on public forms | Turnstile, a honeypot, rate limits and Zod length limits |
| Error monitoring (Sentry) | Phone numbers and addresses are scrubbed before sending |

## Milestones

Done milestones are marked ✅. Each milestone is **one session and one PR**, merged automatically by Claude once CI is green. Start each milestone in a fresh session: *"Do milestone Mx from docs/PLAN.md"*. Every milestone ends with lint, typecheck, unit tests, build and e2e passing. UI milestones also need en/ar screenshots on mobile and desktop.

**Before launch**

| # | Milestone | Done when |
|---|---|---|
| **M0** ✅ | **Skeleton**: Next.js + TS strict, Tailwind, ESLint/Prettier, Vitest, Playwright, GitHub Actions (with a Postgres service), `env.ts`, `config/brand.ts`. Copy this plan to `docs/PLAN.md`; `CLAUDE.md` with conventions (logical CSS, fils, `requireAdmin()`, public DTOs, revalidate on change, Asia/Dubai, skills, auto-merge own green PRs) | CI green; build passes; a missing env var fails startup with a clear message |
| **M1** ✅ | **i18n + design system**: next-intl, detection + cookie, RTL, font pair, colour tokens at **WCAG AA**, header, footer, language switch, WhatsApp button (inline-end; never covers content or focus), `<bdi>` helpers, `formatMoney`/`formatDate` (Asia/Dubai, Latin digits) | Both locales render with the correct `dir`/`lang`; axe has no serious issues; contrast table in `docs/design.md`; `web-design-guidelines` review clean |
| **M1b** ✅ | **Photo-led redesign + atmosphere images** (split from M1). **Owner feedback on M1 (Oct 2026): the colour-chart idea and the layout were rejected; keep the colour tokens and the fonts.** Use the Unsplash connector to find free-licence candidates (guitars, pickups, frets, amp knobs, a luthier's bench, hands at work) and show them as a contact sheet for approval; save the chosen ones to the repo + `docs/IMAGE_CREDITS.md`. Then redo the home page, header and footer as a **photo-led shop, dark and warm like a guitar shop at night**: large photos up front, dark surfaces (`ink`, `rosewood`) carrying the photography. Remove the colour-chart card, the footer finish strip and the chip brand mark. Needs the Unsplash connector and `unsplash.com`, `images.unsplash.com`, `api.unsplash.com` allowed in the environment's network settings | Every image has a credits entry; you approved the photos; en/ar screenshots on mobile and desktop approved by you; axe and contrast checks still pass |
| **M2** ✅ | **DB + catalog model**: schema (categories, products, images, settings, delivery zones), migrations, ~8 sample products (`is_sample`, free-licence photos), `money.ts`, `phone.ts`, `inventory.ts` + tests | Migrations run on Neon dev and PGlite; tests cover rounding, phone formats (incl. Arabic digits) and the two-buyer race. *Done Oct 2026: migrations run on PGlite and on Postgres 16 (locally and in CI), and the race tests run on both. There is no Neon project yet, so the first Neon run moves to whichever milestone creates it (M9 at the latest).* |
| **M3** | **Public catalog**: shop, filters, product page, Order on WhatsApp, Sold/On-hold states, condition guide, SEO (metadata, hreflang, sitemap, JSON-LD, OG) | e2e: browse → filter → product → exact wa.me URL in en and ar; drafts 404; English fallback works |
| **M4** | **Admin auth + products + images**: Better Auth with TOTP, scripts, products CRUD, publish checks, slug lock, image pipeline (EXIF/GPS removed, public/private buckets, fs storage in dev), revalidation | e2e: every admin page **and** action is refused when logged out; sign-up endpoint refused; an uploaded photo has **no EXIF**; a product edit shows on the public page immediately |
| **M5** *(large; may split 5a/5b)* | **Repairs (admin)**: tickets, intake (photos, accessories, terms tick), state machine, versioned quotes and approval methods, Post update, Undo, events, en/ar wa.me templates, unsent badge, ETA | State-machine tests cover every row of the repairs table above; e2e: create → diagnose → in-person approval → in repair → ready → closed, with correct wa.me text |
| **M6** | **Repairs (customer)**: `/r/[token]` with phone check and lockout, timeline, quote approve/decline with version check, signed photo URLs, payment due; `/repairs` page; Book-a-repair form → inbox → convert to ticket | e2e: full flow with link approval; stale-quote approval rejected; lockout after 5 tries; rotated or invalid token returns 404; ticket response is `no-store` + `noindex` |
| **M7** *(large; may split 7a/7b)* | **Orders + payments + inbox**: manual orders, payments ledger (deposit, COD, transfer, refund), holds, cancel/restock, delivery zones, printable receipt, VAT switch + TRN, `/sell` form → inbox | e2e: hold → deposit → order → paid → Sold; cancel restores stock; VAT on/off totals; sell submission lands in the inbox with private photos |
| **M8** | **Content, policies, hardening**: Home, About, FAQ, Contact; policy drafts in en/ar (for you to review); 404/500; security headers + CSP; **`insecure-defaults` audit**; **full regression e2e of the walkthrough above** | Audit has no open findings; every walkthrough case has a test or a manual-check note; all pages work in both locales |
| **M9** | **Go-live (no gateway)**: deploy on Vercel Hobby for your review, then Pro before public sales; domain; launch check fails while any `is_sample` product or uncredited image remains; production Neon + R2, nightly backup Action (restore tested once), Sentry with scrubbing, launch checklist (WhatsApp Business app, Google Business Profile as a service-area business with your address hidden, real products and photos loaded) | Production smoke test passes: WhatsApp order, manual sale, full repair cycle; backup restore works; site public **once the licence is issued** |

**After launch (needs the licence + an approved Stripe account)**

| # | Milestone | Done when |
|---|---|---|
| **M10** | **Stripe checkout behind the switch**: cookie cart, server-side prices, delivery fee, stock reserved when the session is created, Checkout Session, webhook (signature on the raw body, idempotency, release stock on `expired`), success page, guarded switch | Tests: tampered price ignored; bad signature returns 400; duplicate event processed once; two buyers → one succeeds; expiry releases stock; switch off = no cart anywhere |
| **M11** | **Online repair payments**: Pay button on Ready tickets through the same adapter; a webhook records it in `payments` | e2e in test mode: pay → ticket shows paid; a second payment attempt is blocked |

**Later, not planned yet:** WhatsApp Business API notifier, tone packs, email.

**Budget ($100):** I can't see your balance, so these are estimates.
- M0–M9 is about **$55–80**, and the post-launch milestones about **$10–15**.
- To keep costs down:
  - start a fresh session for each milestone;
  - keep each session to its milestone;
  - for the two large ones, I'll stop at a clean point and split rather than push through.

## Risks and decisions you may not have considered

1. **Licence before going public** (see above). The licence name must match the brand on the site, so **choose the name before applying**.
2. **Photos leak your home location.** GPS data in photos is removed on upload (M4). Never upload originals anywhere else either.
3. **Repair terms:**
   - abandoned instruments (e.g. after 90 days);
   - a diagnosis fee if a quote is declined;
   - deposits for parts;
   - your liability limits.

   The customer accepts them at drop-off or on approval, and the time is recorded.
4. **Returns on used guitars.** UAE consumer law still applies. Use a short inspection window (e.g. 3 days, in original condition) and describe every flaw.
5. **Courier and COD.** Use a courier that offers COD and fragile handling. Hard case or neck-supported packing, plus insurance. Decide who pays if a guitar arrives damaged.
6. **Stolen guitars.** Require the serial and an ownership tick box on `/sell`, and check serials before buying.
7. **wa.me depends on you tapping Send.** The dashboard flags unsent updates. The **WhatsApp Business app is free**: a profile with hours, quick replies, labels and a greeting message. Use a **dedicated number** (a second SIM or eSIM), because a number can't be on both personal WhatsApp and the Business app. Only the later **API** (automatic messages) charges per message.
8. **VAT.** Watch the 12-month total against AED 375k. When registered, ask an accountant about the **second-hand goods profit-margin scheme**; `cost_fils` is stored so the margin can be calculated.
9. **Data protection (UAE PDPL).** Collect only name, phone and address. State that hosting is outside the UAE, record WhatsApp consent, and remove phone numbers from error logs.
10. **Arabic content takes time.** Claude can draft it, but you should review it. Missing Arabic falls back to English.
11. **Photography sells used guitars.** Use the same backdrop and light, and shoot front, back, headstock and every flaw.
12. **Hosting cost at launch.** Building and reviewing on Vercel Hobby is free. Its terms forbid commercial use, so move to Pro (~$20/mo) before the public launch with real sales. Moving is a plan change in Vercel's settings; the code stays the same.
13. **Image copyright.** Only your own photos or verified free-licence stock, every stock image logged with its source. Never images from other shops, Google or Instagram.

## Verification

- Each PR: `pnpm lint && pnpm typecheck && pnpm test && pnpm build` plus Playwright e2e in CI. It merges only when green.
- UI milestones: en/ar screenshots on mobile and desktop reviewed against `frontend-design`, a `web-design-guidelines` review, and axe checks.
- Security: `insecure-defaults` audit in M8 and again in M10; logged-out admin-action tests (M4); ticket-access tests (M6); webhook tests (M10).
- M8 runs a regression test of every row in the use-case walkthrough. M9 repeats the key flows in production before the site goes public.
