import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { webpSize } from "@/test/webp";

import { ImageError, MAX_UPLOAD_BYTES, photoFileKeys, processPhoto } from "./images";

// A landscape phone photo saved sideways with EXIF orientation 6 (rotate 90°), carrying
// the camera's details and GPS coordinates.
async function phonePhoto(width = 2400, height = 1800) {
  return sharp({ create: { width, height, channels: 3, background: "#4a2f27" } })
    .jpeg()
    .withMetadata({ orientation: 6 })
    .withExifMerge({
      IFD0: { Make: "Phone", Model: "Camera" },
      IFD3: { GPSLatitudeRef: "N", GPSLatitude: "25/1 47/1 0/1", GPSLongitude: "55/1 57/1 0/1" },
    })
    .toBuffer();
}

describe("processPhoto", () => {
  it("stores every width and a link preview, with no EXIF or GPS data", async () => {
    const input = await phonePhoto();
    const before = await sharp(input).metadata();
    expect(before.exif).toBeDefined();
    expect(before.orientation).toBe(6);

    const { files } = await processPhoto(input);
    expect(files.map((f) => f.suffix)).toEqual([
      "-640.webp",
      "-1280.webp",
      "-1920.webp",
      "-og.jpg",
    ]);
    for (const file of files) {
      const metadata = await sharp(file.body).metadata();
      expect(metadata.exif, file.suffix).toBeUndefined();
      expect(metadata.xmp, file.suffix).toBeUndefined();
      expect(metadata.iptc, file.suffix).toBeUndefined();
      expect(metadata.orientation ?? 1, file.suffix).toBe(1);
      expect(file.body.includes("Phone"), file.suffix).toBe(false);
    }
  });

  it("applies the orientation, so a sideways photo comes out upright", async () => {
    const { width, height, files } = await processPhoto(await phonePhoto(2400, 1800));
    // Upright it's 1800×2400, under the largest stored width, so kept at full size.
    expect({ width, height }).toEqual({ width: 1800, height: 2400 });
    expect(webpSize(files[0].body)).toEqual({ width: 640, height: 853 });
    expect(webpSize(files[2].body)).toEqual({ width: 1800, height: 2400 });
  });

  it("never enlarges a small photo", async () => {
    const small = await sharp({
      create: { width: 500, height: 400, channels: 3, background: "#fff" },
    })
      .png()
      .toBuffer();
    const { width, height, files } = await processPhoto(small);
    expect({ width, height }).toEqual({ width: 500, height: 400 });
    expect(webpSize(files[1].body)).toEqual({ width: 500, height: 400 });
  });

  it("refuses files that aren't photos", async () => {
    const problem = (input: Buffer) =>
      processPhoto(input).then(
        () => null,
        (error: unknown) => (error instanceof ImageError ? error.problem : error),
      );
    expect(await problem(Buffer.from("<svg onload=alert(1)>"))).toBe("not_an_image");
    const gif = await sharp({ create: { width: 2, height: 2, channels: 3, background: "#000" } })
      .gif()
      .toBuffer();
    expect(await problem(gif)).toBe("unsupported_format");
    expect(await problem(Buffer.alloc(MAX_UPLOAD_BYTES + 1))).toBe("too_large");
  });
});

describe("photoFileKeys", () => {
  it("lists every stored file", () => {
    expect(photoFileKeys("products/1/abc")).toEqual([
      "products/1/abc-640.webp",
      "products/1/abc-1280.webp",
      "products/1/abc-1920.webp",
      "products/1/abc-og.jpg",
    ]);
  });
});
