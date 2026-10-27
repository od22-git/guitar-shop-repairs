# Image credits

Every image the site shows that isn't the owner's own photo is listed here: source URL, author, licence. The launch check (M18) fails while any image in `public/` lacks an entry; until then `src/config/stock-photos.test.ts` and `src/lib/db/seed.test.ts` check that every stock and sample photo is listed.

Allowed sources: the owner's photos, or free-licence stock from Unsplash or Pexels picked for the palette and approved by the owner from a contact sheet. Never images from other shops, Google Images or social media. See "Images" in [`PLAN.md`](PLAN.md).

## Stock images

The Midtown Gears atmosphere set, picked in October 2026 (M9a) for the bold editorial redesign from [`design/m9a/contact-sheet.jpg`](design/m9a/contact-sheet.jpg); the owner asked Claude to choose. All are under the [Unsplash License](https://unsplash.com/license): free for commercial use, no permission needed. Attribution isn't required, but each page credits the photographers of its photos anyway (`src/components/photo-credits.tsx`). Unsplash+ photos were excluded from the search.

Files are in `public/images/stock/` as `<key>-<width>.webp`, at widths 640, 1280 and 1920. Each was fetched once from Unsplash's image CDN, cropped to the listed aspect ratio (`?w=<width>&h=<height>&fit=crop&fm=webp&q=70`), and each download was registered with Unsplash's download endpoint as their API guidelines ask. The site serves its own copies and never loads images from Unsplash. Photographer, aspect ratio and alt text for each key are in `src/config/stock-photos.ts` and `messages/*.json` (`Photos`). Pages show them in black and white with a CSS filter (the files are the photographers' originals), except `gig`, whose blue light suits the palette.

| Key | Contact sheet | Used for | Source | Author | Aspect |
|---|---|---|---|---|---|
| `bend` | 01 | Home hero | https://unsplash.com/photos/C7RFkKvThG4 | [Caio Silva](https://unsplash.com/@caaaaaaaaaio) | 3:2 |
| `player` | 03 | Home, "Who it’s for" band | https://unsplash.com/photos/KN6fiY-nCIM | [Daniel Tafjord](https://unsplash.com/@danieltafjord) | 3:2 |
| `gig` | 05 | Design system page; later gigs and handover points | https://unsplash.com/photos/gioH4gHo0-g | [Marcus Neto](https://unsplash.com/@marcusneto) | 3:2 |
| `knobs` | 06 | Sell page; later tones | https://unsplash.com/photos/BX5LN7QmqvM | [Isak Photography](https://unsplash.com/@isak_photography) | 2:3 |
| `workbench` | 09 | Home, care prices; repairs page | https://unsplash.com/photos/ii9TaOZhHwU | [Juan Pablo Ramirez](https://unsplash.com/@jpablorato) | 3:2 |
| `jam` | 10 | About page | https://unsplash.com/photos/JK4BYBb5HnQ | [Jackie Alexander](https://unsplash.com/@jac_kie_co) | 3:2 |

The M1b set (`hero`, `guitars`, `pedals`, `amps`, `parts`, `bench`, `strings`, from [`design/m1b/contact-sheet.jpg`](design/m1b/contact-sheet.jpg)) was removed in M9b with the dark look it was picked for.

To replace one with your own photo, save it at the same three widths and aspect ratio under the same key, and move its row to an "Owner's photos" section.

## Sample product photos (development only)

Photos for the sample products that `pnpm db:seed` adds (M2), so the catalog can be built and tested before the owner's own product photos exist. They are not the owner's guitars, so they never appear in the live shop: the products are marked `is_sample`, and the launch check (M9) fails while any remain. Delete the products and this folder before launch. All are under the [Unsplash License](https://unsplash.com/license); Unsplash+ photos were excluded, and none is AI-generated or a 3D render.

Files are in `public/images/samples/` as `<name>-<width>.webp`, at widths 640, 1280 and 1920, cropped to 4:5 by Unsplash's image CDN (`?w=<width>&h=<height>&fit=crop&fm=webp&q=50`). Each download was registered with Unsplash's download endpoint. Each also has a `<name>-og.jpg` link preview (1200×630, the whole photo on a blurred copy of itself), made from the 1920 file by `scripts/sample-og-images.mts`. Names, photographers and the products using each photo are in `src/lib/db/seed.ts` (checked by `src/lib/db/seed.test.ts`).

| Name | Sample product | Source | Author |
|---|---|---|---|
| `strat-sunburst` | Fender Stratocaster, sunburst | https://unsplash.com/photos/nNhMKr0ejIw | [Maksym Pozniak-Haraburda](https://unsplash.com/@maksymp) |
| `les-paul-sunburst` | Gibson Les Paul Standard, tobacco burst | https://unsplash.com/photos/zyBd6u5O5gk | [Chris Hardy](https://unsplash.com/@chrishardyphotography) |
| `les-paul-cherry` | Epiphone Les Paul Standard, cherry flame | https://unsplash.com/photos/OzSAqN4MjNE | [Guilherme Paiva](https://unsplash.com/@guilherme_filipak1607) |
| `tele-tidepool` | Fender Player Telecaster, Tidepool | https://unsplash.com/photos/ZIGI-0Br8Bg | [Krzysztof Hepner](https://unsplash.com/@nsx_2000) |
| `sg-ebony-1` | Epiphone SG Standard, ebony | https://unsplash.com/photos/ZAEEO9OcZ7o | [Amirhossein Hasani](https://unsplash.com/@ah1) |
| `sg-ebony-2` | Epiphone SG Standard, ebony | https://unsplash.com/photos/ct20-KBHHk4 | [Amirhossein Hasani](https://unsplash.com/@ah1) |
| `knobs` | Bell knobs, white, set of 3 (added in M10; also flagged `placeholder_photos`, since the photo shows knobs on a guitar rather than the set itself) | https://unsplash.com/photos/awW9tmVhRhM | [byVlado](https://unsplash.com/@vlado_) |
| `picks` | Strings and picks bundle | https://unsplash.com/photos/ZMMLYu-T_v4 | [Rombo](https://unsplash.com/@rombo_guitar_picks) |
| `cable` | Instrument cable, 3 m | https://unsplash.com/photos/GmfLeibJlS0 | [Brett Jordan](https://unsplash.com/@brett_jordan) |

The M2 `distortion-pedal` and `micro-amp` photos were removed in M10 with their sample products, as the shop no longer has pedal or amp categories. The design-system page shows `knobs` and `cable` instead.

## Stand-in photos for the shop's own products (until the owners' photos exist)

Free-licence photos standing in on the shop's real products until the owners photograph them (M10). **They are not pictures of the product**, so they never present another device as ours: each product using one is flagged `placeholder_photos`, the shop labels the photo "Stand-in photo" on the card and under the gallery, the alt text starts "Stand-in photo", and the launch check (M18) refuses to go public while any flag remains. The home page keeps its "photos coming soon" frame until the NANOCORE's own photo is in. All are under the [Unsplash License](https://unsplash.com/license); Unsplash+ photos were excluded, and none is AI-generated. Picked by Claude in October 2026 (M10) for a scene that says what the product is for without showing any other maker's device.

Files are in `public/images/stand-ins/` as `<name>-<width>.webp` at widths 640, 1280 and 1920, cropped to 4:5 by Unsplash's image CDN (`?w=<width>&h=<height>&fit=crop&fm=webp&q=50`), plus a `<name>-og.jpg` link preview from `scripts/sample-og-images.mts`. Each download was registered with Unsplash's download endpoint. Names and photographers are in `src/lib/db/seed.ts` (`standInPhotos`, checked by `src/lib/db/seed.test.ts`).

| Name | Product | Source | Author |
|---|---|---|---|
| `nanocore-player` | NANOCORE: a guitarist practising with headphones | https://unsplash.com/photos/77xfQCFI2xI | [Brooke Balentine](https://unsplash.com/@brookebalentine) |

The draft NANOCORE footswitch has no photo yet: it can't be published without one, so no stand-in was needed.

To replace a stand-in, upload your own photos in the admin, delete the stand-in, untick "The photos are stand-ins", and delete its files and row here.

## Not photos (no credit needed)

- WhatsApp glyph (`src/components/whatsapp-icon.tsx`): [Simple Icons](https://simpleicons.org), CC0-1.0. Used only to mark links that open WhatsApp.
- `docs/design/*.png`, `docs/design/m1/*.png`: renders of the site's own fonts and M1 screenshots. Not shown on the site.
- `docs/design/m1b/`: the contact sheet the owner chose from (made from Unsplash previews) and the M1b screenshots. Not shown on the site.
- `docs/design/m3/`: screenshots of the catalog with the sample products. Not shown on the site.
- `docs/design/m9a/`: the approved redesign mockups (made from Unsplash previews of the photos above, with grey frames where the owners' product photos will go), the font comparisons, the contact sheet the photos were picked from, and screenshots of the design-system page. Not shown on the site.
- `docs/design/m10/`: screenshots of the NANOCORE pages, the shop, the warranty policy and the admin variant editor, showing the stand-in and sample photos above. Not shown on the site.
