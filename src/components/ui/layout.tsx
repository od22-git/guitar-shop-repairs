import type { ComponentProps, ReactNode } from "react";

// Page structure (docs/design.md): a 12-column grid (4 on phones) with 24px gutters (16px
// on phones), 48px page margins (20px on phones), and 120px between sections (80px on
// phones). Sections are separated by space and black rules, not boxes.

/** The page margins, up to a 100rem-wide page. */
export function Container({ className = "", ...props }: ComponentProps<"div">) {
  return (
    <div className={`mx-auto w-full max-w-[100rem] px-5 md:px-gutter ${className}`} {...props} />
  );
}

/** The column grid. Children place themselves with col-span-* / md:col-span-*. */
export function Grid({ className = "", ...props }: ComponentProps<"div">) {
  return (
    <div
      className={`grid grid-cols-4 gap-x-4 md:grid-cols-12 md:gap-x-6 ${className}`}
      {...props}
    />
  );
}

const tones = {
  light: "",
  /** A black band for a statement or the footer. Muted text on it is grey-400. */
  dark: "bg-black text-white",
} as const;

/** A page section: its own margins and vertical rhythm. */
export function Section({
  tone = "light",
  className = "",
  children,
  ...props
}: { tone?: keyof typeof tones } & ComponentProps<"section">) {
  return (
    <section className={`py-20 md:py-section ${tones[tone]} ${className}`} {...props}>
      <Container>{children}</Container>
    </section>
  );
}

/** A column that starts with a black rule: the numbered index columns and fact lists. */
export function RuledColumn({ className = "", ...props }: ComponentProps<"div">) {
  return <div className={`border-t border-current pt-5 ${className}`} {...props} />;
}

/** Rows of name … price, divided by hairlines: bundles, service prices, specs. */
export function PriceList({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <ul className={`border-t border-current ${className}`}>{children}</ul>;
}

export function PriceRow({ name, price }: { name: ReactNode; price: ReactNode }) {
  return (
    <li className="flex items-baseline gap-4 border-b border-grey-300 py-4">
      <span className="min-w-0">{name}</span>
      {/* A dotted leader from the name to the price. */}
      <span aria-hidden="true" className="min-w-6 flex-1 border-b border-dotted border-grey-300" />
      <span className="shrink-0">{price}</span>
    </li>
  );
}
