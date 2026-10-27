# Owner to-do

Everything the site needs from you (the partners) before or around launch. Each item shows the default the site uses until you decide, and the milestone that needs it (see [`PLAN.md`](PLAN.md)). Tick items off as they're done. Every milestone that adds a default or placeholder adds a line here, and the M18 launch check lists what's still open.

## Brand and accounts

- [ ] **Instagram handle.** Default: none, so the link is hidden. Send it once the account exists; it goes in `src/config/brand.ts` and the link appears in the footer and on Contact.
- [ ] **TikTok handle.** Default: none, so the link is hidden. Same as Instagram.
- [ ] **Custom domain.** Default: `guitar-shop-repairs.vercel.app`. Needed by M18 (buy it any time; switching is a settings change).
- [ ] **Trade licence**, under the name "Midtown Gears". Stripe, Tabby and public selling all need it. Needed by M18. **Apply now.**
- [ ] **Stripe account.** Needs the licence. Test mode is used until then. Needed by M13 (test) and M18 (live).
- [ ] **Tabby merchant account.** Status: to be decided. Tabby asks for the buyer's email and phone and may restrict some product categories, so check at onboarding. Test keys are needed for M14; without them, Stripe ships alone and Tabby moves to its own milestone.
- [ ] **WhatsApp Business number** (a dedicated SIM or eSIM). Default: the placeholder `+971500000000`, which the launch check refuses. Needed by M18.

## Photos and audio

- [ ] **NANOCORE photos (your own).** Default since M10: one Unsplash stand-in (a guitarist practising with headphones, not the device), flagged `placeholder_photos` and labelled "Stand-in photo" in the shop; the launch check refuses it, and the home page keeps its grey "photos coming soon" frame until your own are in. Upload yours in the admin, delete the stand-in and untick "The photos are stand-ins". Shot list: [`photo-shot-list.md`](photo-shot-list.md). Needed by M18.
- [ ] **Footswitch and parts/knobs photos (your own).** Default: none. The footswitch is a draft (it can't be published without a photo and a price); the knobs in the shop are a development sample. Needed when they launch.
- [x] **Approve the redesign mockups** (home + product page, bold editorial) **and the atmosphere photos** (Unsplash contact sheet). Done in M9a: mockups approved, Arabic font changed to Alexandria at your request, photos left to Claude.
- [ ] **Approve the redesigned pages.** Screenshots of every page, en and ar, desktop and mobile, are in [`design/m9b/`](design/m9b/). The site already runs on them (M9b); send changes and they go into the next milestone.
- [ ] **Check the NANOCORE pages** (M10): the bundle picker, "In the box", the warranty and the five checks, the stand-in photo labels and the warranty policy. Screenshots, en and ar, desktop and mobile, are in [`design/m10/`](design/m10/). Send changes and they go into the next milestone.
- [ ] **Tone demo recordings** for Signature Packs and product pages. Default: placeholder audio. Needed by M16.

## Services and delivery

- [ ] **Drop-off slots.** Default: Tue and Thu 18:00–20:00, Sat 10:00–13:00, in 30-minute slots. Needed by M12.
- [ ] **Pickup days.** Default: Wed and Sat. Needed by M12.
- [ ] **Weekly capacity** (setups + tone builds). Default: 8 jobs a week. Needed by M12.
- [ ] **Service prices** (confirm). Default: the business plan's tiers.

  | Service | AED |
  |---|---|
  | Fresh Strings | 60–80 |
  | Basic setup | 150 |
  | Full setup | 250 |
  | Gig Ready | 300–350 |
  | Repairs and mods | Quoted |

  Needed by M12.
- [ ] **Summer Check-up**: when it runs and the offer. Default: switched off. Needed by M12.
- [ ] **Gig and jam handover points.** Default: none, so the option is hidden. Needed by M13.
- [ ] **Free-delivery threshold.** Default: free from AED 299, so every bundle ships free, as the unit economics assume. Needed by M13.
- [ ] **Delivery zone fees** (confirm). Default: RAK AED 20, Dubai and Northern Emirates AED 35, Abu Dhabi AED 45. Needed by M13.

## Products and tones

- [ ] **Bundle prices** (confirm). Default:

  | Product | AED |
  |---|---|
  | Device only | 200 |
  | Starter Bundle | 299 |
  | Custom Tone Bundle | 349 |
  | Extra custom tone | +50 |

  Since M10 they are the NANOCORE product's variants (Admin → Products → NANOCORE → Variants) and the "Extra custom tone" add-on product; the home page and the product page read them from there. "Our pick" is the Starter Bundle. Confirm by M18.
- [ ] **NANOCORE stock.** Default: 10 units (the launch batch in the business plan). Change it with Restock or Mark sold in the admin. Needed by M18.
- [ ] **What's in the NANOCORE box.** Default: "The NANOCORE" and "A cable" (as the design system's bundle card said). Edit "In the box" on the product. Needed by M18.
- [ ] **The five checks** every device goes through ("Tested by us" on the product page). Default: powers on and charges; every socket works; knobs, buttons and screen respond; latest firmware; played through headphones and an amp. Text in `messages/*.json` (`Product.tested`). Needed by M18.
- [ ] **Warranty length on devices.** Default: 6 months, from `src/config/policies.ts`; the home page, About, product pages and the warranty policy (`/policies/warranty`, M10) quote it. Needed by M18.
- [ ] **Footswitch price and landed cost.** Default: the draft "NANOCORE footswitch" (M10) with no price, stock or photo, so it can't be published, and the empty Footswitches category stays out of the shop menu. Needed when footswitches launch.
- [ ] **Signature Pack names and their tones.** Default: Thrash, Prog Metal, Blues, marked placeholder. Needed by M16.
- [ ] **Extra tweak-round fee.** Default: AED 25, editable. Needed by M15.
- [ ] **Included tweak rounds.** Default: 3 (`toneRounds` in `src/config/policies.ts`; the FAQ quotes it from M9b). Needed by M15.
- [ ] **Tone turnaround promise.** Default: 3–5 days after confirmation. Needed by M15.

## Reviews

- [ ] **Policies:** terms, privacy, returns, delivery, repair terms, and the warranty (drafted in M10: covers faults in new devices and accessories for 6 months from delivery, repair or replace or refund, courier both ways paid by us, excludes drops, liquid, opened or modified items, wear, consumables and used gear). They are drafts; you (and ideally a lawyer) should review them. Needed by M18.
- [ ] **Arabic copy review** across the site, including the copy rewritten in M9b. Needed by M18.
