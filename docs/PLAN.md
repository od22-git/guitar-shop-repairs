# Plan: Midtown Gears (music gear, custom tones and guitar care, UAE)

## Re-plan (Oct 2026): Midtown Gears

After M8b the partners' business plan arrived (*Midtown Gears Business Plan 2026*). It changes the business, so everything from M9 on was re-planned. M0–M8b stay as built: the bilingual RTL base, admin sign-in with 2FA, the photo pipeline, race-safe stock, orders, the payments ledger, receipts, repair tickets with tracking links, the inbox and the security headers are all reused. The original plan below is kept for its reasoning; **where it conflicts with this section, this section wins.**

**What changed:**
- **Brand.** **Midtown Gears**, "Big tone, no big-brand tax." Online-first, UAE-wide; the home workshop is still never published. Three founders run it as business lead, technical lead and community lead. Launch: **December 2026** (10 NANOCOREs, Instagram promotion).
- **Look.** It replaces the M1b dark look (owner decision, Oct 2026):
  - white space with black `#0A0A0A` text;
  - blue `#1F5BFF` for highlights only;
  - a bold, letters-only wordmark "MIDTOWN GEARS".
  - Archivo (Latin, extra wide for the wordmark and headings) and **Alexandria** for Arabic, which replaces Tajawal (owner decision in M9a: the Arabic should look like the English).
  - Arabic running text uses ميدتاون جيرز; the Latin wordmark is used everywhere else.
- **What we sell.**
  - **The NANOCORE device** leads, sold as bundles that are **variants of one product sharing its stock**. Every price below is editable in admin and marked "subject to change" in the business plan:

    | Variant | Price | Includes |
    |---|---|---|
    | Device only | AED 200 | The device |
    | Starter Bundle | AED 299 | A ready-made Signature Pack of 3 tones and the local warranty |
    | Custom Tone Bundle | AED 349 | Up to 3 tones built for you, with demo approval before shipping |
    | Extra custom tone (add-on) | AED 50 | One more tone, on either bundle |

  - **Footswitches** follow in 3–6 months; **custom parts** (knobs) come later.
  - **Used guitars stay as a side line**: condition grades, the guitar filters (only inside that category) and `/sell` are kept.
- **Tone presets are in scope** (they were out of scope before). The flow:
  1. The customer orders with tone details: band and album or song, use, guitar model, pickups, tuning, and what they play through.
  2. They pay, in full or a deposit.
  3. We build the tones.
  4. We send demo clips; the customer approves or asks for a tweak. **2–3 rounds are included; extra rounds cost a small fee.**
  5. We ship. **There are no revisions after delivery.**

  Public tone names are **descriptive or "inspired by", never band names**. Every delivered tone goes into a **tone library**, and each customer's tones are backed up so they can be restored after a firmware update. Ready-made **Signature Packs** (e.g. Thrash, Prog Metal, Blues) ship the same day.
- **Services.** Published, transparent prices, sold as tiers. All of these are starting prices:

  | Service | AED |
  |---|---|
  | Fresh Strings (restring + clean) | 60–80 |
  | Basic setup | 150 |
  | Full setup | 250 |
  | Gig Ready (setup + electronics + clean) | 300–350 |
  | Repairs, mods and customizations | Quoted, plus parts |
  | Care (deep clean, check-up, gig prep) | — |

  How bookings work:
  - **drop-off in fixed time slots**;
  - **pickups priced by zone and grouped on set days**;
  - **free handover points** at gigs and jams;
  - a **weekly capacity cap** shared with tone builds, with a waitlist when full;
  - a seasonal **Summer Check-up** campaign.
- **Payments.**
  - **Online checkout with Stripe (cards) and Tabby (pay in 4)**, through a cookie cart.
  - The admin also records **cash taken in person** (gigs, drop-off, collection).
  - **Bank transfer and COD are dropped.**
  - Until the merchant accounts are live, the checkout switch stays off and product pages keep "Order on WhatsApp".
