// Free-licence atmosphere photos from Unsplash, picked from a contact sheet
// (docs/design/m9a/contact-sheet.jpg). Each is stored in public/images/stock as
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
  // The Midtown Gears set (M9a). Shown in black and white (grayscale), except the
  // blue-lit gig.
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
