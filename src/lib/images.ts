import sharp, { type Metadata } from "sharp";

import { stockPhotoWidths } from "../config/stock-photos";

import { makeOgImage } from "./og-image";

// The server half of the photo pipeline. The browser has already shrunk the photo
// (src/app/admin/(panel)/products/[id]/photo-upload.tsx); here it is decoded and
// re-encoded from pixels, which proves it is an image and drops everything else in the
// file: EXIF, GPS coordinates (photos taken at home would reveal the address), camera
// details, embedded thumbnails. Orientation is applied to the pixels first.

/** Larger uploads are refused before decoding. The browser sends about 1–2 MB. */
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
/** About 50 megapixels: bigger than any phone photo, small enough to decode safely. */
const MAX_INPUT_PIXELS = 50_000_000;
/** The largest stored width; next/image picks from `stockPhotoWidths`. */
const MAX_WIDTH = stockPhotoWidths.at(-1) ?? 1920;

const accepted = new Set(["jpeg", "png", "webp"]);

export type ImageProblem = "too_large" | "not_an_image" | "unsupported_format";

export class ImageError extends Error {
  override name = "ImageError";
  constructor(readonly problem: ImageProblem) {
    super(problem);
  }
}

export type PhotoFile = { suffix: string; body: Buffer; contentType: string };

export type ProcessedPhoto = {
  /** Size of the largest stored copy, after orientation. */
  width: number;
  height: number;
  /** `-<width>.webp` for each stock width, plus `-og.jpg` for link previews. */
  files: PhotoFile[];
};

export async function processPhoto(input: Buffer): Promise<ProcessedPhoto> {
  if (input.byteLength > MAX_UPLOAD_BYTES) throw new ImageError("too_large");
  const options = { limitInputPixels: MAX_INPUT_PIXELS, failOn: "error" } as const;

  let metadata: Metadata;
  try {
    metadata = await sharp(input, options).metadata();
  } catch {
    throw new ImageError("not_an_image");
  }
  if (!metadata.format || !accepted.has(metadata.format)) {
    // HEIC from iPhones lands here: the browser converts it to JPEG before upload.
    throw new ImageError("unsupported_format");
  }

  const oriented = metadata.autoOrient;
  const scale = Math.min(1, MAX_WIDTH / oriented.width);
  const width = Math.round(oriented.width * scale);
  const height = Math.round(oriented.height * scale);

  try {
    const sizes = await Promise.all(
      stockPhotoWidths.map(async (w) => ({
        suffix: `-${w}.webp`,
        contentType: "image/webp",
        body: await sharp(input, options)
          .rotate()
          .resize({ width: w, withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer(),
      })),
    );
    const og = { suffix: "-og.jpg", contentType: "image/jpeg", body: await makeOgImage(input) };
    return { width, height, files: [...sizes, og] };
  } catch {
    throw new ImageError("not_an_image");
  }
}

/** Every stored file of a photo, from its key. */
export function photoFileKeys(key: string): string[] {
  return [...stockPhotoWidths.map((w) => `${key}-${w}.webp`), `${key}-og.jpg`];
}
