import { MAX_FILS, vatIncludedFils } from "../money";

// An order's totals. Prices are final, VAT included: the VAT is worked out of each line
// (unit price × quantity) and the delivery fee, rounded per line, and summed.

export type TotalsLine = { unitPriceFils: number; quantity: number };

export type OrderTotals = {
  subtotalFils: number;
  deliveryFeeFils: number;
  vatFils: number;
  totalFils: number;
};

export class TotalsError extends RangeError {
  override name = "TotalsError";
}

export function orderTotals(
  lines: readonly TotalsLine[],
  deliveryFeeFils: number,
  /** 0 while the shop isn't VAT-registered. */
  vatRateBps: number,
): OrderTotals {
  const amounts = lines.map(({ unitPriceFils, quantity }) => unitPriceFils * quantity);
  const subtotalFils = amounts.reduce((sum, amount) => sum + amount, 0);
  const totalFils = subtotalFils + deliveryFeeFils;
  if (
    ![...amounts, deliveryFeeFils, totalFils].every(
      (amount) => Number.isSafeInteger(amount) && amount >= 0,
    ) ||
    totalFils > MAX_FILS
  ) {
    throw new TotalsError("Order amounts must be whole, non-negative fils within range");
  }
  const vatFils =
    vatRateBps === 0
      ? 0
      : [...amounts, deliveryFeeFils].reduce(
          (sum, amount) => sum + vatIncludedFils(amount, vatRateBps),
          0,
        );
  return { subtotalFils, deliveryFeeFils, vatFils, totalFils };
}

export type LedgerEntry = { kind: "deposit" | "payment" | "refund"; amountFils: number };

/** Deposits and payments received, less refunds. */
export function paidFils(entries: readonly LedgerEntry[]): number {
  return entries.reduce(
    (sum, { kind, amountFils }) => sum + (kind === "refund" ? -amountFils : amountFils),
    0,
  );
}
