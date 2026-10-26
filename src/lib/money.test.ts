import { describe, expect, it } from "vitest";

import {
  filsToDecimalString,
  formatMoney,
  MAX_FILS,
  parseAedToFils,
  vatIncludedFils,
} from "./money";

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

describe("vatIncludedFils", () => {
  it("is price × 5/105 at the UAE rate", () => {
    expect(vatIncludedFils(10_500)).toBe(500); // AED 105 includes AED 5
    expect(vatIncludedFils(1_050_000)).toBe(50_000);
    expect(vatIncludedFils(0)).toBe(0);
  });

  it("rounds to the nearest fils", () => {
    // At 5% the VAT in an amount is amount / 21.
    expect(vatIncludedFils(1)).toBe(0); // 0.047…
    expect(vatIncludedFils(100)).toBe(5); // 4.76…
    expect(vatIncludedFils(231)).toBe(11); // exactly 11
    expect(vatIncludedFils(241)).toBe(11); // 11.476…
    expect(vatIncludedFils(242)).toBe(12); // 11.523…
  });

  it("rounds an exact half away from zero", () => {
    // amount / 21 is never exactly n.5 at 5%, so use 20% (amount / 6) to reach one.
    expect(vatIncludedFils(3, 2_000)).toBe(1); // 0.5
    expect(vatIncludedFils(9, 2_000)).toBe(2); // 1.5
    expect(vatIncludedFils(-9, 2_000)).toBe(-2);
  });

  it("is computed per line and summed, which can differ from VAT on the total", () => {
    const lines = [100, 100, 100];
    const perLine = lines.reduce((sum, line) => sum + vatIncludedFils(line), 0);
    expect(perLine).toBe(15);
    expect(vatIncludedFils(300)).toBe(14); // 14.28…
  });

  it("handles refunds as negative amounts symmetrically", () => {
    expect(vatIncludedFils(-10_500)).toBe(-500);
    expect(vatIncludedFils(-100)).toBe(-5);
  });

  it("is zero at a zero rate and stays exact at the largest amount", () => {
    expect(vatIncludedFils(123_456, 0)).toBe(0);
    expect(vatIncludedFils(MAX_FILS)).toBe(Math.round((MAX_FILS * 5) / 105));
  });

  it("rejects fractional fils and bad rates", () => {
    expect(() => vatIncludedFils(10.5)).toThrow(RangeError);
    expect(() => vatIncludedFils(100, -1)).toThrow(RangeError);
    expect(() => vatIncludedFils(100, 2.5)).toThrow(RangeError);
  });
});

describe("parseAedToFils", () => {
  it("reads whole dirhams and up to two decimals without float error", () => {
    expect(parseAedToFils("12500")).toBe(1_250_000);
    expect(parseAedToFils("19.99")).toBe(1_999);
    expect(parseAedToFils("1.00")).toBe(100);
    expect(parseAedToFils("0.1")).toBe(10);
    expect(parseAedToFils("0.07")).toBe(7);
    expect(parseAedToFils("4.35")).toBe(435); // 4.35 × 100 is 434.99… in floating point
    expect(parseAedToFils(" 250 ")).toBe(25_000);
    expect(parseAedToFils("0")).toBe(0);
  });

  it("accepts thousands separators in the right places", () => {
    expect(parseAedToFils("12,500")).toBe(1_250_000);
    expect(parseAedToFils("1,234,567.50")).toBe(123_456_750);
    expect(parseAedToFils("12,50")).toBeNull();
    expect(parseAedToFils("1,2345")).toBeNull();
    expect(parseAedToFils(",500")).toBeNull();
  });

  it("accepts Arabic-Indic digits and Arabic separators", () => {
    expect(parseAedToFils("١٢٥٠٠")).toBe(1_250_000);
    expect(parseAedToFils("١٢٬٥٠٠٫٥٠")).toBe(1_250_050);
    expect(parseAedToFils("۱۹٫۹۹")).toBe(1_999);
  });

  it("rejects everything else", () => {
    for (const bad of [
      "",
      "abc",
      "-5",
      "+5",
      "1.234",
      "1.",
      ".5",
      "1e3",
      "AED 5",
      "5 AED",
      "1 000",
    ]) {
      expect(parseAedToFils(bad), bad).toBeNull();
    }
  });

  it("rejects amounts a money column can't hold", () => {
    expect(parseAedToFils("21474836.47")).toBe(MAX_FILS);
    expect(parseAedToFils("21474836.48")).toBeNull();
    expect(parseAedToFils("99999999999999999999")).toBeNull();
  });
});

describe("filsToDecimalString", () => {
  it("writes dirhams with two decimals, without floating point", () => {
    expect(filsToDecimalString(345_000)).toBe("3450.00");
    expect(filsToDecimalString(1_999)).toBe("19.99");
    expect(filsToDecimalString(5)).toBe("0.05");
    expect(filsToDecimalString(0)).toBe("0.00");
  });

  it("rejects fractions and negatives", () => {
    expect(() => filsToDecimalString(1.5)).toThrow(RangeError);
    expect(() => filsToDecimalString(-100)).toThrow(RangeError);
  });
});
