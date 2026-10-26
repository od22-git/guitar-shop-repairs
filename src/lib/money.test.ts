import { describe, expect, it } from "vitest";

import { formatMoney } from "./money";

// Intl output contains direction marks in Arabic and no-break spaces; normalise to compare.
const plain = (s: string) => s.replace(/[\u200e\u200f\u061c]/g, "").replace(/[\u00a0\u202f]/g, " ");

describe("formatMoney", () => {
  it("shows whole dirhams without decimals", () => {
    expect(plain(formatMoney(1_250_000, "en"))).toBe("AED 12,500");
    expect(plain(formatMoney(1_250_000, "ar"))).toBe("12,500 د.إ.");
  });

  it("shows two decimals when there are fils", () => {
    expect(plain(formatMoney(1_250_050, "en"))).toBe("AED 12,500.50");
    expect(plain(formatMoney(5, "en"))).toBe("AED 0.05");
    expect(plain(formatMoney(1_250_050, "ar"))).toBe("12,500.50 د.إ.");
  });

  it("uses Western digits in Arabic", () => {
    expect(formatMoney(123_456_700, "ar")).not.toMatch(/[٠-٩۰-۹]/);
    expect(formatMoney(123_456_700, "ar")).toContain("1,234,567");
  });

  it("formats zero and negative amounts", () => {
    expect(plain(formatMoney(0, "en"))).toBe("AED 0");
    expect(plain(formatMoney(-2_500, "en"))).toBe("-AED 25");
  });

  it("rejects amounts that are not whole fils", () => {
    expect(() => formatMoney(12.5, "en")).toThrow(RangeError);
    expect(() => formatMoney(Number.NaN, "en")).toThrow(RangeError);
  });
});
