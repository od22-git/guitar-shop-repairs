import { Outfit } from "next/font/google";
import localFont from "next/font/local";

// Font pairing chosen in M1 from a side-by-side render (docs/design.md): Outfit's
// geometric Latin matches Tajawal's Kufi-like Arabic.

export const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
  // No metric-matched local fallback: on Windows that fallback is Arial, which has
  // Arabic glyphs and would catch Arabic text before it reaches Tajawal.
  adjustFontFallback: false,
  fallback: [],
});

// Tajawal's Arabic subset only (Latin goes to Outfit), self-hosted so it can be scaled:
// at the same font-size Tajawal reads about 12% smaller than Outfit, which shows
// whenever a line mixes the two, e.g. "جيتار Fender Jaguar".
export const tajawal = localFont({
  src: [
    { path: "../fonts/tajawal/tajawal-arabic-400.woff2", weight: "400" },
    { path: "../fonts/tajawal/tajawal-arabic-500.woff2", weight: "500" },
    { path: "../fonts/tajawal/tajawal-arabic-700.woff2", weight: "700" },
    { path: "../fonts/tajawal/tajawal-arabic-800.woff2", weight: "800" },
  ],
  variable: "--font-tajawal",
  display: "swap",
  adjustFontFallback: false,
  fallback: [],
  declarations: [
    { prop: "size-adjust", value: "112%" },
    {
      prop: "unicode-range",
      value:
        "U+0600-06FF, U+0750-077F, U+0870-0891, U+0897-08E1, U+08E3-08FF, U+200C-200E, U+2010-2011, U+204F, U+2E41, U+FB50-FDFF, U+FE70-FE74, U+FE76-FEFC",
    },
  ],
});
