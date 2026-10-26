# Guitar shop + repairs site

Bilingual (EN/AR, RTL) site for a home-based electric guitar shop in Ras Al Khaimah, UAE: catalog, WhatsApp ordering, repair tickets with customer tracking links, and an admin area.

**The full plan, decisions and milestones are in [`docs/PLAN.md`](docs/PLAN.md). Read it before starting any work.**

## Workflow

- Work one milestone per session (e.g. "Do milestone M3 from docs/PLAN.md"). Stay within that milestone's scope; if it runs long, stop at a clean point and split it instead of pushing through.
- Every milestone ends with lint, typecheck, unit tests, build and e2e passing, plus the milestone's "Done when" criteria.
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

CI (`.github/workflows/ci.yml`) runs all of these, with a Postgres 16 service for e2e.

## Stack notes

- Next.js 16 (App Router, Turbopack, `cacheComponents`). Its APIs differ from older versions: read `node_modules/next/dist/docs/` before using one (see `AGENTS.md`, which `next dev` keeps rewriting; leave it in place).
- Tailwind CSS v4, configured in `src/app/globals.css` (no `tailwind.config`).
- `@playwright/test` is pinned to the version matching the browser pre-installed in Claude's cloud sessions. Bump it only together with that browser.

## Conventions

- Read configuration only through `env` from `@/lib/env` (Zod-validated in `src/lib/env-schema.ts`; `next.config.ts` validates at startup). ESLint blocks `process.env` elsewhere in `src/`. A new variable goes in the schema, `.env.example` and the CI workflow's `env`. No fallback values for secrets.
- Brand name, tagline and location come from `src/config/brand.ts`; never hard-code them.
- UI text lives in `messages/{en,ar}.json` (same keys; a unit test checks). Pages are under `src/app/[locale]/`; read the locale with next-intl (`getLocale`/`getTranslations`), link with `Link` from `@/i18n/navigation`, not `next/link`. Client components get strings as props (the provider passes them no messages).
- Format money, dates and times only with `formatMoney`/`formatDate`/`formatDateTime` (`src/lib/money.ts`, `src/lib/datetime.ts`), not next-intl's ICU number/date arguments. Wrap phone numbers, serials, SKUs and ticket numbers in `<Ltr>`, and prices or Latin names inside Arabic text in `<Bdi>` (`src/components/bdi.tsx`).
- Colours: only the tokens in `src/app/globals.css` (Tailwind's default palette is off). A new text/background pair goes in `src/app/design-tokens.test.ts` and the table in `docs/design.md`. Never letter-space Arabic: pair `tracking-*` with `rtl:tracking-normal`.
- Money is stored as integer fils (1 AED = 100 fils). Show times in Asia/Dubai, with Western digits in Arabic.
- Use CSS logical properties only (`ms-/me-/ps-/pe-`, `start/end`), never left/right. ESLint rejects physical Tailwind classes (`ml-`, `pr-`, `left-`, `text-right`, `rounded-l`, …) in `src/`.
- Call `requireAdmin()` in every admin server action and route. Public pages read only the shapes in `lib/public-dto.ts`.
- Every admin change to products, stock or settings revalidates the affected pages.
- Never use images from other websites. Use only the owner's photos, or free-licence stock logged in `docs/IMAGE_CREDITS.md`.
