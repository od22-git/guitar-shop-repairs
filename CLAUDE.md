# Guitar shop + repairs site

Bilingual (EN/AR, RTL) site for **Midtown Gears**, an online-first music gear, custom tone and guitar services brand in the UAE run by three partners: NANOCORE bundles with custom tone presets, parts, used guitars as a side line, service bookings, repair tickets with customer tracking links, and an admin area. The business was re-planned in Oct 2026 (see "Re-plan" at the top of the plan); the early milestones were built for a used-guitar shop.

**The full plan, decisions and milestones are in [`docs/PLAN.md`](docs/PLAN.md). Read it before starting any work.**

## Workflow

- Work one milestone per session (e.g. "Do milestone M3 from docs/PLAN.md"). Stay within that milestone's scope; if it runs long, stop at a clean point and split it instead of pushing through.
- Every milestone ends with lint, typecheck, unit tests, build and e2e passing, plus the milestone's "Done when" criteria.
- Anything that needs the owners' input (a default, a placeholder, an account) gets a line in [`docs/OWNER-TODO.md`](docs/OWNER-TODO.md) with its default and the milestone that needs it.
- **Open a PR for each milestone and merge it yourself once CI is green, without asking.** Tell the owner afterwards what was merged.
- Tick off completed milestones in `docs/PLAN.md` as part of the milestone's PR.

## Skills

Follow the skills in `.claude/skills/`: `frontend-design` for UI, `vercel-react-best-practices` for React/Next.js code, `web-design-guidelines` for UI reviews, `insecure-defaults` for security audits. Their sources are listed in `.claude/skills/SOURCES.md`.

## Commands

pnpm 10 and Node 22 (`.nvmrc`). Copy `.env.example` to `.env.local` first: `dev`, `build`, `start` and `typecheck` refuse to run without it.

- `pnpm dev` — dev server
- `pnpm lint` — ESLint (zero warnings) + Prettier check; `pnpm format` fixes formatting
- `pnpm typecheck` — `next typegen` + `tsc`
- `pnpm test` — Vitest unit tests (`src/**/*.test.ts`)
- `pnpm build && pnpm test:e2e` — Playwright against the production build (`e2e/`, desktop + mobile)
- `pnpm db:migrate` — apply migrations in `drizzle/` to `DATABASE_URL`; `pnpm db:seed` — categories, delivery zones and sample products (idempotent; `--no-samples` skips the samples). `build` reads settings from the database, so migrate first.
- `pnpm db:generate` — after changing `src/lib/db/schema.ts`, writes the next SQL migration; commit it. Never edit an applied migration.

Database unit tests run on PGlite (`src/test/db.ts`). With `TEST_DATABASE_URL` set to a Postgres server URL (any database; the tests create and drop their own), the inventory race tests also run there on real connections, e.g. `TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres pnpm test`.

CI (`.github/workflows/ci.yml`) runs all of these, with a Postgres 16 service for unit tests and e2e.

## Stack notes

- Next.js 16 (App Router, Turbopack, `cacheComponents`). Its APIs differ from older versions: read `node_modules/next/dist/docs/` before using one (see `AGENTS.md`, which `next dev` keeps rewriting; leave it in place).
- Tailwind CSS v4, configured in `src/app/globals.css` (no `tailwind.config`).
- `@playwright/test` is pinned to the version matching the browser pre-installed in Claude's cloud sessions. Bump it only together with that browser.

## Conventions

