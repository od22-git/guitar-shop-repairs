import type { ComponentProps, ReactNode } from "react";

// The M9a type scale (docs/design.md). Headings are Archivo Black, set wider as they get
// bigger; Arabic (Alexandria) gets more line height and is never letter-spaced.

const headings = {
  /** The one huge statement on a page. Uppercase in Latin. */
  display:
    "text-display font-black uppercase tracking-[-0.02em] font-stretch-expanded rtl:leading-[1.2] rtl:tracking-normal max-md:font-stretch-normal",
  /** Section headings. */
  headline:
    "text-headline font-black tracking-[-0.02em] font-stretch-semi-expanded rtl:leading-[1.3] rtl:tracking-normal",
  /** Card and column headings. */
  title:
    "text-title font-extrabold tracking-[-0.01em] font-stretch-semi-expanded rtl:leading-[1.4] rtl:tracking-normal",
} as const;

export type HeadingLevel = keyof typeof headings;

type HeadingProps = {
  level: HeadingLevel;
  /** The element: pick it for the outline, the level for the look. */
  as: "h1" | "h2" | "h3" | "p";
} & Omit<ComponentProps<"h2">, "ref">;

export function Heading({ level, as: Tag, className = "", ...props }: HeadingProps) {
  return <Tag className={`text-balance ${headings[level]} ${className}`} {...props} />;
}

/** The intro paragraph under a big heading. */
export function Lead({ className = "", ...props }: ComponentProps<"p">) {
  return <p className={`max-w-[34ch] text-lead text-pretty ${className}`} {...props} />;
}

/** A word or two in a heading picked out in blue. */
export function Highlight({ children }: { children: ReactNode }) {
  return <span className="text-blue">{children}</span>;
}

/**
 * A small monospaced label: section numbers, categories, notes under prices. Uppercase and
 * letter-spaced in Latin; Arabic falls through to Alexandria, unspaced.
 */
export function Label({
  as: Tag = "span",
  className = "",
  ...props
}: { as?: "span" | "p" | "div" } & Omit<ComponentProps<"span">, "ref">) {
  return (
    <Tag
      className={`font-mono text-label font-medium tracking-[0.08em] uppercase rtl:text-sm rtl:tracking-normal ${className}`}
      {...props}
    />
  );
}

/** "01 / Gear": a section's number and name above its heading. */
export function Eyebrow({
  number,
  children,
  className = "",
}: {
  number?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Label className={className}>
      {number && (
        <>
          <span className="tabular-nums">{number}</span>
          <span aria-hidden="true"> / </span>
          <span className="sr-only"> </span>
        </>
      )}
      {children}
    </Label>
  );
}
