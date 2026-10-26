// Where product photos are served from. A photo is stored once per width in
// `stockPhotoWidths` as `<key>-<width>.webp` (next/image picks one through
// src/lib/image-loader.ts), plus `<key>-og.jpg` for link previews.
//
// Keys under "samples/" are the development photos in public/images/samples. Uploaded
// photos (src/lib/admin/photos.ts) are in the public storage bucket and served at
// /media/<key>: from the storage folder by src/app/media (STORAGE_DRIVER=fs), or from R2
// through a rewrite in next.config.ts (STORAGE_DRIVER=r2).

const SAMPLE_PREFIX = "samples/";
export const MEDIA_PATH = "/media";

/** Link-preview image size: the 1.91:1 that WhatsApp and Instagram show large. */
export const OG_IMAGE_SIZE = { width: 1200, height: 630 } as const;

export function productImageSrc(key: string): string {
  if (key.startsWith(SAMPLE_PREFIX)) return `/images/${key}`;
  return `${MEDIA_PATH}/${key}`;
}

export function isSamplePhoto(key: string): boolean {
  return key.startsWith(SAMPLE_PREFIX);
}

export function productOgImageSrc(key: string): string {
  return `${productImageSrc(key)}-og.jpg`;
}