- Read configuration only through `env` from `@/lib/env` (Zod-validated in `src/lib/env-schema.ts`; `next.config.ts` validates at startup). ESLint blocks `process.env` elsewhere in `src/`. A new variable goes in the schema, `.env.example` and the CI workflow's `env`. No fallback values for secrets.
- Brand name, tagline and location come from `src/config/brand.ts`; never hard-code them.
- UI text lives in `messages/{en,ar}.json` (same keys; a unit test checks). Pages are under `src/app/[locale]/`; read the locale with next-intl (`getLocale`/`getTranslations`), link with `Link` from `@/i18n/navigation`, not `next/link`. Client components get strings as props (the provider passes them no messages).
- Format money, dates and times only with `formatMoney`/`formatDate`/`formatDateTime` (`src/lib/money.ts`, `src/lib/datetime.ts`), not next-intl's ICU number/date arguments. Wrap phone numbers, serials, SKUs and ticket numbers in `<Ltr>`, and prices or Latin names inside Arabic text in `<Bdi>` (`src/components/bdi.tsx`).
- Design system (M9a, see `docs/design.md`): build public UI from `src/components/ui/` (headings, buttons, badges, prices, cards, fields, layout) and the `Wordmark`; `/en/design-system` shows them all. Blue is for highlights only.
- Colours: only the tokens in `src/app/globals.css` (Tailwind's default palette is off). A new text/background pair goes in `src/app/design-tokens.test.ts` and the table in `docs/design.md`. Never letter-space Arabic: pair `tracking-*` with `rtl:tracking-normal`.
- Money is stored as integer fils (1 AED = 100 fils). Parse typed amounts with `parseAedToFils` and VAT with `vatIncludedFils` (per line) from `src/lib/money.ts`; never multiply floats. Show times in Asia/Dubai, with Western digits in Arabic.
- Phone numbers are stored in E.164: normalise input with `normalizePhone` (`src/lib/phone.ts`; it takes Arabic-Indic digits), show them with `formatPhone`.
- Change stock only through `src/lib/inventory.ts` (`reserve`, `release`, `sell`, `restock`): conditional updates that are safe under concurrent orders. Library code takes a `Database` (`src/lib/db/connect.ts`) so it runs on Neon, node-postgres and PGlite alike; app code imports `db` from `@/lib/db/client`.
- Public pages get products only through `getCatalog()`/`getProduct()` from `@/lib/catalog` (one cached read of the listed catalog, as `public-dto.ts` shapes). Every admin change to a product, its photos or stock calls `revalidateTag(CATALOG_TAG)`. Product photos resolve through `src/lib/product-images.ts`; each needs `<key>-<width>.webp` at the stock widths plus `<key>-og.jpg` from `makeOgImage` (`src/lib/og-image.ts`).
- In plain strings that mix scripts (WhatsApp messages, option labels), isolate Latin titles and codes with `isolate`/`isolateLtr` from `src/lib/bidi.ts`, the string equivalent of `<Bdi>`/`<Ltr>`.
- Admin-editable shop settings (WhatsApp number, VAT, TRN) are read with `getSettings()` from `@/lib/settings`; their schema and defaults are in `src/lib/settings/schema.ts`. Changes revalidate `SETTINGS_TAG`.
- Use CSS logical properties only (`ms-/me-/ps-/pe-`, `start/end`), never left/right. ESLint rejects physical Tailwind classes (`ml-`, `pr-`, `left-`, `text-right`, `rounded-l`, …) in `src/`.
- Security headers and the CSP are in `src/lib/security-headers.ts`: a new third-party script, iframe or API host goes there, or the browser blocks it. Never render user-written HTML (the CSP allows inline scripts; see `docs/security-audit.md`).
- Call `requireAdmin()` in every admin server action and route. There are up to three admin accounts with the same access; from M11 every admin change records the acting admin. Public pages read only the shapes in `lib/public-dto.ts`.
- Every admin change to products, stock or settings revalidates the affected pages.
- Never use images from other websites. Use only the owner's photos, or free-licence stock logged in `docs/IMAGE_CREDITS.md`.
- Free-licence stand-in photos on a real product (until the owners' own photos exist) are credited like any stock and the product is flagged as using placeholder photos (from M10), so the launch check can refuse it. Never present a different device as the product.
- Public and customer-facing tone and pack names are descriptive or "inspired by", never band names (trademarks). Customers may name bands in their own tone requests; those stay private.
- Payments: online through the `PaymentProvider` adapter only (Stripe from M13, Tabby from M14); the admin records cash taken in person. Bank transfer and COD are no longer offered.
