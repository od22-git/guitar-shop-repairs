import { describe, expect, it } from "vitest";

import { productAsk, productMessageValues } from "./product-message";

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
