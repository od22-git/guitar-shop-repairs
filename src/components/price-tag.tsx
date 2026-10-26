import { getLocale, getTranslations } from "next-intl/server";

import { formatMoney } from "@/lib/money";
import type { PublicProduct } from "@/lib/public-dto";

import { Bdi } from "./bdi";

/** The status label to show: sold-out gear reads "Sold out", a sold guitar "Sold". */
export function statusKey(product: Pick<PublicProduct, "status" | "kind">) {
  if (product.status === "sold") return product.kind === "gear" ? "soldOut" : "sold";
  return product.status;
}

type Props = {
  product: Pick<PublicProduct, "status" | "kind" | "priceFils" | "compareAtFils">;
  size?: "sm" | "lg";
  className?: string;
};

// A paper swing tag, like the price tags hung on guitars in a shop: notched at the
// inline start with a hole for the string, and hung at a slight angle. It is the
// catalog's one bold element; everything around it stays quiet.
const shape =
  "[clip-path:polygon(0.875rem_0,100%_0,100%_100%,0.875rem_100%,0_50%)] rtl:[clip-path:polygon(0_0,calc(100%_-_0.875rem)_0,100%_50%,calc(100%_-_0.875rem)_100%,0_100%)]";

const sizes = {
  sm: { box: "ps-6 pe-3 py-1.5 -rotate-2 rtl:rotate-2", price: "text-base font-bold" },
  lg: { box: "ps-8 pe-5 py-3 -rotate-1 rtl:rotate-1", price: "text-3xl font-extrabold" },
};

/** Price and stock state on a swing tag. Sold items show the state instead of a price. */
export async function PriceTag({ product, size = "sm", className = "" }: Props) {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("Product")]);
  const { box, price } = sizes[size];
  const status = statusKey(product);
  const sold = product.status === "sold";

  return (
    <div
      className={`relative inline-flex w-max flex-col items-start bg-paper text-ink ${shape} ${box} ${className}`}
    >
      <span
        aria-hidden="true"
        className="absolute start-2 top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-ink"
      />
      {sold ? (
        <span className={`${price} text-fiesta-deep`}>{t(`status.${status}`)}</span>
      ) : (
        <>
          <span className={`${price} leading-tight tabular-nums`}>
            <Bdi>{formatMoney(product.priceFils, locale)}</Bdi>
          </span>
          {product.compareAtFils !== null && (
            <span className="text-sm text-ink-muted tabular-nums">
              <span className="sr-only">
                {t("was", { price: formatMoney(product.compareAtFils, locale) })}
              </span>
              <s aria-hidden="true">
                <Bdi>{formatMoney(product.compareAtFils, locale)}</Bdi>
              </s>
            </span>
          )}
          {product.status === "reserved" && (
            <span className="text-sm font-semibold text-fiesta-deep">{t("status.reserved")}</span>
          )}
        </>
      )}
    </div>
  );
}
