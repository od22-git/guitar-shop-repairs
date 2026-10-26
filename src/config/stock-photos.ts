// Free-licence atmosphere photos from Unsplash, approved by the owner from contact sheets
// (M1b: docs/design/m1b/contact-sheet.jpg; M9a: docs/design/m9a/contact-sheet.jpg). Each is stored in public/images/stock as
// `<key>-<width>.webp`, one file per width in `stockPhotoWidths`, cropped to `aspect`.
// Every entry must also be listed in docs/IMAGE_CREDITS.md (checked by stock-photos.test.ts).
// Alt text lives in messages/{en,ar}.json under "Photos.<key>".

/** The widths each photo is saved at; next.config.ts gives next/image the same list. */
export const stockPhotoWidths = [640, 1280, 1920] as const;

export type StockPhoto = {
  unsplashId: string;
  author: string;
  /** The photographer's Unsplash username, for the credit link. */
  username: string;
  /** Width/height of the saved crop. */
  aspect: readonly [number, number];
};

export const stockPhotos = {
  hero: {
    unsplashId: "6A0YGZjHnhI",
    author: "Dominik Scythe",
    username: "drscythe",
    aspect: [4, 5],
  },
  guitars: {
    unsplashId: "HgXhGxLQL7Q",
    author: "Nestor Mehanikov",
    username: "nestormehanikov",
    aspect: [3, 4],
  },
  pedals: {
    unsplashId: "tVi650LKjYI",
    author: "Luis Morera",
    username: "luismorerat",
    aspect: [3, 4],
  },
  amps: {
    unsplashId: "ItqhAPGc7qM",
    author: "Ksenia Pixelesse",
    username: "pixelesse",
    aspect: [3, 4],
  },
  parts: { unsplashId: "d8FzwoW80H0", author: "byVlado", username: "vlado_", aspect: [3, 4] },
  bench: {
    unsplashId: "j69zgeO8IlI",
    author: "Michel Stockman",
    username: "michelstock",
    aspect: [3, 2],
  },
  strings: {
    unsplashId: "1Pzhr6XPl6k",
    author: "Derek Story",
    username: "derekstory",
    aspect: [2, 1],
  },
  // M9a: the Midtown Gears set, for the redesigned pages (M9b). Shown in black and white
  // where a page calls for it (grayscale), except the blue-lit gig.
  bend: {
    unsplashId: "C7RFkKvThG4",
    author: "Caio Silva",
    username: "caaaaaaaaaio",
    aspect: [3, 2],
  },
  player: {
    unsplashId: "KN6fiY-nCIM",
    author: "Daniel Tafjord",
    username: "danieltafjord",
    aspect: [3, 2],
  },
  gig: { unsplashId: "gioH4gHo0-g", author: "Marcus Neto", username: "marcusneto", aspect: [3, 2] },
  knobs: {
    unsplashId: "BX5LN7QmqvM",
    author: "Isak Photography",
    username: "isak_photography",
    aspect: [2, 3],
  },
  workbench: {
    unsplashId: "ii9TaOZhHwU",
    author: "Juan Pablo Ramirez",
    username: "jpablorato",
    aspect: [3, 2],
  },
  jam: {
    unsplashId: "JK4BYBb5HnQ",
    author: "Jackie Alexander",
    username: "jac_kie_co",
    aspect: [3, 2],
  },
} as const satisfies Record<string, StockPhoto>;

export type StockPhotoKey = keyof typeof stockPhotos;

export const stockPhotoSrc = (key: StockPhotoKey) => `/images/stock/${key}`;

// Unsplash's guidelines ask for these referral parameters on links back to them.
const referral = "utm_source=guitar_shop_repairs&utm_medium=referral";
export const unsplashProfileUrl = (username: string) =>
  `https://unsplash.com/@${username}?${referral}`;
export const unsplashHomeUrl = `https://unsplash.com/?${referral}`;
