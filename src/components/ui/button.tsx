// Buttons and button-styled links. Square corners, a 2px black edge and bold text; the
// arrow sits at the inline end and points the reading direction. Use `buttonClass` on a
// <button>, a next-intl <Link> or an <a>, and put <Arrow /> last inside when the button
// moves the visitor on.

const variants = {
  /** The main action of a section: black, white text. */
  primary: "border-black bg-black text-white hover:border-grey-800 hover:bg-grey-800",
  /** A second action next to a primary one. */
  secondary: "border-black bg-white text-black hover:bg-black hover:text-white",
  /** The main action on a black section. */
  inverse: "border-white bg-white text-black hover:border-grey-300 hover:bg-grey-300",
} as const;

export type ButtonVariant = keyof typeof variants;

/**
 * Classes for a button: 56px tall (52px on phones), so it's an easy tap target.
 * `block` makes it full width with the label and arrow at opposite ends, as on phones.
 */
export function buttonClass(variant: ButtonVariant = "primary", { block = false } = {}) {
  return [
    "inline-flex min-h-13 items-center gap-3 border-2 px-7 font-grotesk text-base font-bold transition-colors sm:min-h-14 disabled:opacity-60",
    block ? "w-full justify-between" : "justify-center",
    variants[variant],
  ].join(" ");
}

/** An arrow that points the reading direction (flipped in Arabic). Decorative. */
export function Arrow({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={`size-5 shrink-0 rtl:-scale-x-100 ${className}`}
    >
      <path d="M3 10h13M11 5l5 5-5 5" strokeLinecap="square" />
    </svg>
  );
}
