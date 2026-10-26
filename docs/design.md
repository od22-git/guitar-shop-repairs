# Design system

**Midtown Gears, bold editorial** (M9a, October 2026). Tokens live in `src/app/globals.css`, components in `src/components/ui/` and `src/components/wordmark.tsx`, and every token and component is shown in both languages at `/en/design-system` and `/ar/design-system` (not linked, not in the sitemap, `noindex`). This file explains them and records the checks.

M9a built the system; **M9b moves every public page onto it** and then deletes the M1–M8 tokens, fonts and components listed under "Until M9b" at the end.

## Direction

The owners rejected the whole M1b look in October 2026 (generic, template-like, wrong spacing and type), not just its colours. The new direction is **bold editorial**, like the business-plan cover and music-tech brands such as Teenage Engineering and Nothing:

- **Huge black type on white**, lots of white space, big photos. Headings are Archivo Black, set extra wide; the biggest ones are uppercase in Latin.
- **Blue `#1F5BFF` only for highlights**: one word in a heading ("big‑brand", "not Amazon"), the highlight badge, link underlines and the focus ring. Never a button fill, never a background.
- **Structure from rules and numbers, not boxes**: sections are separated by space and 1px black rules; columns open with a black rule and a mono label ("01 / Gear"); prices sit in lists with dotted leaders, like a spec sheet.
- **Photos are big and mostly black and white** (a CSS `grayscale` filter on the atmosphere photos), so the page stays black, white and blue. Product photos sit on `grey-100`.
- One black band per page at most, for a statement ("For players who’d rather spend on the gig than the logo") and the footer.
- Arabic mirrors the layout; photos are never mirrored; the wordmark stays Latin.

The approved mockups (home and product page, en/ar, desktop and mobile) are in [`design/m9a/mockups/`](design/m9a/mockups/). The product photos there are grey frames: the owners' own NANOCORE photos go there. Screenshots of the design-system page: [`design/m9a/`](design/m9a/).

## Colour tokens

Tailwind's default palette is switched off (`--color-*: initial`), so only these exist.

| Token | Hex | Use |
|---|---|---|
| `black` | `#0A0A0A` | Text, dark sections, primary buttons |
| `white` | `#FFFFFF` | The page; text on black and blue |
| `blue` | `#1F5BFF` | Highlights only (see Direction) |
| `grey-100` | `#F2F2F2` | Product photo backgrounds, raised surfaces |
| `grey-300` | `#D4D4D4` | Hairlines and the dotted price leaders. Decorative only: 1.48:1, so never the edge of a control |
| `grey-400` | `#A3A3A3` | Muted text on black |
| `grey-600` | `#5C5C5C` | Muted text on white and `grey-100`; the edge of an unselected option card |
| `grey-800` | `#262626` | Primary button hover |
| `red` | `#C8102E` | Errors only: the message under a field and the field's edge. Errors are always written out too, never shown by colour alone |

Black and blue are the owners' values from the business plan and are pinned by a test. Red isn't in the brief: forms need an error colour, and it is used for nothing else.

## Contrast (WCAG 2.2 AA)

Every text/background pair in use. `src/app/design-tokens.test.ts` reads the hex values from `globals.css` and fails if any pair drops below its minimum. Add the pair there and here before using a new combination.

| Pair | Ratio | AA minimum | Used for |
|---|---|---|---|
| `black` on `white` | 19.80:1 | 4.5:1 | body text and headings |
| `black` on `grey-100` | 17.68:1 | 4.5:1 | text on raised surfaces |
| `grey-600` on `white` | 6.69:1 | 4.5:1 | muted text |
| `grey-600` on `grey-100` | 5.97:1 | 4.5:1 | muted text on raised surfaces |
| `blue` on `white` | 5.25:1 | 4.5:1 | highlighted words |
| `white` on `blue` | 5.25:1 | 4.5:1 | highlight badge |
| `white` on `black` | 19.80:1 | 4.5:1 | primary button; black sections; solid badge |
| `grey-400` on `black` | 7.85:1 | 4.5:1 | muted text on black |
| `white` on `grey-800` | 15.13:1 | 4.5:1 | primary button, hover |
| `black` on `grey-300` | 13.36:1 | 4.5:1 | inverse button, hover |
| `red` on `white` | 5.88:1 | 4.5:1 | error messages |
| `blue` on `white` | 5.25:1 | 3:1 | focus ring |
| `blue` on `black` | 3.77:1 | 3:1 | focus ring on black sections |
| `black` on `white` | 19.80:1 | 3:1 | input and button edges |
| `grey-600` on `white` | 6.69:1 | 3:1 | unselected option card edge |
| `red` on `white` | 5.88:1 | 3:1 | edge of a field with an error |

Not allowed: `blue` text on `black` (3.77:1, large text only, and blue stays off black anyway); `grey-300` for anything that has to be seen (1.48:1); `blue` on `grey-100` for small text (4.69:1 passes, but keep highlights on white).

The focus ring is a 3px `blue` outline with a 3px offset inside `.theme-midtown` (the class that sets the light page; M9b puts it on `<body>`).

## Type

