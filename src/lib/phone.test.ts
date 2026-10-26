import { describe, expect, it } from "vitest";

import { formatPhone, normalizePhone } from "./phone";

const mobile = "+971501234567";

describe("normalizePhone", () => {
  it("reads a UAE mobile however it is typed", () => {
    for (const input of [
      "0501234567",
      "050 123 4567",
      "050-123-4567",
      "(050) 123 4567",
      "501234567",
      "+971501234567",
      "+971 50 123 4567",
      "+971 (0) 50 123 4567",
      "00971501234567",
      "00 971 50 123 4567",
      "971501234567",
    ]) {
      expect(normalizePhone(input), input).toBe(mobile);
    }
  });

  it("reads Arabic-Indic and Extended Arabic-Indic digits", () => {
    expect(normalizePhone("٠٥٠١٢٣٤٥٦٧")).toBe(mobile);
    expect(normalizePhone("+٩٧١ ٥٠ ١٢٣ ٤٥٦٧")).toBe(mobile);
    expect(normalizePhone("٠٠٩٧١٥٠١٢٣٤٥٦٧")).toBe(mobile);
    expect(normalizePhone("۰۵۰۱۲۳۴۵۶۷")).toBe(mobile);
  });

  it("ignores direction marks copied from WhatsApp or Arabic text", () => {
    expect(normalizePhone("\u202a+971 50 123 4567\u202c")).toBe(mobile);
    expect(normalizePhone("\u200f٠٥٠١٢٣٤٥٦٧\u200f")).toBe(mobile);
  });

  it("reads other countries given with + or 00", () => {
    expect(normalizePhone("+966 50 123 4567")).toBe("+966501234567"); // Saudi Arabia
    expect(normalizePhone("0044 7911 123456")).toBe("+447911123456"); // UK
    expect(normalizePhone("+91 98765 43210")).toBe("+919876543210"); // India
    expect(normalizePhone("+1 (415) 555-2671")).toBe("+14155552671"); // US
  });

  it("reads a local number for another default country", () => {
    expect(normalizePhone("050 123 4567", { defaultCountry: "SA" })).toBe("+966501234567");
  });

  it("accepts UAE landlines unless a mobile is required", () => {
    expect(normalizePhone("07 222 3333")).toBe("+97172223333"); // Ras Al Khaimah
    expect(normalizePhone("07 222 3333", { mobileOnly: true })).toBeNull();
    expect(normalizePhone("050 123 4567", { mobileOnly: true })).toBe(mobile);
    // The US doesn't separate mobiles from landlines, so a US number passes.
    expect(normalizePhone("+1 415 555 2671", { mobileOnly: true })).toBe("+14155552671");
  });

  it("rejects what isn't a valid phone number", () => {
    for (const bad of [
      "",
      "   ",
      "050",
      "050123456", // one digit short
      "05012345678", // one digit long
      "+971 99 123 4567", // no such UAE prefix
      "call me on 0501234567",
      "0501234567 ext 5",
      "+971-50-123-4567x",
      "١٢٣",
      "0".repeat(41),
    ]) {
      expect(normalizePhone(bad), JSON.stringify(bad)).toBeNull();
    }
  });
});

describe("formatPhone", () => {
  it("spaces an E.164 number for reading", () => {
    expect(formatPhone(mobile)).toBe("+971 50 123 4567");
    expect(formatPhone("+447911123456")).toBe("+44 7911 123456");
  });

  it("only takes E.164", () => {
    expect(() => formatPhone("0501234567")).toThrow(RangeError);
    expect(() => formatPhone("+971 50 123 4567")).toThrow(RangeError);
  });
});
