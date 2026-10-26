import { describe, expect, it } from "vitest";

import { formatWeightKg } from "./units";

describe("formatWeightKg", () => {
  it("shows kilograms to one decimal, with Western digits in Arabic", () => {
    expect(formatWeightKg(3.6, "en")).toBe("3.6\u00a0kg");
    expect(formatWeightKg(4.25, "en")).toBe("4.3\u00a0kg");
    const ar = formatWeightKg(3.6, "ar");
    expect(ar).toContain("3.6");
    expect(ar).not.toMatch(/[٠-٩]/);
    expect(ar).not.toContain(" ");
  });
});
