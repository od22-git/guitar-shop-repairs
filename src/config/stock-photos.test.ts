import { readdirSync, readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import ar from "../../messages/ar.json";
import en from "../../messages/en.json";
import imageLoader from "../lib/image-loader";
import { webpSize } from "../test/webp";
import { stockPhotos, stockPhotoSrc, stockPhotoWidths, type StockPhotoKey } from "./stock-photos";

const dir = new URL("../../public/images/stock/", import.meta.url);
const keys = Object.keys(stockPhotos) as StockPhotoKey[];

describe("stock photos", () => {
  // Heights are rounded down, so a 3:4 photo 640 wide is 853 high.
  it("are stored at every width, cropped to their aspect ratio", () => {
    for (const key of keys) {
      const [w, h] = stockPhotos[key].aspect;
      for (const width of stockPhotoWidths) {
        const size = webpSize(readFileSync(new URL(`${key}-${width}.webp`, dir)));
        expect(size, `${key}-${width}.webp`).toEqual({
          width,
          height: Math.floor((width * h) / w),
        });
      }
    }
  });

  it("are the only files in public/images/stock", () => {
    const expected = keys.flatMap((key) => stockPhotoWidths.map((w) => `${key}-${w}.webp`));
    expect(readdirSync(dir).sort()).toEqual(expected.sort());
  });

  it("are each credited in docs/IMAGE_CREDITS.md", () => {
    const credits = readFileSync(new URL("../../docs/IMAGE_CREDITS.md", import.meta.url), "utf8");
    for (const key of keys) {
      const { unsplashId, author } = stockPhotos[key];
      expect(credits, key).toContain(`https://unsplash.com/photos/${unsplashId}`);
      expect(credits, key).toContain(author);
    }
  });

  it("each have alt text in both languages", () => {
    expect(Object.keys(en.Photos).sort()).toEqual([...keys].sort());
    expect(Object.keys(ar.Photos).sort()).toEqual([...keys].sort());
  });
});

describe("image loader", () => {
  it("picks the smallest stored width that covers the requested one", () => {
    const src = stockPhotoSrc("hero");
    expect(imageLoader({ src, width: 640 })).toBe("/images/stock/hero-640.webp");
    expect(imageLoader({ src, width: 641 })).toBe("/images/stock/hero-1280.webp");
    expect(imageLoader({ src, width: 1920 })).toBe("/images/stock/hero-1920.webp");
    expect(imageLoader({ src, width: 3840 })).toBe("/images/stock/hero-1920.webp");
  });
});
