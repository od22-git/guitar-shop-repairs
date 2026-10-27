import { describe, expect, it } from "vitest";

import {
  productAsk,
  productMessageValues,
  variantHasTones,
  variantMessageValues,
} from "./product-message";

describe("product WhatsApp messages", () => {
  it("orders available items and asks about held or sold ones", () => {
    expect(productAsk("available")).toBe("order");
    expect(productAsk("reserved")).toBe("hold");
    expect(productAsk("sold")).toBe("similar");
  });

  it("isolates the title and SKU, and leaves the URL bare so WhatsApp links it", () => {
    expect(
      productMessageValues({ title: "Fender Strat", sku: "G-001", url: "https://x.ae/en/p" }),
    ).toEqual({
      title: "⁨Fender Strat⁩",
      sku: "⁦G-001⁩",
      url: "https://x.ae/en/p",
    });
  });
});

describe("variant WhatsApp messages", () => {
  it("isolates the variant and add-on names like the title", () => {
    expect(
      variantMessageValues({
        title: "NANOCORE",
        sku: "NANOCORE",
        url: "https://x.ae/en/product/nanocore",
        variant: "باقة البداية",
        addon: "نغمة مخصصة إضافية",
      }),
    ).toEqual({
      title: "⁨NANOCORE⁩",
      sku: "⁦NANOCORE⁩",
      url: "https://x.ae/en/product/nanocore",
      variant: "⁨باقة البداية⁩",
      addon: "⁨نغمة مخصصة إضافية⁩",
    });
  });

  it("leaves the add-on out when there is none", () => {
    expect(
      variantMessageValues({ title: "T", sku: "S", url: "u", variant: "Device only" }),
    ).not.toHaveProperty("addon");
  });

  it("lets a tone add-on go only with a bundle that has tones", () => {
    expect(variantHasTones({ customToneSlots: 0, includesPack: false })).toBe(false);
    expect(variantHasTones({ customToneSlots: 0, includesPack: true })).toBe(true);
    expect(variantHasTones({ customToneSlots: 3, includesPack: false })).toBe(true);
  });
});
