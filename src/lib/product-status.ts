import type { PublicProduct } from "./public-dto";

/** The status label to show: a sold guitar reads "Sold", anything else "Sold out". */
export function statusKey(product: Pick<PublicProduct, "status" | "kind">) {
  if (product.status === "sold") return product.kind === "guitar" ? "sold" : "soldOut";
  return product.status;
}
