import { getLocale, getTranslations } from "next-intl/server";

import { formatMoney } from "@/lib/money";

import { Bdi, Ltr } from "../bdi";

const sizes = {
  /** In lists and cards. */
  sm: "text-base font-extrabold font-stretch-semi-expanded",
  /** Under a product card's title. */
  md: "text-xl font-extrabold font-stretch-semi-expanded",
  /** The product page's price. */
  lg: "text-4xl font-black font-stretch-semi-expanded sm:text-5xl",
} as const;

type Props = {
  fils: number;
  /** The old price after a price drop, struck through ("Was …" for screen readers). */
  compareAtFils?: number | null;
  size?: keyof typeof sizes;
  /** Before the amount, e.g. "+" for an add-on. */
  prefix?: string;
  className?: string;
};

/**
 * "+AED 50" in English. In Arabic the sign goes on the number, kept left to right with it,
 * so it reads "+50 د.إ." rather than "50+ د.إ.".
 */
export function withPrefix(money: string, prefix: string) {
  if (!prefix) return money;
  // Arabic amounts start with the number, after an optional right-to-left mark.
  const match = /^(\u200f?)(\d[\d,.]*)(.*)$/.exec(money);
  if (!match) return `${prefix}${money}`;
  const [, mark, amount, rest] = match;
  return (
    <>
      {mark}
      <Ltr>
        {prefix}
        {amount}
      </Ltr>
      {rest}
    </>
  );
}

/** A price in AED, in tabular figures and isolated for Arabic text (formatMoney). */
export async function Price({
  fils,
  compareAtFils,
  size = "sm",
  prefix = "",
  className = "",
}: Props) {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("Product")]);

  return (
    <span className={`inline-flex flex-wrap items-baseline gap-x-3 ${className}`}>
      <span className={`whitespace-nowrap tabular-nums ${sizes[size]}`}>
        <Bdi>{withPrefix(formatMoney(fils, locale), prefix)}</Bdi>
      </span>
      {compareAtFils != null && (
        <span className="text-base whitespace-nowrap text-grey-600 tabular-nums">
          <span className="sr-only">{t("was", { price: formatMoney(compareAtFils, locale) })}</span>
          <s aria-hidden="true">
            <Bdi>{formatMoney(compareAtFils, locale)}</Bdi>
          </s>
        </span>
      )}
    </span>
  );
}
