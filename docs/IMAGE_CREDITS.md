# Image credits

Every image the site shows that isn't the owner's own photo is listed here: source URL, author, licence. The launch check (M9) fails while any image in `public/` lacks an entry; until then `src/config/stock-photos.test.ts` and `src/lib/db/seed.test.ts` check that every stock and sample photo is listed.

Allowed sources: the owner's photos, or free-licence stock from Unsplash or Pexels picked for the palette and approved by the owner from a contact sheet. Never images from other shops, Google Images or social media. See "Images" in [`PLAN.md`](PLAN.md).

## Stock images

The M1b atmosphere set, approved by the owner from [`design/m1b/contact-sheet.jpg`](design/m1b/contact-sheet.jpg) (numbers 01–07) in October 2026. All are under the [Unsplash License](https://unsplash.com/license): free for commercial use, no permission needed. Attribution isn't required, but the home page credits each photographer anyway (`src/components/photo-credits.tsx`). Unsplash+ photos were excluded from the search.

Files are in `public/images/stock/` as `<key>-<width>.webp`, at widths 640, 1280 and 1920. Each was fetched once from Unsplash's image CDN, cropped to the listed aspect ratio (`?w=<width>&h=<height>&fit=crop&fm=webp&q=70`), and each download was registered with Unsplash's download endpoint as their API guidelines ask. The site serves its own copies and never loads images from Unsplash. Photographer, aspect ratio and alt text for each key are in `src/config/stock-photos.ts` and `messages/*.json` (`Photos`).

| Key | Used for | Source | Author | Aspect |
|---|---|---|---|---|
| `hero` | Home hero | https://unsplash.com/photos/6A0YGZjHnhI | [Dominik Scythe](https://unsplash.com/@drscythe) | 4:5 |
| `guitars` | Home, "Electric guitars" | https://unsplash.com/photos/HgXhGxLQL7Q | [Nestor Mehanikov](https://unsplash.com/@nestormehanikov) | 3:4 |
| `pedals` | Home, "Pedals" | https://unsplash.com/photos/tVi650LKjYI | [Luis Morera](https://unsplash.com/@luismorerat) | 3:4 |
| `amps` | Home, "Amps" | https://unsplash.com/photos/ItqhAPGc7qM | [Ksenia Pixelesse](https://unsplash.com/@pixelesse) | 3:4 |
| `parts` | Home, "Parts and accessories" | https://unsplash.com/photos/d8FzwoW80H0 | [byVlado](https://unsplash.com/@vlado_) | 3:4 |
| `bench` | Home, repairs section | https://unsplash.com/photos/j69zgeO8IlI | [Michel Stockman](https://unsplash.com/@michelstock) | 3:2 |
| `strings` | Home, "Drop-off by appointment" band | https://unsplash.com/photos/1Pzhr6XPl6k | [Derek Story](https://unsplash.com/@derekstory) | 2:1 |

### M9a set (Midtown Gears)

Picked in October 2026 for the bold editorial redesign from [`design/m9a/contact-sheet.jpg`](design/m9a/contact-sheet.jpg); the owner asked Claude to choose. Same licence, files and process as above. Shown in black and white with a CSS filter where a page calls for it (the files are the photographers' originals), except `gig`, whose blue light suits the palette.

| Key | Contact sheet | Used for | Source | Author | Aspect |
|---|---|---|---|---|---|
| `bend` | 01 | Home hero (M9b) | https://unsplash.com/photos/C7RFkKvThG4 | [Caio Silva](https://unsplash.com/@caaaaaaaaaio) | 3:2 |
| `player` | 03 | "Who it’s for" band | https://unsplash.com/photos/KN6fiY-nCIM | [Daniel Tafjord](https://unsplash.com/@danieltafjord) | 3:2 |
| `gig` | 05 | Gigs and handover points | https://unsplash.com/photos/gioH4gHo0-g | [Marcus Neto](https://unsplash.com/@marcusneto) | 3:2 |
| `knobs` | 06 | Tones | https://unsplash.com/photos/BX5LN7QmqvM | [Isak Photography](https://unsplash.com/@isak_photography) | 2:3 |
| `workbench` | 09 | Care and services | https://unsplash.com/photos/ii9TaOZhHwU | [Juan Pablo Ramirez](https://unsplash.com/@jpablorato) | 3:2 |
| `jam` | 10 | Community, jams | https://unsplash.com/photos/JK4BYBb5HnQ | [Jackie Alexander](https://unsplash.com/@jac_kie_co) | 3:2 |

The M1b set above stays until M9b moves the pages to this one.

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
| `distortion-pedal` | MXR Custom Badass '78 Distortion | https://unsplash.com/photos/dxGObwcMJ0A | [Oscar Ivan Esquivel Arteaga](https://unsplash.com/@oscaresquivel) |
| `micro-amp` | Marshall MS-2 micro amp | https://unsplash.com/photos/9-79QZ3eBZM | [Morris Pinedo Michelsen](https://unsplash.com/@mpinedomichelsen) |
| `picks` | Strings and picks bundle | https://unsplash.com/photos/ZMMLYu-T_v4 | [Rombo](https://unsplash.com/@rombo_guitar_picks) |
| `cable` | Instrument cable, 3 m | https://unsplash.com/photos/GmfLeibJlS0 | [Brett Jordan](https://unsplash.com/@brett_jordan) |

## Not photos (no credit needed)

- WhatsApp glyph (`src/components/whatsapp-icon.tsx`): [Simple Icons](https://simpleicons.org), CC0-1.0. Used only to mark links that open WhatsApp.
- `docs/design/*.png`, `docs/design/m1/*.png`: renders of the site's own fonts and M1 screenshots. Not shown on the site.
- `docs/design/m1b/`: the contact sheet the owner chose from (made from Unsplash previews) and the M1b screenshots. Not shown on the site.
- `docs/design/m3/`: screenshots of the catalog with the sample products. Not shown on the site.
- `docs/design/m9a/`: the approved redesign mockups (made from Unsplash previews of the photos above, with grey frames where the owners' product photos will go), the font comparisons, the contact sheet the photos were picked from, and screenshots of the design-system page. Not shown on the site.
