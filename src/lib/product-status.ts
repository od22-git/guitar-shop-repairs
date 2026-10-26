import type { PublicProduct } from "./public-dto";

/** The status label to show: sold-out gear reads "Sold out", a sold guitar "Sold". */
export function statusKey(product: Pick<PublicProduct, "status" | "kind">) {
  if (product.status === "sold") return product.kind === "gear" ? "soldOut" : "sold";
  return product.status;
}
