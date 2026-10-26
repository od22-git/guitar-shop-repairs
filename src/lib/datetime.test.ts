import { describe, expect, it } from "vitest";

import { formatDate, formatDateTime } from "./datetime";

const plain = (s: string) => s.replace(/[\u200e\u200f\u061c]/g, "").replace(/[\u00a0\u202f]/g, " ");

describe("formatDate", () => {
  // 21:30 UTC on 26 October is already 27 October in Dubai (UTC+4).
  const lateEvening = new Date("2026-10-26T21:30:00Z");

  it("uses the calendar date in Asia/Dubai, not UTC", () => {
    expect(formatDate(lateEvening, "en")).toBe("27 October 2026");
    expect(plain(formatDate(lateEvening, "ar"))).toBe("27 أكتوبر 2026");
  });

  it("uses Western digits and the Gregorian calendar in Arabic", () => {
    const formatted = formatDate(new Date("2026-03-01T08:00:00Z"), "ar");
    expect(formatted).not.toMatch(/[٠-٩۰-۹]/);
    expect(plain(formatted)).toBe("1 مارس 2026");
  });
});

describe("formatDateTime", () => {
  it("shows the time in Asia/Dubai", () => {
    const at = new Date("2026-10-26T21:30:00Z");
    expect(formatDateTime(at, "en")).toMatch(/^27 October 2026.*1:30\sAM$/i);
    expect(plain(formatDateTime(at, "ar"))).toMatch(/^27 أكتوبر 2026.*1:30\sص$/);
  });
});
