import { describe, expect, it } from "vitest";

import { toWesternDigits } from "./digits";

describe("toWesternDigits", () => {
  it("converts Arabic-Indic and Extended Arabic-Indic digits", () => {
    expect(toWesternDigits("٠١٢٣٤٥٦٧٨٩")).toBe("0123456789");
    expect(toWesternDigits("۰۱۲۳۴۵۶۷۸۹")).toBe("0123456789");
  });

  it("leaves everything else alone", () => {
    expect(toWesternDigits("+971 ٥٠-123 abc")).toBe("+971 50-123 abc");
    expect(toWesternDigits("")).toBe("");
  });
});
