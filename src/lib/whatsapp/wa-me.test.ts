import { describe, expect, it } from "vitest";

import { waMeUrl } from "./wa-me";

describe("waMeUrl", () => {
  it("links to the number without the plus sign", () => {
    expect(waMeUrl("+971501234567")).toBe("https://wa.me/971501234567");
  });

  it("percent-encodes the message, including Arabic and spaces", () => {
    const url = waMeUrl("+971501234567", "مرحباً، 1964 Jaguar & case?");
    expect(url).toBe(
      "https://wa.me/971501234567?text=" + encodeURIComponent("مرحباً، 1964 Jaguar & case?"),
    );
    expect(url).not.toContain("+");
    expect(decodeURIComponent(new URL(url).search.slice("?text=".length))).toBe(
      "مرحباً، 1964 Jaguar & case?",
    );
  });

  it("rejects numbers that are not E.164", () => {
    for (const bad of ["0501234567", "971501234567", "+0501234567", "+971 50 123 4567", ""]) {
      expect(() => waMeUrl(bad), bad).toThrow(RangeError);
    }
  });
});
