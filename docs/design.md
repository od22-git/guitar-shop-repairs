# Design system

Set up in M1. Tokens live in `src/app/globals.css`; this file explains them and records the checks.

## Direction

> **Superseded.** The owner rejected the colour-chart concept and this layout after M1. The tokens and fonts below stay. M1b replaces the direction with a photo-led, dark and warm shop look (see `PLAN.md`), and removes the colour-chart card, footer strip and chip brand mark.

The palette is a **1960s factory custom colour chart**: the printed card of finish chips that guitar makers handed to dealers. That card is the one memorable element. It appears as the colour chart on the home page, the strip on top of the footer and the three-chip brand mark. Everything around it stays quiet: one sans-serif family per script, flat surfaces, square-ish corners like a printed card.

## Colour tokens

Tailwind's default palette is switched off (`--color-*: initial`), so only these exist.

| Token | Hex | Finish | Use |
|---|---|---|---|
| `mist` | `#E6EEF1` | Sonic Blue (mist) | Page background |
| `paper` | `#F7FAFB` | — | Raised surfaces (cards) on mist |
| `ink` | `#13294B` | Lake Placid Blue (deep) | Text; dark surfaces (footer) |
| `ink-muted` | `#46597A` | — | Secondary text on mist/paper |
| `ink-subtle` | `#B7C6D3` | — | Secondary text on ink |
| `fiesta` | `#D2383A` | Fiesta Red | Primary button fill (white text), large text, graphics |
| `fiesta-deep` | `#B3262A` | Fiesta Red (deep) | Small red text; button hover |
| `gold` | `#C8A55A` | Shoreline Gold | Graphics on light; **text only on ink or rosewood**; focus ring on dark |
| `rosewood` | `#4A2F27` | Rosewood | Text; dark surfaces |
| `sherwood` | `#1E6B4F` | Sherwood Green | The WhatsApp button |
| `white` | `#FFFFFF` | — | Text on fiesta and sherwood |

**Tuning done in M1.** The five plan colours are kept as given. Fiesta Red reaches only 4.09:1 on mist, so it's used for fills, large text and graphics, and `fiesta-deep` was added for small red text. Shoreline Gold is 1.99:1 on mist, so it never carries text on light backgrounds. Sherwood Green, another period finish, was added for the WhatsApp button: customers expect a green WhatsApp button, and WhatsApp's own green fails with white text (about 2:1).

## Contrast (WCAG 2.2 AA)

Every text/background pair in use. `src/app/design-tokens.test.ts` reads the hex values from `globals.css` and fails if any pair drops below its minimum. Add the pair there and here before using a new combination.

| Pair | Ratio | AA minimum | Used for |
|---|---|---|---|
| `ink` on `mist` | 12.35:1 | 4.5:1 | body text |
| `ink` on `paper` | 13.84:1 | 4.5:1 | text on cards |
| `ink-muted` on `mist` | 6.01:1 | 4.5:1 | secondary text |
| `ink-muted` on `paper` | 6.74:1 | 4.5:1 | secondary text on cards |
| `rosewood` on `mist` | 10.34:1 | 4.5:1 | text |
| `fiesta-deep` on `mist` | 5.54:1 | 4.5:1 | small red text, button hover |
| `fiesta-deep` on `paper` | 6.20:1 | 4.5:1 | small red text on cards |
| `fiesta` on `mist` | 4.09:1 | 3:1 | large red text, red graphics |
| `white` on `fiesta` | 4.81:1 | 4.5:1 | primary button |
| `white` on `fiesta-deep` | 6.51:1 | 4.5:1 | primary button, hover |
| `white` on `sherwood` | 6.42:1 | 4.5:1 | WhatsApp button |
| `sherwood` on `mist` | 5.46:1 | 3:1 | WhatsApp button edge |
| `mist` on `ink` | 12.35:1 | 4.5:1 | footer text |
| `ink-subtle` on `ink` | 8.32:1 | 4.5:1 | footer secondary text |
| `gold` on `ink` | 6.21:1 | 4.5:1 | footer headings, focus ring on dark |
| `gold` on `rosewood` | 5.20:1 | 4.5:1 | text on rosewood |
| `ink` on `fiesta` | 3.02:1 | 3:1 | focus ring next to a red button |

Not allowed (fails AA): `gold` text on `mist` (1.99:1) or `paper` (2.23:1); `fiesta` small text on `mist` (4.09:1).

The focus ring is a 3px `ink` outline with a 3px offset (12.35:1 on mist), switching to `gold` inside `.surface-dark` containers.