Three families, all from Google Fonts through `next/font` (`src/app/fonts.ts`), in two stacks:

- `font-grotesk`: **Archivo** (Latin, variable weight and width), then **Alexandria** (Arabic).
- `font-mono`: **JetBrains Mono** 500 (Latin), then Alexandria.

Characters a font lacks fall through to the next, so Arabic text is Alexandria and Latin words and digits inside it (NANOCORE, prices) stay in Archivo.

- **Why Archivo.** Picked from a render of five heavy grotesks with the wordmark and tagline ([`design/m9a/fonts-latin.jpg`](design/m9a/fonts-latin.jpg)). Its width axis goes to 125%, so the wordmark and display headings can be extra wide and heavy (the hardware-label look of the references), while body text uses the normal width of the same file.
- **Why Alexandria.** The owners asked for an Arabic font closer to the English one than Tajawal. Of six Arabic fonts rendered next to Archivo ([`design/m9a/fonts-arabic.jpg`](design/m9a/fonts-arabic.jpg)), Alexandria is the closest match: wide, geometric, flat stroke ends, a true Black weight, and readable body text. It replaces Tajawal from M9b.
- **JetBrains Mono** sets the small labels only (section numbers, categories, badges, notes under prices), uppercase and letter-spaced in Latin.
- The three new fonts aren't preloaded until M9b moves the pages onto them.

**Scale** (`--text-*` in `globals.css`; the big sizes scale with the viewport):

| Token | Size | Line height | Font | Use |
|---|---|---|---|---|
| `text-display` | 48–128px | 0.88 (Arabic 1.2) | Archivo Black, 125% wide, uppercase (100% wide on phones) | One statement per page |
| `text-headline` | 36–64px | 0.95 (Arabic 1.3) | Archivo Black, 112.5% wide | Section headings |
| `text-title` | 24–28px | 1.1 (Arabic 1.4) | Archivo ExtraBold, 112.5% wide | Column and card headings |
| `text-lead` | 19–22px | 1.4 | Archivo Regular | Intro under a big heading, max 34 characters a line |
| `text-lg` | 18px | 1.55 | Archivo Regular | Body text, max 60 characters a line |
| `text-label` | 13px (Arabic 14px) | 1.3 | JetBrains Mono 500, uppercase, 0.08em tracking | Labels |

Rules:

- **Never letter-space Arabic** (it breaks joining): every `tracking-*` has `rtl:tracking-normal`, built into the components.
- Arabic headings get more line height (built into `Heading`); Arabic display text isn't uppercase (it has no case).
- Prices and numbers use tabular figures; money only through `formatMoney`, in `<Price>`.
- Sentence case for headings and buttons in English; the uppercase display and labels are a style (`uppercase`), not typed in capitals, so screen readers read words, not letters.

## Grid and spacing

- **Grid**: 12 columns on wide screens, 4 on phones (`Grid`), with 24px gutters (16px on phones).
- **Page margins**: 48px (`--spacing-gutter`), 20px on phones, up to a 1600px-wide page (`Container`).
- **Sections**: 120px apart (`--spacing-section`), 80px on phones (`Section`). Inside a section: label to heading 16–24px, heading to content 48–64px.
- **Rhythm**: everything on a 4px grid; components use Tailwind's spacing scale.
- **Layouts** used by the mockups:
  - *Hero*: the display heading across the full width, then a 4-column intro (lead + two buttons) next to a 7-column photo.
  - *Index*: three 4-column `RuledColumn`s, each "01 / Name", a title, a line, a link.
  - *Feature*: a 7-column product photo on `grey-100` next to a 5-column column of name, line and `PriceList`.
  - *Split*: a 5-column photo next to a 6-column heading and `PriceList`.
  - *Statement*: a black `Section` with a mono label, a display heading of at most 15 characters a line, and a full-width photo.
  - On phones every layout is one column; the hero photo comes before the intro.

## Components

M9a components, in `src/components/ui/` unless noted. All are server components, use logical properties only, and work in both directions.

