import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { makeOgImage } from "./og-image";

describe("makeOgImage", () => {
  it("makes a 1200×630 JPEG without the photo's EXIF or GPS data", async () => {
    // A portrait photo carrying EXIF with GPS coordinates, as a phone would save it.
    const photo = await sharp({
      create: { width: 400, height: 500, channels: 3, background: "#c8a55a" },
    })
      .jpeg()
      .withExif({ IFD0: { Make: "Phone" }, IFD3: { GPSLatitude: "25/1 47/1 0/1" } })
      .toBuffer();
    expect((await sharp(photo).metadata()).exif).toBeDefined();

    const preview = await sharp(await makeOgImage(photo)).metadata();
    expect(preview).toMatchObject({ format: "jpeg", width: 1200, height: 630 });
    expect(preview.exif).toBeUndefined();
  });
});
