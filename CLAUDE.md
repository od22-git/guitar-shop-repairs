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

## Conventions

These are the plan's rules; M0 expands this section as code lands.

- Money is stored as integer fils (1 AED = 100 fils). Show times in Asia/Dubai, with Western digits in Arabic.
- Use CSS logical properties only (`ms-/me-/ps-/pe-`, `start/end`), never left/right.
- Call `requireAdmin()` in every admin server action and route. Public pages read only the shapes in `lib/public-dto.ts`.
- Every admin change to products, stock or settings revalidates the affected pages.
- Never use images from other websites. Use only the owner's photos, or free-licence stock logged in `docs/IMAGE_CREDITS.md`.
