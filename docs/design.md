# Design system

Set up in M1. Tokens live in `src/app/globals.css`; this file explains them and records the checks.

## Direction

**M1b: a photo-led shop, dark and warm like a guitar shop at night.** The owner rejected M1's colour-chart concept and layout (October 2026) but kept the tokens and fonts. The site is now dark: `ink` is the page and `rosewood` carries the warm sections and the footer, so photos of guitars, amps and the bench sit on surfaces close to their own shadows. The one bold element is the photography's scale: the hero guitar runs off the inline-end edge of the screen, and the four category photos hang at staggered heights like guitars on a shop wall. Everything else is quiet: one sans-serif family per script, gold for headings and link underlines, Fiesta Red only for the main buttons. The colour-chart card, the footer finish strip and the chip brand mark are gone; the brand is plain text until the owner has a logo.

Photos are never mirrored for Arabic: the layout flips (the hero photo sits on the left), the pictures don't. Text never sits directly on a photo; where a photo is a background (the "Drop-off by appointment" band), the text is on a solid `ink` panel.

Screenshots (en/ar, desktop and mobile): [`design/m1b/`](design/m1b/).

**M3: the catalog.** Product photos are the shop window, so the shop grid and product pages are quiet: photos at 4:5, title, condition, nothing else on the card. The one bold element is the **swing tag**, a `paper` price tag like the ones hung on guitars in a shop: notched at the inline start with a string hole, hung at a slight angle over the photo's corner. It carries the price, a struck-through old price after a price drop, and the state ("On hold" in `fiesta-deep`; "Sold" or "Sold out" instead of a price). Sold items stay in the grid, last, with their photo greyed, as proof that things sell. The tag flips for Arabic (notch and hole on the right); photos never do. Filters sit in a sidebar on wide screens and fold behind a "Filters" button on phones. Screenshots: [`design/m3/`](design/m3/).

*M1 (superseded):* a 1960s factory colour-chart card, a finish strip on the footer and a three-chip brand mark on a light `mist` page. Screenshots in [`design/m1/`](design/m1/).

## Colour tokens

Tailwind's default palette is switched off (`--color-*: initial`), so only these exist.

| Token | Hex | Finish | Use |
|---|---|---|---|
| `mist` | `#E6EEF1` | Sonic Blue (mist) | Text on dark surfaces; light surfaces (forms, later) |
| `paper` | `#F7FAFB` | — | The swing price tag; raised light surfaces |
| `ink` | `#13294B` | Lake Placid Blue (deep) | The page; text on light surfaces |
| `ink-muted` | `#46597A` | — | Secondary text on mist/paper |
| `ink-subtle` | `#B7C6D3` | — | Secondary text on ink and rosewood |
| `fiesta` | `#D2383A` | Fiesta Red | Primary button fill (white text) |
| `fiesta-deep` | `#B3262A` | Fiesta Red (deep) | Small red text; button hover |
| `gold` | `#C8A55A` | Shoreline Gold | Headings, link underlines and the focus ring on dark; **never text on light** |
| `rosewood` | `#4A2F27` | Rosewood | Warm dark surfaces: sections, footer |
| `sherwood` | `#1E6B4F` | Sherwood Green | The WhatsApp button |
| `white` | `#FFFFFF` | — | Text on fiesta and sherwood |

**Tuning done in M1.** The five plan colours are kept as given. Fiesta Red reaches only 4.09:1 on mist, so it's used for fills, large text and graphics, and `fiesta-deep` was added for small red text. Shoreline Gold is 1.99:1 on mist, so it never carries text on light backgrounds. Sherwood Green, another period finish, was added for the WhatsApp button: customers expect a green WhatsApp button, and WhatsApp's own green fails with white text (about 2:1).

## Contrast (WCAG 2.2 AA)

Every text/background pair in use. `src/app/design-tokens.test.ts` reads the hex values from `globals.css` and fails if any pair drops below its minimum. Add the pair there and here before using a new combination.