## Type

**Outfit** (Latin, Google Fonts, variable) + **Tajawal** (Arabic), in one stack: `Outfit, Tajawal, system-ui`. Outfit has no Arabic glyphs, so Arabic characters fall through to Tajawal and Latin words inside Arabic text (brand and model names, prices) stay in Outfit.

- **Why Outfit.** Picked from a side-by-side render of the three candidates with Tajawal ([`design/font-pairing.png`](design/font-pairing.png)). Outfit's geometric, round construction and single-storey forms match Tajawal's Kufi-like Arabic best. Albert Sans set wider and looser next to it. Figtree was close but softer, and its heavy weights looked lighter than Tajawal's.
- **Tajawal is scaled to 112%** (`size-adjust`) because at the same font size it reads about 12% smaller than Outfit, which shows on every mixed line ([`design/font-size-adjust.png`](design/font-size-adjust.png)). That needs `next/font/local`, so the Arabic subset of Tajawal (4 weights, about 36 KB) is self-hosted in `src/fonts/tajawal/` under its OFL licence.
- Neither font gets a metric-matched local fallback: on Windows that fallback is Arial, which has Arabic glyphs and would take Arabic text before Tajawal loaded.
- Weights: 400 body, 500/600 UI, 700–800 headings.
- **Arabic rules:** never letter-space Arabic (it breaks joining): pair `tracking-*` with `rtl:tracking-normal`. Give Arabic headings more line height (`rtl:leading-[1.3]`) and a step smaller size, since Arabic words run longer.
- Copy is sentence case, per `frontend-design`. This deliberately differs from the `web-design-guidelines` "Title Case" rule.

## Components (M1)

| Component | File | Notes |
|---|---|---|
| Header | `src/components/site-header.tsx` | Brand mark + name, language switch. Each page milestone adds its nav link, so none point at a 404 |
| Footer | `src/components/site-footer.tsx` | Ink surface, finish strip, service area, WhatsApp link. Bottom padding keeps the WhatsApp button clear |
| Language switch | `src/components/locale-switch.tsx` | Same path in the other locale; link text in the target language with `lang`/`hreflang`; updates the `NEXT_LOCALE` cookie |
| WhatsApp button | `src/components/whatsapp-button.tsx` | Fixed at the inline end (right in English, left in Arabic). Icon-only on phones. `scroll-padding-block-end` keeps focused elements clear of it (tested) |
| Colour chart | `src/components/colour-chart.tsx` | Finish chips; Arabic shows the English name under each |
| `<Bdi>` / `<Ltr>` | `src/components/bdi.tsx` | Isolate prices and names (`Bdi`); force LTR for phone numbers, serials, SKUs, ticket numbers (`Ltr`) |
| `formatMoney` | `src/lib/money.ts` | Integer fils → `AED 12,500` / `12,500 د.إ.`; decimals only when there are fils |
| `formatDate`, `formatDateTime` | `src/lib/datetime.ts` | Asia/Dubai, Gregorian, Western digits |
| `waMeUrl` | `src/lib/whatsapp/wa-me.ts` | E.164 → `https://wa.me/<digits>?text=…` (`%20`-encoded) |

Use these formatters rather than next-intl's `{value, number}` message arguments: next-intl formats with the bare `ar` locale, which browsers render with Arabic-Indic digits.

## Reviews

**axe** (`e2e/a11y.spec.ts`): WCAG 2.0–2.2 A/AA plus best practices on `/en`, `/ar` and both 404 pages, desktop and mobile. No serious or critical issues.

**`web-design-guidelines`** review of M1's UI (`src/app/[locale]/**`, `src/components/**`, `globals.css`), October 2026. Findings fixed in M1:

- hover states added to the brand link, footer link and 404 link;
- `translate="no"` on brand and finish names;
- `touch-action: manipulation` on links and buttons, and an intentional tap-highlight colour;
- `text-balance` on the 404 heading;
- `min-w-0` on the header brand link so long brand names wrap.

Deliberate exceptions:

- `<main tabIndex={-1}>` uses `focus:outline-none`. It is the skip link's target, not a control, and a ring around the whole page body would mislead.
- Sentence case rather than Title Case (see Type).

Everything else passes: skip link, heading order, `aria-hidden` icons, a labelled icon-only button, visible focus, the fixed button never covering focus (tested), `theme-color` matching the background, `color-scheme`, preloaded fonts with `font-display: swap`, `Intl` formatting, and `Accept-Language` detection.
