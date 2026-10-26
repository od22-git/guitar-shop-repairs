import { describe, expect, it } from "vitest";

import { localized, localizedAttrs, localizedOptional } from "./localized";

describe("localized", () => {
  it("uses the Arabic text on Arabic pages and the English text on English ones", () => {
    expect(localized("ar", "Strat", "ستراتوكاستر")).toEqual({ text: "ستراتوكاستر", lang: "ar" });
    expect(localized("en", "Strat", "ستراتوكاستر")).toEqual({ text: "Strat", lang: "en" });
  });

  it("falls back to English when the Arabic is missing or blank", () => {
    expect(localized("ar", "Strat", null)).toEqual({ text: "Strat", lang: "en" });
    expect(localized("ar", "Strat", "  ")).toEqual({ text: "Strat", lang: "en" });
    expect(localizedOptional("ar", "Notes", null)).toEqual({ text: "Notes", lang: "en" });
    expect(localizedOptional("ar", null, null)).toBeNull();
    expect(localizedOptional("en", null, "ملاحظات")).toBeNull();
  });

  it("marks fallback text with its language and an automatic direction", () => {
    expect(localizedAttrs({ text: "Strat", lang: "en" }, "ar")).toEqual({
      lang: "en",
      dir: "auto",
    });
    expect(localizedAttrs({ text: "Strat", lang: "en" }, "en")).toEqual({});
  });
});
