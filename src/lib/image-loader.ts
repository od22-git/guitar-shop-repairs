"use client";

import { stockPhotoWidths } from "@/config/stock-photos";

// next/image loader (next.config.ts `images.loaderFile`) for stock and product photos,
// which are stored at the same widths. Images are resized when they are added, never at
// request time, so this only picks the stored file for a width: `/images/stock/hero` at
// 1280px is `/images/stock/hero-1280.webp`.
export default function imageLoader({ src, width }: { src: string; width: number }): string {
  const stored = stockPhotoWidths.find((w) => w >= width) ?? stockPhotoWidths.at(-1);
  return `${src}-${stored}.webp`;
}
