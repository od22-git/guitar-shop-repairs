import { brand } from "@/config/brand";

type Props = {
  className?: string;
};

/**
 * The letters-only wordmark, "MIDTOWN GEARS": Archivo at its widest and heaviest. It is
 * Latin in both languages (Arabic running text uses the Arabic name instead), so it is
 * always set left to right and never translated. Size it with a text-* class; it takes the
 * current text colour.
 */
export function Wordmark({ className = "" }: Props) {
  return (
    <span
      dir="ltr"
      translate="no"
      className={`inline-block font-grotesk leading-[0.9] font-black tracking-[-0.01em] whitespace-nowrap font-stretch-expanded ${className}`}
    >
      {brand.wordmark}
    </span>
  );
}
