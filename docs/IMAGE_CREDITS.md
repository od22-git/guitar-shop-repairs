# Image credits

Every image the site shows that isn't the owner's own photo is listed here: source URL, author, licence. The launch check (M9) fails while any image in `public/` lacks an entry; until then `src/config/stock-photos.test.ts` checks that every stock photo is listed.

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

To replace one with your own photo, save it at the same three widths and aspect ratio under the same key, and move its row to an "Owner's photos" section.

## Not photos (no credit needed)

- WhatsApp glyph (`src/components/whatsapp-icon.tsx`): [Simple Icons](https://simpleicons.org), CC0-1.0. Used only to mark links that open WhatsApp.
- `docs/design/*.png`, `docs/design/m1/*.png`: renders of the site's own fonts and M1 screenshots. Not shown on the site.
- `docs/design/m1b/`: the contact sheet the owner chose from (made from Unsplash previews) and the M1b screenshots. Not shown on the site.