| Pair | Ratio | AA minimum | Used for |
|---|---|---|---|
| `mist` on `ink` | 12.35:1 | 4.5:1 | body text |
| `ink-subtle` on `ink` | 8.32:1 | 4.5:1 | secondary text |
| `gold` on `ink` | 6.21:1 | 4.5:1 | headings, link underlines, focus ring |
| `mist` on `rosewood` | 10.34:1 | 4.5:1 | text on rosewood |
| `ink-subtle` on `rosewood` | 6.97:1 | 4.5:1 | secondary text on rosewood |
| `gold` on `rosewood` | 5.20:1 | 4.5:1 | headings and focus ring on rosewood |
| `white` on `fiesta` | 4.81:1 | 4.5:1 | primary button |
| `white` on `fiesta-deep` | 6.51:1 | 4.5:1 | primary button, hover |
| `fiesta` on `ink` | 3.02:1 | 3:1 | primary button edge on the page |
| `white` on `sherwood` | 6.42:1 | 4.5:1 | WhatsApp button |
| `mist` on `rosewood` | 10.34:1 | 3:1 | WhatsApp button ring (and on ink, 12.35:1) |
| `ink` on `mist` | 12.35:1 | 4.5:1 | skip link |
| `ink` on `paper` | 13.84:1 | 4.5:1 | swing tag price; light surfaces |
| `ink-muted` on `mist` | 6.01:1 | 4.5:1 | secondary text on light surfaces (later) |
| `ink-muted` on `paper` | 6.74:1 | 4.5:1 | swing tag: struck-through old price |
| `fiesta-deep` on `mist` | 5.54:1 | 4.5:1 | small red text on light surfaces (later) |
| `fiesta-deep` on `paper` | 6.20:1 | 4.5:1 | swing tag: On hold, Sold, Sold out |

Not allowed (fails AA): `gold` text on `mist` (1.99:1) or `paper` (2.23:1); `fiesta` small text on anything; `fiesta` buttons on `rosewood` (edge 2.53:1). The green WhatsApp button has only 2.26:1 against `ink`, so it carries a 2px `mist` ring.

The focus ring is a 3px `gold` outline with a 3px offset, switching to `ink` inside `.surface-light` containers (for the light forms and cards of later milestones).

## Type

**Outfit** (Latin, Google Fonts, variable) + **Tajawal** (Arabic), in one stack: `Outfit, Tajawal, system-ui`. Outfit has no Arabic glyphs, so Arabic characters fall through to Tajawal and Latin words inside Arabic text (brand and model names, prices) stay in Outfit.

- **Why Outfit.** Picked from a side-by-side render of the three candidates with Tajawal ([`design/font-pairing.png`](design/font-pairing.png)). Outfit's geometric, round construction and single-storey forms match Tajawal's Kufi-like Arabic best. Albert Sans set wider and looser next to it. Figtree was close but softer, and its heavy weights looked lighter than Tajawal's.
- **Tajawal is scaled to 112%** (`size-adjust`) because at the same font size it reads about 12% smaller than Outfit, which shows on every mixed line ([`design/font-size-adjust.png`](design/font-size-adjust.png)). That needs `next/font/local`, so the Arabic subset of Tajawal (4 weights, about 36 KB) is self-hosted in `src/fonts/tajawal/` under its OFL licence.
- Neither font gets a metric-matched local fallback: on Windows that fallback is Arial, which has Arabic glyphs and would take Arabic text before Tajawal loaded.
- Weights: 400 body, 500/600 UI, 700–800 headings.
- **Arabic rules:** never letter-space Arabic (it breaks joining): pair `tracking-*` with `rtl:tracking-normal`. Give Arabic headings more line height (`rtl:leading-[1.3]`) and a step smaller size, since Arabic words run longer.
- Copy is sentence case, per `frontend-design`. This deliberately differs from the `web-design-guidelines` "Title Case" rule.

## Components