| Component | File | Notes |
|---|---|---|
| `Wordmark` | `src/components/wordmark.tsx` | "MIDTOWN GEARS" from `brand.wordmark`: Archivo Black at 125% width. Always `dir="ltr"` and `translate="no"`; takes the text colour; size it with a `text-*` class |
| `Heading` | `text.tsx` | `level` (`display`, `headline`, `title`) sets the look, `as` the element, so the outline stays right |
| `Lead`, `Highlight`, `Label`, `Eyebrow` | `text.tsx` | Intro paragraph; a blue word in a heading; the mono label; "01 / Gear" above a heading |
| `buttonClass`, `Arrow` | `button.tsx` | `primary` (black), `secondary` (outlined), `inverse` (white on black sections); 56px tall (52px on phones), square, 2px edge. `{ block: true }` for full width with the arrow at the far end. The arrow flips in Arabic |
| `Badge` | `badge.tsx` | `highlight` (white on blue), `outline`, `solid` (white on black). Mono, uppercase. The text must make sense without the colour |
| `Price` | `price.tsx` | AED via `formatMoney`, tabular, isolated with `<Bdi>`; sizes `sm`, `md`, `lg`; struck-through old price with "Was …" for screen readers; a `prefix` for add-ons ("+AED 50", and "+50 د.إ." kept together in Arabic) |
| `ProductCard` | `product-card.tsx` | A 4:5 photo on `grey-100` (zooms slightly on hover, not with reduced motion), title, one detail line, price; a badge on the photo's top inline-start corner; `muted` greys a sold item's photo. Presentational: M9b maps the catalog DTOs onto it |
| `Field`, `inputClass`, `selectClass`, `fieldProps` | `field.tsx` | Square fields, 1px black edge, 52px tall, 16px text. Label above, hint and error below, tied with `aria-describedby`; an error sets `aria-invalid`, a 2px red edge and a written message |
| `Checkbox` | `field.tsx` | A native tick box with its label and an optional detail line |
| `OptionCard` | `field.tsx` | A radio (or tick box) as a card with a name, detail and price: the bundle picker and add-ons. The chosen card gets a 2px black edge via CSS `:has(:checked)`, no script; the focus ring goes round the card |
| `Container`, `Grid`, `Section`, `RuledColumn` | `layout.tsx` | Page margins, the column grid, a section's spacing (`tone="dark"` for the black band), a column opening with a black rule |
| `PriceList`, `PriceRow` | `layout.tsx` | Name … price rows with a dotted leader: bundles, service prices, specs |
| `SocialLinks` | `src/components/social-links.tsx` | Instagram and TikTok from `brand.social`; each shows only once its handle is set (in the footer now; M9b adds Contact) |

Kept from M1–M8 and restyled in M9b: `Bdi`/`Ltr`, `FillPhoto`/`StockPhoto` (photos never mirrored), `PhotoCredits` (now with a `light` tone), `LocaleSwitch`, `ProductGallery`, `CatalogControls`, `WhatsAppButton`, `fieldProps`.

## Photos

Atmosphere photos are free-licence Unsplash stock picked from contact sheets; sources and authors are in [`IMAGE_CREDITS.md`](IMAGE_CREDITS.md). The M9a set (`bend`, `player`, `gig`, `knobs`, `workbench`, `jam`) was chosen from [`design/m9a/contact-sheet.jpg`](design/m9a/contact-sheet.jpg); the owners left the pick to Claude. Two candidates were dropped because another brand's logo was their subject. Pages show them in black and white with Tailwind's `grayscale`, except `gig`, whose blue light already fits.

To add one: save it under `public/images/stock/<key>-<width>.webp` at each width in `stockPhotoWidths`, cropped to one aspect ratio; add the key to `src/config/stock-photos.ts`, alt text to `messages/*.json` (`Photos.<key>`) and a row to `IMAGE_CREDITS.md`. `src/config/stock-photos.test.ts` fails if any of these is missing or a file's size doesn't match. Alt text is written per photo (Unsplash's own descriptions are often wrong) and translated.

Product photos are always the owners' own. Until they exist, product pages use Unsplash stand-ins flagged `placeholder_photos` (M10); the launch check refuses them.

## Brand

`src/config/brand.ts`: the name ("Midtown Gears", Arabic ميدتاون جيرز for Arabic running text), the wordmark, the tagline ("Big tone, no big-brand tax." / "صوت كبير، بلا ضريبة الماركات."), the location ("UAE"; the workshop address is never published) and the Instagram and TikTok handles, which are unset until the owners create the accounts (`docs/OWNER-TODO.md`), so their links stay hidden.

## Until M9b: the M1–M8 look

The pages still use the M1b dark look until M9b moves them: `ink`, `rosewood`, `mist`, `paper`, `fiesta`, `gold`, `sherwood` and the `ink-*` tokens, the Outfit + Tajawal stack (`font-sans`), and the M1–M8 components (`PriceTag`'s swing tag, the old `ProductCard`, `form-parts.tsx`'s classes). Their contrast pairs are still checked (`legacyPairs` in `design-tokens.test.ts`). M9b deletes all of them with their tests, switches `<body>` to `.theme-midtown`, preloads the new fonts and gives the admin the new tokens and wordmark. Screenshots of the old look: [`design/m1b/`](design/m1b/), [`design/m3/`](design/m3/) to [`design/m8a/`](design/m8a/).

## Reviews

**M9a.** axe (`e2e/a11y.spec.ts`) runs on `/en/design-system` and `/ar/design-system`, desktop and mobile: no serious or critical issues. `e2e/design-system.spec.ts` checks the wordmark stays LTR and untranslated in Arabic, option cards behave as radios, the error field's `aria-invalid` and description, no horizontal overflow on phones, the page's `noindex` and its absence from the sitemap, and that no social links show while the handles are unset. A `web-design-guidelines` pass over the new components: labels on every field, `fieldset`/`legend` round the option cards, errors in words, 44px+ targets, visible focus on the option cards (`:has(:focus-visible)`), reduced motion respected on the card hover, `translate="no"` on the wordmark and brand names, tabular figures on prices, no letter-spacing in Arabic.

*Earlier reviews (M1–M8 look)* are in the git history of this file (M1b, M3).
