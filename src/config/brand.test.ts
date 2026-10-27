import { describe, expect, it } from "vitest";

import { brand, socialLinks } from "./brand";

describe("socialLinks", () => {
  it("links nothing while the handles are unset", () => {
    expect(socialLinks({ instagram: null, tiktok: null })).toEqual([]);
    expect(socialLinks({ instagram: " ", tiktok: "" })).toEqual([]);
  });

  it("links each network whose handle is set, without a leading @", () => {
    expect(socialLinks({ instagram: "@midtowngears", tiktok: "midtown.gears" })).toEqual([
      {
        network: "instagram",
        handle: "midtowngears",
        url: "https://www.instagram.com/midtowngears/",
      },
      {
        network: "tiktok",
        handle: "midtown.gears",
        url: "https://www.tiktok.com/@midtown.gears",
      },
    ]);
  });

  it("uses the brand's handles by default", () => {
    expect(socialLinks()).toEqual(socialLinks(brand.social));
  });
});

describe("brand", () => {
  it("has a letters-only wordmark matching the English name", () => {
    expect(brand.wordmark).toMatch(/^[A-Z ]+$/);
    expect(brand.wordmark).toBe(brand.name.en.toUpperCase());
  });

  it("highlights words that are in the tagline", () => {
    for (const locale of ["en", "ar"] as const) {
      expect(brand.tagline[locale]).toContain(brand.taglineHighlight[locale]);
    }
  });
});