- **Warranty.** A **6-month local warranty** on gear, alongside the 3-day returns and the 30-day repair guarantee.
- **Team.** **Three admin accounts with the same access**; every change records who made it.
- **Stock.** **Two stock locations** (the stock location and the technical lead's workbench), with weekly transfers, landed unit cost, a reorder point and a 2–3 unit float at the workbench.
- **Reporting.**
  - **Stats:** forms filled, paid orders, bundle mix, setups per week, repeat customers, Instagram-sourced orders.
  - **A partners' contributions log.**
- **Instagram is the storefront.** Orders start in DMs, which link to the site. Instagram and TikTok links go in the footer and on Contact.
- **After launch, not planned yet:** referral codes ("give 25, get 25"), promo and promoter codes, lessons and the first-rig student package, gear matchmaking, selling outside the UAE.

**Photos until the real ones exist.** The product photos for the NANOCORE, footswitches and parts are free-licence **stand-ins** from Unsplash. They are not pictures of the product, so:
- each such product is flagged `placeholder_photos`;
- every stand-in is credited in `docs/IMAGE_CREDITS.md`;
- the launch check refuses to go public while any flag remains.

Demo audio is a placeholder until the owners record their own.

**Owner inputs** (domain, social handles, slots, capacity, prices still to set, accounts, reviews) are tracked with their current defaults in [`OWNER-TODO.md`](OWNER-TODO.md). Every milestone that adds a default or placeholder adds a line there.

The new milestones are **M9–M18** in the Milestones table below. In the notes of the done milestones (M2–M8b), **"M9" means the go-live milestone, now M18**, and "M10" means Stripe checkout, now M13. The data model and pages sections describe what is built; each new milestone adds its own tables and pages as listed in its row.

## Context (original plan, Oct 2026; see the re-plan above)

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
- **Recommended path (updated for the re-plan):**
  1. Apply for the licence **now, under "Midtown Gears"**; the site and the licence must match. The business plan leaves licensing "to be added later", but **Stripe and Tabby both need it**, and online checkout is now the main way to pay.
  2. Build M9–M17 against the preview URL (`guitar-shop-repairs.vercel.app`), with Stripe and Tabby in test mode.
  3. Apply for Stripe and Tabby as soon as the licence arrives.
  4. Make the site public the day the licence is issued. If the merchant accounts aren't live yet, it launches with the checkout switch off: "Order on WhatsApp" plus cash in person.

## Stack

| Concern | Choice | Why |
|---|---|---|
| App | Next.js (latest stable, App Router), TypeScript strict, Server Components + Server Actions | Required. Follow `vercel-react-best-practices` (`server-auth-actions`, `server-serialization`, `async-parallel`, `bundle-*`) |
| DB | PostgreSQL on **Neon**, **Drizzle ORM** + drizzle-kit migrations, Neon **Pool (WebSocket) driver** (supports transactions, safe for serverless); **PGlite** for unit tests; real Postgres for e2e (GitHub Actions service container) | Typed SQL; transactions are needed for stock updates |
| i18n | **next-intl**, `/[locale]` (`en`, `ar`), locale from `Accept-Language` + cookie, `x-default` → en, `dir="rtl"` for ar | Mature App Router i18n |
| Styling | Tailwind CSS v4, **logical properties only** (`ms-/me-/ps-/pe-`, `start/end`), tokens as CSS variables; Radix primitives with `DirectionProvider` | RTL without mirrored CSS; accessible |
| Fonts | **Archivo** (Latin, variable weight and width) + **Alexandria** (Arabic) + **JetBrains Mono** (labels), all `next/font/google`; picked in M9a and used from M9b, see `docs/design.md`. M1–M9a used Outfit + Tajawal | `frontend-design`: a deliberate choice |
| Admin auth | **Better Auth**: email + password, **TOTP 2FA**, sign-up disabled (and tested as disabled), CLI scripts to create the admin and reset password/2FA (there's no email to reset by) | One admin; no hand-rolled crypto |
| Images | `Storage` interface: **Cloudflare R2** in prod (a **public** bucket for product photos, a **private** bucket for repair, sell-form and backup files), local filesystem in dev/tests | Customer photos are never public |
| Image pipeline | Browser resizes and compresses (max 2400 px, ≤ 2 MB, converts HEIC from iPhones) → server route re-encodes with **sharp** (checks it's a real image, **removes EXIF/GPS**, fixes orientation) → stores 3 WebP widths | **Photos taken at home carry GPS coordinates that would reveal your address.** No runtime image-optimisation costs |
| Spam | Cloudflare **Turnstile** + honeypot field on public forms (Cloudflare's test keys in tests) | Free |
| Phone numbers | `libphonenumber-js`, stored as E.164; accepts `05x…`, `+971…`, `00971…` and **Arabic-Indic digits** (٠٥٠…) | Arabic keyboards type Arabic digits |
| Payments (M13–M14) | `PaymentProvider` → `StripeProvider` (hosted Checkout Sessions) and `TabbyProvider` (hosted Tabby checkout, pay in 4). Cash in person is recorded by hand; bank transfer and COD are dropped | Card data never touches our server |
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
| **M3** ✅ | **Public catalog**: shop, filters, product page, Order on WhatsApp, Sold/On-hold states, condition guide, SEO (metadata, hreflang, sitemap, JSON-LD, OG) | e2e: browse → filter → product → exact wa.me URL in en and ar; drafts 404; English fallback works. *Done Oct 2026. Product specs gained `bodyStyle` and `pickupLayout` (fixed lists the filters use). Link previews are 1200×630 JPEGs made when a photo is added (WhatsApp shows no WebP previews), so M4's pipeline makes one per upload with `makeOgImage`. The condition guide is on `/faq#condition`, with four ordering questions; M8 adds the rest. Product pages are fully static and drafts return a real 404; an unknown category shows the not-found page with `noindex` but status 200, because the shop pages stream their filtered results.* |
| **M4** ✅ | **Admin auth + products + images**: Better Auth with TOTP, scripts, products CRUD, publish checks, slug lock, image pipeline (EXIF/GPS removed, public/private buckets, fs storage in dev), revalidation | e2e: every admin page **and** action is refused when logged out; sign-up endpoint refused; an uploaded photo has **no EXIF**; a product edit shows on the public page immediately *Done Oct 2026. Two-factor sign-in is required: the first sign-in after `pnpm admin:create` (or `admin:reset-2fa`) goes to a setup page and nothing else opens until it's done, so sign in right after creating the account. Sign-in is rate-limited in the database (10 tries a minute per IP, and 10 wrong codes lock 2FA for 15 minutes). New settings: `BETTER_AUTH_SECRET` and `STORAGE_DRIVER` (`fs` locally and in CI; `r2` plus the `R2_*` variables in production, set up in M9, so the R2 driver is so far tested only against a mocked API). Photos are served at `/media/<key>`: from the storage folder with `fs`, through a rewrite to the bucket's public URL with R2. Uploads are admin-only for now; the public forms (M6, M7) add rate-limited ones. There's no in-browser HEIC converter: the photo picker asks for JPEG, PNG or WebP, which makes iPhones convert HEIC, and the server refuses anything else. A product's slug locks once it has been published, and stays locked if it's archived and restored. Only drafts that were never published can be deleted; anything else is archived. Stock is set when a product is created and changed after that only through `inventory.ts` (hold, release, mark sold, restock). The admin's text is in its components rather than `messages/*.json`, since the admin is English only. The overview page only counts products by status for now; the rest of the dashboard comes with repairs and orders. The signed-in e2e tests run after the public ones, because they add listed products and the public tests count the samples. Shot list: [`docs/photo-shot-list.md`](photo-shot-list.md). Screenshots: [`design/m4/`](design/m4/).* |
| **M5** ✅ | **Repairs (admin)**: tickets, intake (photos, accessories, terms tick), state machine, versioned quotes and approval methods, Post update, Undo, events, en/ar wa.me templates, unsent badge, ETA | State-machine tests cover every row of the repairs table above; e2e: create → diagnose → in-person approval → in repair → ready → closed, with correct wa.me text *Done Oct 2026, in one PR (no split needed). Transitions (`src/lib/repairs/state-machine.ts`): received → diagnosed needs a quote; received → in repair is the fixed-price job approved in person at drop-off; diagnosed → in repair needs approval; diagnosed → ready only after a decline; in repair → ready is blocked while a new quote version waits; ready → closed as collected, delivered or abandoned; any earlier status → closed as cancelled. Undo walks back one change at a time with correction events; if the customer was never sent the mistaken change, neither message stays on the unsent list. Moves carry the status the page showed, so a stale page can't apply one. Decisions: a fourth event kind, `quote`, is the message for a new quote version written after diagnosis (before it, the quote goes out with the "diagnosed" message); events also store the close reason. Recording an in-person or WhatsApp decision drops that quote's unsent messages. The diagnosis fee is entered when recording a decline and stored on the ticket (`diagnosis_fee_fils`); the Ready message quotes the approved total, or that fee. The repair-terms tick is required at drop-off and optional for courier intake (those customers accept on the approval link in M6). A returning customer, matched by phone, gets the newly typed name and language; WhatsApp consent once given is kept. Ticket numbers come from a Postgres sequence (R-0001, growing past 9999). WhatsApp messages are in `messages/*.json` (`RepairWhatsApp`, plus `RepairStatus` for M6) and go out in the customer's chosen language; Send on WhatsApp opens wa.me and marks the event sent, Mark as sent covers news given another way. Tracking links already point at `/<locale>/r/<token>`, which M6 builds. Repair photos are in the private bucket (no link-preview file) and the admin sees them through `/api/repair-photos`, signed in only. The dashboard flags Ready tickets uncollected for 14 days. Walkthrough rows for M6 (online booking, link leak, preview) are tested there. Screenshots: [`design/m5/`](design/m5/).* |
| **M6** ✅ | **Repairs (customer)**: `/r/[token]` with phone check and lockout, timeline, quote approve/decline with version check, signed photo URLs, payment due; `/repairs` page; Book-a-repair form → inbox → convert to ticket | e2e: full flow with link approval; stale-quote approval rejected; lockout after 5 tries; rotated or invalid token returns 404; ticket response is `no-store` + `noindex` *Done Oct 2026, in one PR. The tracking page shows only a phone check until the last 4 digits match (Arabic-Indic digits accepted); 5 wrong tries lock that ticket's page for 15 minutes (counted per ticket in the database, so reloading doesn't reset it). A correct answer sets a 30-day cookie signed over the current token, so rotating the link ends every access to the old one. The page then shows progress, updates (never internal notes), the live quote, photos marked visible (through 30-minute signed links at `/api/ticket-photos`, which also re-check that the photo is still visible) and, once Ready, the amount due on collection: the approved total or the diagnosis fee. Payments recorded in M7 will turn that into a balance. A courier customer who hasn't accepted the repair terms ticks them to approve; the short terms list on the page is a draft for M8's repair-terms policy. After a decline on the link, the admin can set the diagnosis fee on the ticket. Link decisions store a keyed hash of the IP. Signing keys are derived from `BETTER_AUTH_SECRET` per purpose (`src/lib/signing.ts`) rather than adding another secret. An unknown or rotated token gets a real 404 from the proxy (the page streams, so it can't set its own status). The overview gains "Quotes answered: your move" and new inbox items. `/repairs` has placeholder starting prices in `src/config/repair-services.ts` for you to set. The booking form has no photo upload (customers send photos on WhatsApp; public uploads come with `/sell` in M7), requires WhatsApp consent and asks for the emirate on courier pickups. Spam protection: honeypot, Turnstile and 5 bookings an hour per IP (`rate_limits` table). New settings: `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` (Cloudflare's test keys locally and in CI; production refuses them, so real keys are needed by M9). Inbox: reply on WhatsApp (marks it replied), convert to ticket (the new-ticket form is prefilled and the booking is linked, once only), archive. Screenshots: [`design/m6/`](design/m6/).* |
| **M7a** ✅ | **Orders + payments** (split from M7): manual orders, payments ledger (deposit, COD, transfer, refund), holds, cancel/restock, delivery zones, printable receipt, VAT switch + TRN | e2e: hold → deposit → order → paid → Sold; cancel restores stock; VAT on/off totals *Done Oct 2026. M7 was split because it was too large for one session: 7a is everything except `/sell` and repair payments. An order is made in the admin (Orders → New order, or "Make an order" on a product page, which for a held item says "Make the order for the customer holding it") and takes its stock at once through `inventory.ts`, in the same transaction, so the product shows Sold (or one fewer in stock) from then on; a held item can be sold only this way or with Mark sold. Decisions: manual orders start as `confirmed` (`pending` is kept for online checkout in M10); a price agreed with the customer can replace the listed one per line; the delivery fee comes from the first active zone covering the emirate (or is typed in, e.g. 0 for free delivery), and collection by appointment has none. VAT is on when Settings says so at the moment the order is made: the order keeps its rate, VAT and TRN, so switching VAT later never changes old receipts. VAT is worked out of each line and the delivery fee (`round(amount × 5/105)` each) and summed; totals don't change, prices being final. Payments are recorded by hand on the order (deposit, payment or refund; cash, bank transfer or COD; a date and reference), can't take more than is due or refund more than was paid, and one entered by mistake can be removed. Handing over is allowed with money still due (COD comes in after delivery); a confirmation says how much. Cancelling (before handover) puts every item back in stock, and the order then shows the deposit to refund; a handed-over order can only be refunded, with the amount given back and an optional restock for a return. Receipts are in the customer's language (chosen on the order), printable from the browser, titled "Receipt" until VAT is on and "Tax invoice" with the TRN after; item titles on it are the English ones, as sold. Settings has the WhatsApp number, VAT + TRN and the delivery zones (fee, on/off); the brand name stays in `src/config/brand.ts`, as it must match the licence. The overview gains orders to hand over, money due, cancelled orders to refund, holds past their date, and the last 12 months of payments against the AED 375,000 VAT threshold. Screenshots: [`design/m7a/`](design/m7a/).* |
| **M7b** ✅ | **Sell form + repair payments** (split from M7): `/sell` form (photos, serial, proof-of-ownership tick) with rate-limited public photo uploads to the private bucket → inbox (photos shown to the admin only); payments on repair tickets through the same ledger (`payments.ticket_id`, already in the schema) and the balance on the tracking page; repair payments in the overview's 12-month total (already counted) | e2e: sell submission lands in the inbox with private photos (refused signed out); a repair payment turns the tracking page's amount due into a balance *Done Oct 2026. Sell form: name, WhatsApp number, brand, model, year, serial, condition grade, asking price, a description, 1–8 photos, an ownership tick and WhatsApp consent. Decisions: the serial number is optional (some guitars have none; the page says we check serials and may ask for proof of ownership before paying); brand, grade, description and at least one photo are required. Each photo uploads as soon as it's picked to `/api/upload/sell` (same-origin only, 30 an hour per IP, re-encoded without EXIF/GPS like every photo) into the private bucket under `inbox-pending/`, and the browser gets back a signed token; sending the form (honeypot, Turnstile, 5 offers an hour per IP) claims the photos by token, which moves them to `inbox/`, so a token works once and can't name anyone else's file. Photos picked but never sent stay under `inbox-pending/`: **M9 adds an R2 lifecycle rule deleting `inbox-pending/` objects after a day.** The admin sees the photos only signed in, through `/api/inbox-photos`; the inbox item shows the details, the photos and a WhatsApp reply naming the guitar. On phones the header keeps two links (Shop, Repairs): Sell is in the footer there, and in the header from the `sm` width up. `/repairs` and `/sell` are now in the sitemap. Repair payments: recorded on the ticket page with the same panel as orders (now shared), against what the repair costs: the approved quote's total or, after a decline, the diagnosis fee. Before either exists only a refund can be recorded; nothing can take more than is due or refund more than was paid. A deposit carries over when a new quote version replaces the approved one. The tracking page shows the amount due once Ready as before, then Total / Paid / Balance once anything is paid, then "Paid in full"; a closed ticket with nothing recorded shows nothing owed (the shop may have been paid without recording it), and a cancelled one never shows a balance. Closing a ticket with money still due isn't blocked, as COD comes in after delivery. Screenshots: [`design/m7b/`](design/m7b/).* |
| **M8a** ✅ | **Content and policies** (split from M8): Home, About, FAQ, Contact; policy drafts in en/ar (for you to review); 404/500 | All pages work in both locales; policies are drafts for you to review *Done Oct 2026. M8 was split because it was too large for one session: 8a is the content, 8b the hardening. New pages: `/about`, `/contact` (WhatsApp, a call link to the Settings number, visits by appointment, no address) and `/policies/{terms,privacy,returns,delivery,repair-terms}`, all in the footer and the sitemap; the header adds Contact from the `md` width. The FAQ now has the condition guide plus ordering, repairs, selling and shop questions. **The policies are drafts for you (and ideally a lawyer) to review before launch**; their text is in `messages/*.json` (`Policies`) and the numbers they quote are in `src/config/policies.ts`, shared with the FAQ and the ticket page. Decisions to check: returns within **3 days** for any reason, item in the condition received (you pay return delivery only when it isn't as described; opened consumables and modified items excluded); refunds within 7 days; damage in transit reported within 48 hours; deposits on holds are refunded if the customer cancels before the hold ends (change this if you want non-refundable deposits); repair work guaranteed for **30 days**; instruments uncollected **90 days** after Ready may be sold to cover what's owed; courier shipments insured; orders sent within 2 working days; we reply in Arabic and English; the privacy policy names Vercel, Neon and Cloudflare as hosts outside the UAE (confirm their regions in M9) and promises no analytics or tracking cookies. The delivery policy lists the active delivery zones and fees from Settings. Unknown policy slugs are real 404s. The ticket page's terms now link the full repair terms. 500 pages: `[locale]/error.tsx` (in the visitor's language, with Try again), `admin/error.tsx` and a bilingual `global-error.tsx`; checked by hand in dev with a throwing page, as the production build has no way to make a page fail on purpose (M8b may add one behind a test-only flag). The home page copy and its atmosphere photos stay as approved in M1b; About reuses the approved `guitars` photo, so there are no new stock images. Screenshots: [`design/m8a/`](design/m8a/).* |
| **M8b** ✅ | **Hardening** (split from M8): security headers + CSP; **`insecure-defaults` audit**; **full regression e2e of the walkthrough above** | Audit has no open findings; every walkthrough case has a test or a manual-check note; all pages work in both locales *Done Oct 2026. Every response now has a Content-Security-Policy, HSTS (on https), `X-Frame-Options: DENY`, `nosniff`, a `Permissions-Policy` and `Cross-Origin-Opener-Policy`, from `src/lib/security-headers.ts`; the private pages keep `no-referrer`, public ones send `strict-origin-when-cross-origin`. Decision: the CSP has no nonces, because nonces need every page rendered per request, which would turn off the static catalog; scripts are limited to the site and Cloudflare Turnstile, with `'unsafe-inline'` for Next.js's own inline scripts, and nothing may connect to or frame from any other host. A new third-party script or host (Sentry in M9, Stripe in M10) must be added there. The audit ([`security-audit.md`](security-audit.md)) found and fixed two things (no headers; production would have accepted CI's published `BETTER_AUTH_SECRET`, now refused) and accepted two with reasons (`'unsafe-inline'`; the client IP from `x-forwarded-for`, safe on Vercel, so **M9 must deploy on Vercel** or behind a proxy that sets it). Walkthrough: [`walkthrough-tests.md`](walkthrough-tests.md) maps every row to its tests; new tests cover the ticket link's preview, a GCC customer's phone check, the booking honeypot and 2FA backup codes. Left for M9 as manual checks: wa.me opening the app on a real phone, a large iPhone photo over mobile data, backups and Sentry. The 500 pages stay a manual check: making a production page fail on purpose would need a new public endpoint. No UI changed, so there are no screenshots.* |
**Midtown Gears re-plan (Oct 2026; see "Re-plan" at the top).** These replace the original M9 (go-live), M10 (Stripe) and M11 (online repair payments), which are folded into M13, M14 and M18. They are ordered by dependency. The critical path for the December launch is M9a → M9b → M10 → M13 → M14 → M15 → M18, with M11 and M12 alongside. **If time runs short, M16 and M17 move just after launch.**

| # | Milestone | Done when |
|---|---|---|
| **M9a** ✅ | **Redesign direction** (owner feedback, Oct 2026: the whole current UI is rejected, not just its colours. It looks generic, like a template; the layout and spacing feel off; the typography is wrong). <ul><li>Direction: **bold editorial**, like the business-plan cover and music-tech brands such as Teenage Engineering and Nothing. Huge black type, lots of white space, big product shots, blue `#1F5BFF` only for highlights.</li><li>Before building anything, show mockups of the home page and a product page (en and ar, mobile and desktop) for approval.</li><li>Then lock the design system:<ul><li>a heavy grotesk for the wordmark and headings (Tajawal stays for Arabic, with matching weight; changed by the owner to Alexandria, below);</li><li>a type scale, grid and spacing rules;</li><li>the core components: buttons, product card, price, badges, form fields, section layouts.</li></ul></li><li>New tokens in `globals.css`: black, white, blue, plus neutral greys for surfaces and muted text. Rewrite `design-tokens.test.ts` and `docs/design.md`.</li><li>The `Wordmark` component.</li><li>`src/config/brand.ts`: Midtown Gears, the tagline, "UAE", ميدتاون جيرز, Instagram and TikTok handles (hidden while unset).</li><li>Pick the atmosphere photos from an Unsplash contact sheet, for approval.</li></ul> | You approved the mockups and photos; the tokens and components are in code, with contrast tests *Done Oct 2026. The owner approved the home and product mockups ([`design/m9a/mockups/`](design/m9a/mockups/)) and asked for an Arabic font closer to the English one, so **Alexandria** replaces Tajawal (picked from six rendered next to Archivo; [`design/m9a/fonts-arabic.jpg`](design/m9a/fonts-arabic.jpg)). The owner left the photos to Claude: `bend`, `player`, `gig`, `knobs`, `workbench` and `jam` from the contact sheet, shown in black and white except the blue-lit gig. Latin type is **Archivo** (its width axis gives the extra-wide wordmark and headings) with **JetBrains Mono** for small labels. New tokens: `black`, `white`, `blue`, `grey-100/300/400/600/800`, and `red` for errors only (forms need one; not in the brief); contrast pairs in `design-tokens.test.ts` and `docs/design.md`. Components in `src/components/ui/` (`Heading`, `Lead`, `Label`, `Eyebrow`, `buttonClass` + `Arrow`, `Badge`, `Price`, `ProductCard`, `Field`, `Checkbox`, `OptionCard`, `Container`, `Grid`, `Section`, `RuledColumn`, `PriceList`) plus `Wordmark` and `SocialLinks`, all shown at `/en/design-system` and `/ar/design-system` (unlinked, `noindex`, not in the sitemap; axe and e2e run on it). `brand.ts` has the new name, wordmark, tagline, "UAE" and Instagram/TikTok handles, unset for now, so the links (already in the footer) stay hidden. Decision: the pages keep the M1b look until M9b, so the new tokens sit next to the old ones and the new fonts aren't preloaded yet. Already visible on the current site: the new name, tagline and "UAE" (copy still saying "home workshop in {location}" reads oddly until M9b rewrites it). **M9b must:** put `.theme-midtown` on `<body>`, preload the three fonts and drop Outfit and Tajawal, move every page and the admin onto the new tokens and components, then delete the M1 tokens (and `legacyPairs`), the old `ProductCard`/`PriceTag`/`form-parts` classes and the M1b stock photos. Screenshots: [`design/m9a/`](design/m9a/).* |
| **M9b** ✅ | **Redesign every public page** in the approved system, with copy rewritten in the new voice (`messages/*.json`). <ul><li>Header, footer (with social links) and home page (why Midtown instead of Amazon; who we serve; gear, tones and care).</li><li>Shop and product pages.</li><li>Repairs and sell.</li><li>The ticket tracking page.</li><li>About, FAQ, contact and policies.</li><li>404 and error pages.</li><li>The admin keeps its layout and only gets the new tokens and wordmark. Public site only, by owner decision.</li></ul> May split by page group if long. | You approved the en/ar screenshots on mobile and desktop for every page; axe and contrast checks pass; e2e still green *Done Oct 2026, in one PR (no split needed). Every public page, the header (a Menu button on phones), the black footer with the full-width wordmark and the social links (hidden until the handles are set), and the 404 and error pages are built from the M9a components, with copy rewritten in the new voice; the admin keeps its layout with the new tokens and the wordmark. `.theme-midtown` is on `<body>`, Archivo, Alexandria and JetBrains Mono are preloaded, and the M1 tokens, `legacyPairs`, Outfit, Tajawal, `PriceTag`, the old `ProductCard`, `form-parts.tsx` and the M1b stock photos are deleted. Decisions: until M10 makes the NANOCORE a product, the home page shows its bundles and launch prices from `src/config/nanocore.ts` beside a grey "photos coming soon" frame, and asks on WhatsApp; the mockup's "Most picked" badge is "Our pick", since nothing has sold yet. The product page keeps today's products (no bundle picker until M10) and adds three promises (checked at our bench, delivered across the UAE, the returns window). The FAQ gained a "Custom tones" group (linked from the home page), with the included tweak rounds and the 6-month device warranty as numbers in `src/config/policies.ts`. Copy no longer says "home workshop": the shop is online first and the workshop's address unpublished. Payment wording (cash on delivery, bank transfer) is left for M13/M14, which change how customers pay. The page title is now "Repairs and setups"; the `/repairs` path stays until M12. Screenshots for your approval: [`design/m9b/`](design/m9b/) (OWNER-TODO).* |
| **M10** | **Catalog pivot**. <ul><li>`product_kind` gains `device`, `accessory`, `part` and `service_addon`.</li><li>A `product_variants` table: name en/ar, price, compare-at, custom-tone slots, includes-a-pack flag, sort, active. Stock stays on the product, so every bundle draws on the same units.</li><li>An add-on with no stock: "extra custom tone".</li><li>New categories: Devices & bundles, Footswitches, Parts & knobs, Used guitars.</li><li>Product page: bundle picker, what's in the box, 6-month warranty, "tested by us" (the five checks).</li><li>Guitar specs, filters and the condition guide only on guitars.</li><li>The WhatsApp message names the chosen variant.</li><li>Variants in the public DTOs and in JSON-LD (`AggregateOffer`).</li><li>Admin variant editor.</li><li>A `placeholder_photos` flag, with Unsplash stand-in samples.</li><li>A warranty policy page.</li><li>A draft footswitch with no price.</li></ul> | e2e: pick a bundle → exact wa.me text in en and ar; all variants show one stock state; guitar pages unchanged |
| **M11** | **Team + two-location stock**. <ul><li>Up to three admins.</li><li>An `actor_user_id` on repair events, payments, orders and stock movements, shown in admin history.</li><li>`inventory.ts` rewritten over three new tables:<ul><li>`stock_locations` (Stock location, Workbench);</li><li>`stock_levels`;</li><li>`stock_movements`: receive (with landed unit cost), transfer, sell, return, adjust.</li></ul></li><li>`products.quantity` stays as the total, kept in the same transaction, so public pages don't change.</li><li>A reorder point and a workbench float target per product, with alerts on the overview.</li></ul> | Race tests still pass on PGlite and Postgres; receive and transfer are tested; every admin change shows who made it |
| **M12** | **Services**. <ul><li>`/repairs` becomes `/services`, with permanent redirects; ticket links keep working.</li><li>Service tiers and prices from the re-plan, plus customizations and care.</li><li>The booking form gains the service tier and a drop-off slot, from weekly slots set in admin.</li><li>Pickup days.</li><li>A weekly capacity cap (shared with tone builds), with a waitlist message when full.</li><li>A Summer Check-up switch.</li><li>A care page ("Don't leave your guitar in the car").</li></ul> | e2e: book a slot; a full week shows the waitlist; old `/repairs` links redirect |
| **M13** | **Cart + Stripe checkout** (the old M10, extended). <ul><li>A cookie cart of variants and add-ons; prices worked out on the server.</li><li>A tone-details step for each custom-tone slot.</li><li>Delivery options:<ul><li>courier by zone, with a free-delivery threshold setting;</li><li>handover at a gig or jam (points set in admin; hidden while there are none);</li><li>collection in a slot.</li></ul></li><li>Email asked at checkout, for payment receipts only; update the privacy policy.</li><li>`PaymentProvider` + `StripeProvider`:<ul><li>Checkout Session;</li><li>a webhook with the signature checked on the raw body;</li><li>idempotency;</li><li>stock reserved when the session is created and released on `expired`.</li></ul></li><li>A success page and a guarded switch.</li><li>Stripe hosts added to the CSP.</li></ul> | Tests: tampered price ignored; bad signature returns 400; duplicate event processed once; two buyers → one succeeds; expiry releases stock; switch off = no cart anywhere and the WhatsApp fallback shows |
| **M14** | **Tabby + online repair payments** (the old M11). <ul><li>`TabbyProvider` through the same adapter: checkout session, webhook plus server-side verify, capture, refund.</li><li>The pay-in-4 promo on product and cart pages (CSP updated).</li><li>The payment method gains `tabby`. Bank transfer and COD are refused in validation and the UI; the enum keeps them, as Postgres can't drop enum values easily.</li><li>A Pay button on Ready repair tickets (Stripe or Tabby).</li><li>`insecure-defaults` re-audit.</li><li>Tabby stays hidden until its keys are set. **If Tabby test keys aren't available yet, Stripe ships alone and Tabby moves to its own milestone.**</li></ul> | In test mode: pay → webhook → order paid; a refund is recorded; a repair is paid online and can't be paid twice |
| **M15** | **Tone builds**. <ul><li>Three new tables: `tone_builds` (one per custom tone, from a paid or admin-made order), `tone_build_rounds` and `tone_build_events`.</li><li>States: details needed → queued → building → demo sent → tweak requested (round n) → approved → delivered. An extra round adds a fee.</li><li>Demo clips are audio in the private bucket, played through signed links (`media-src`).</li><li>A private tracking link like `/r/[token]`: phone check, play the clips, approve or request a tweak with a note.</li><li>en/ar WhatsApp templates, an ETA (3–5 days) and the unsent-updates badge.</li><li>Builds count toward the M12 capacity cap.</li><li>Names the public or the customer sees are "inspired by", never band names; the admin form says so.</li></ul> | e2e: paid custom bundle → build → demo → tweak → approve → delivered, with exact wa.me texts; round limit and fee; a stale approval is rejected |
| **M16** | **Tone library + Signature Packs + backups**. <ul><li>The `tones` library: descriptive name, genre, device and firmware version, preset file (private), a recipe sheet for a second builder, the source build.</li><li>`tone_packs` with public audio demos.</li><li>Pack pages; customers choose a pack for the Starter Bundle.</li><li>Per-customer tone backups, with a restore action for after firmware updates.</li></ul> | A pack page plays its demo in both locales; a delivered build lands in the library and in the customer's backups |
| **M17** | **Stats + contributions**. <ul><li>A stats page:<ul><li>forms filled;</li><li>paid orders and conversion;</li><li>bundle mix (Starter vs Custom);</li><li>setups per week;</li><li>repeat customers;</li><li>Instagram-sourced orders (`?src=ig` links);</li><li>profit per order from cost.</li></ul></li><li>The partners' contributions log: who, amount, date, note, with totals per partner.</li></ul> | Unit tests match the figures on seeded fixtures |
| **M18** | **Go-live** (the old M9). <ul><li>Deploy on Vercel, then move to Pro before public sales.</li><li>The domain, once bought.</li><li>Production Neon and R2, with a lifecycle rule deleting unsent `/sell` photos under `inbox-pending/` after a day.</li><li>A nightly backup Action, with the restore tested once.</li><li>Sentry with scrubbing.</li><li>Live Stripe and Tabby keys.</li><li>A launch check that fails while any of these remain: an `is_sample` product, a `placeholder_photos` product, an uncredited image, the placeholder WhatsApp number. It also lists the open items in `OWNER-TODO.md`.</li><li>Launch checklist: WhatsApp Business app, Google Business Profile as a service-area business with the address hidden, the Instagram bio link, real products and photos loaded.</li></ul> | Production smoke test passes: Stripe and Tabby checkout, a cash sale, a full repair cycle, a full tone build; backup restore works; site public **once the licence is issued** |

**After launch, not planned yet:**
- referral codes (give AED 25, get AED 25), promo and promoter discount codes;
- lessons and the first-rig student package (lesson + Starter Bundle + setup);
- gear matchmaking;
- selling outside the UAE;
- WhatsApp Business API notifier.

The December launch offer (a free extra tone or restring) can run without codes: temporarily add the extra tone to the bundle variants.

**Budget ($100):** I can't see your balance, so these are estimates.
- M0–M9 is about **$55–80**, and the post-launch milestones about **$10–15**. (Original estimate.)
- The re-plan's M9–M18 are about ten more sessions, roughly the M4–M8 effort again, since most of the base is reused. Large ones (M10, M13, M15) may split.
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
