import { describe, expect, it } from "vitest";

import { orderTotals, paidFils, TotalsError } from "./totals";

describe("orderTotals", () => {
  it("adds the lines and the delivery fee, with no VAT while it's off", () => {
    expect(
      orderTotals(
        [
          { unitPriceFils: 345_000, quantity: 1 },
          { unitPriceFils: 2_500, quantity: 3 },
        ],
        3_500,
        0,
      ),
    ).toEqual({ subtotalFils: 352_500, deliveryFeeFils: 3_500, vatFils: 0, totalFils: 356_000 });
  });

  it("works the VAT out of each line and the fee, leaving the total unchanged", () => {
    // 345000 × 5/105 = 16428.57 → 16429; 7500 × 5/105 = 357.14 → 357; 3500 → 166.67 → 167.
    expect(
      orderTotals(
        [
          { unitPriceFils: 345_000, quantity: 1 },
          { unitPriceFils: 2_500, quantity: 3 },
        ],
        3_500,
        500,
      ),
    ).toEqual({
      subtotalFils: 352_500,
      deliveryFeeFils: 3_500,
      vatFils: 16_429 + 357 + 167,
      totalFils: 356_000,
    });
  });

  it("rounds per line, not on the sum", () => {
    // Two lines of 10 fils: 0.476 each → 0 + 0, where the sum (20 → 0.95) would round to 1.
    expect(
      orderTotals(
        [
          { unitPriceFils: 10, quantity: 1 },
          { unitPriceFils: 10, quantity: 1 },
        ],
        0,
        500,
      ).vatFils,
    ).toBe(0);
  });

  it("refuses negative or out-of-range amounts", () => {
    expect(() => orderTotals([{ unitPriceFils: -1, quantity: 1 }], 0, 0)).toThrow(TotalsError);
    expect(() => orderTotals([{ unitPriceFils: 2_000_000_000, quantity: 2 }], 0, 0)).toThrow(
      TotalsError,
    );
  });
});

describe("paidFils", () => {
  it("counts deposits and payments, less refunds", () => {
    expect(
      paidFils([
        { kind: "deposit", amountFils: 50_000 },
        { kind: "payment", amountFils: 295_000 },
        { kind: "refund", amountFils: 10_000 },
      ]),
    ).toBe(335_000);
    expect(paidFils([])).toBe(0);
  });
});
