// Where product photos are served from. A photo is stored once per width in
// `stockPhotoWidths` as `<key>-<width>.webp` (next/image picks one through
// src/lib/image-loader.ts), plus `<key>-og.jpg` for link previews.
//
// Keys under "samples/" are the development photos in public/images/samples. Uploaded
// photos come with the image pipeline and the public bucket (M4).

const SAMPLE_PREFIX = "samples/";

/** Link-preview image size: the 1.91:1 that WhatsApp and Instagram show large. */
export const OG_IMAGE_SIZE = { width: 1200, height: 630 } as const;

export function productImageSrc(key: string): string {
  if (key.startsWith(SAMPLE_PREFIX)) return `/images/${key}`;
  throw new Error(`No storage for product photo "${key}" yet (uploads come in M4)`);
}

export function productOgImageSrc(key: string): string {
  return `${productImageSrc(key)}-og.jpg`;
}
