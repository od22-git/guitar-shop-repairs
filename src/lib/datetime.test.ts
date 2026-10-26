import { describe, expect, it } from "vitest";

import { dubaiDateInputValue, endOfDubaiDay, formatDate, formatDateTime } from "./datetime";

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

describe("endOfDubaiDay", () => {
  it("is 23:59:59.999 in Dubai, 19:59:59.999 UTC", () => {
    expect(endOfDubaiDay("2026-11-03")?.toISOString()).toBe("2026-11-03T19:59:59.999Z");
  });

  it("rejects malformed and impossible dates", () => {
    expect(endOfDubaiDay("2026-02-30")).toBeNull();
    expect(endOfDubaiDay("03/11/2026")).toBeNull();
    expect(endOfDubaiDay("")).toBeNull();
  });

  it("round-trips through the date input value", () => {
    const end = endOfDubaiDay("2026-12-31");
    expect(end && dubaiDateInputValue(end)).toBe("2026-12-31");
    // 22:00 UTC on the 2nd is already the 3rd in Dubai.
    expect(dubaiDateInputValue(new Date("2026-11-02T22:00:00Z"))).toBe("2026-11-03");
  });
});