| Component | File | Notes |
|---|---|---|
| Header | `src/components/site-header.tsx` | Brand name and location as text, language switch. Each page milestone adds its nav link, so none point at a 404 |
| Footer | `src/components/site-footer.tsx` | Rosewood surface, service area, WhatsApp link. Bottom padding keeps the WhatsApp button clear |
| Language switch | `src/components/locale-switch.tsx` | Same path in the other locale; link text in the target language with `lang`/`hreflang`; updates the `NEXT_LOCALE` cookie |
| WhatsApp button | `src/components/whatsapp-button.tsx` | Fixed at the inline end (right in English, left in Arabic). Icon-only on phones. `scroll-padding-block-end` keeps focused elements clear of it (tested) |
| `FillPhoto` | `src/components/fill-photo.tsx` | `next/image` filling a sized parent, used by `StockPhoto` and the product photos |
| `PriceTag` | `src/components/price-tag.tsx` | The swing tag: price, old price (struck, with "Was …" for screen readers), hold/sold state |
| `ProductCard` | `src/components/product-card.tsx` | One link per product; photo `alt=""` because the title names it; title comes first in the DOM so the link reads title, condition, price |
| `CatalogControls` | `src/components/catalog-controls.tsx` | Filter and sort form around the server-rendered results. Changes replace the URL and the server re-renders; a plain GET form without JavaScript. Results count is a live region |
| `ProductGallery` | `src/components/product-gallery.tsx` | Scroll-snap strip: swipe, arrow keys once focused, buttons and thumbnails. Follows the page direction, so the next photo comes from the left in Arabic; only the chevrons are mirrored |
| `SiteNav` | `src/components/site-nav.tsx` | Header links with `aria-current` |
| `StockPhoto` | `src/components/stock-photo.tsx` | `next/image` filling a sized parent (no layout shift), lazy unless `eager`. Files are pre-sized at 640/1280/1920px; the custom loader (`src/lib/image-loader.ts`) picks one, so there's no runtime image optimisation |
| `PhotoCredits` | `src/components/photo-credits.tsx` | "Photos by … on Unsplash" for the photos on a page, from `src/config/stock-photos.ts` |
| `<Bdi>` / `<Ltr>` | `src/components/bdi.tsx` | Isolate prices and names (`Bdi`); force LTR for phone numbers, serials, SKUs, ticket numbers (`Ltr`) |
| `formatMoney` | `src/lib/money.ts` | Integer fils → `AED 12,500` / `12,500 د.إ.`; decimals only when there are fils |
| `formatDate`, `formatDateTime` | `src/lib/datetime.ts` | Asia/Dubai, Gregorian, Western digits |
| `waMeUrl` | `src/lib/whatsapp/wa-me.ts` | E.164 → `https://wa.me/<digits>?text=…` (`%20`-encoded) |

## Photos

Atmosphere photos are free-licence Unsplash stock chosen by the owner from a contact sheet ([`design/m1b/contact-sheet.jpg`](design/m1b/contact-sheet.jpg)); sources and authors are in [`IMAGE_CREDITS.md`](IMAGE_CREDITS.md). To add one: save it under `public/images/stock/<key>-<width>.webp` at each width in `stockPhotoWidths`, cropped to one aspect ratio; add the key to `src/config/stock-photos.ts`, alt text to `messages/*.json` (`Photos.<key>`) and a row to `IMAGE_CREDITS.md`. `src/config/stock-photos.test.ts` fails if any of these is missing or a file's size doesn't match. Alt text is written per photo (Unsplash's own descriptions are often wrong) and translated.

Use these formatters rather than next-intl's `{value, number}` message arguments: next-intl formats with the bare `ar` locale, which browsers render with Arabic-Indic digits.

## Reviews

**axe** (`e2e/a11y.spec.ts`): WCAG 2.0–2.2 A/AA plus best practices on `/en`, `/ar` and both 404 pages, desktop and mobile. No serious or critical issues (re-run in M1b).

**`web-design-guidelines`** review of M1b's UI (`src/app/[locale]/**`, `src/components/**`, `globals.css`, `messages/en.json`), October 2026. Fixed in M1b: straight apostrophes in English copy changed to ’; `text-balance` on every heading. Passes: alt text on every photo, `fetchpriority="high"` on the hero and lazy loading below the fold, `color-scheme: dark` and `theme-color` matching the page, hover states on every link and button, `translate="no"` on brand and photographer names, the fixed button never covering focus (tested).

**`web-design-guidelines`** review of M3's UI (shop, product and FAQ pages, the new components, `messages/*.json`), October 2026. Fixed in M3: loading text ends with "…"; a no-break space before "kg"; the price selects shrink to the sidebar instead of overflowing. Passes: labelled icon buttons (gallery arrows, thumbnails); every filter in a `<label>`, groups in `<fieldset>`; filters and sort reflected in the URL; real links for all navigation; native selects styled for the dark theme; `translate="no"` on brand names; reduced motion respected by the gallery; `overscroll-x-contain` on the photo strip; prices in `tabular-nums`. axe runs on the shop, a filtered and an empty result, three product pages and the FAQ in both languages.

Deliberate exceptions:

- Photos use `next/image` with `fill`, so the `<img>` has no `width`/`height` attributes; each sits in a parent with a fixed aspect ratio, so nothing shifts as they load.
- `<main tabIndex={-1}>` and the shop's results count use `focus:outline-none`. They are focus targets (the skip link; "Show results" on phones), not controls, and a ring around them would mislead.
- Sentence case rather than Title Case (see Type), and "we" in copy: it's a one-person shop talking to customers.

*M1 review (superseded layout):* hover states, `translate="no"`, `touch-action: manipulation`, tap-highlight colour and `min-w-0` on the header link were added then; all still apply.
