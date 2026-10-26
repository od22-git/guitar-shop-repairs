import sharp from "sharp";

import { OG_IMAGE_SIZE } from "./product-images";

/**
 * The link-preview image for a product photo: the whole photo, centred on a blurred,
 * darkened copy of itself, as a 1200×630 JPEG. Portrait guitar photos would otherwise be
 * cropped to a slice of the body. Metadata (EXIF, GPS) is never copied to the output.
 */
export async function makeOgImage(photo: Buffer): Promise<Buffer> {
  const { width, height } = OG_IMAGE_SIZE;
  const [background, foreground] = await Promise.all([
    sharp(photo)
      .rotate()
      .resize(width, height, { fit: "cover" })
      .blur(30)
      .modulate({ brightness: 0.4 })
      .toBuffer(),
    sharp(photo).rotate().resize(width, height, { fit: "inside" }).toBuffer(),
  ]);
  return sharp(background)
    .composite([{ input: foreground, gravity: "centre" }])
    .jpeg({ quality: 78, mozjpeg: true })
    .toBuffer();
}
