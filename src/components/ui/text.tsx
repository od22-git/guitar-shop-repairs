import type { ComponentProps, ReactNode } from "react";

// The M9a type scale (docs/design.md). Headings are Archivo Black, set wider as they get
// bigger; Arabic (Alexandria) gets more line height and is never letter-spaced.

const headings = {
  /** The one huge statement on a page. Uppercase in Latin. */
  display:
    "text-display font-black uppercase tracking-[-0.02em] font-stretch-expanded rtl:leading-[1.35] rtl:tracking-normal max-md:font-stretch-normal",
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

/** The intro paragraph under a big heading: 34 characters a line, or 48 when `wide`. */
export function Lead({
  wide = false,
  className = "",
  ...props
}: { wide?: boolean } & ComponentProps<"p">) {
  return (
    <p
      className={`${wide ? "max-w-[48ch]" : "max-w-[34ch]"} text-lead text-pretty ${className}`}
      {...props}
    />
  );
}

/** A word or two in a heading picked out in blue, kept on one line. */
export function Highlight({ children }: { children: ReactNode }) {
  return <span className="whitespace-nowrap text-blue">{children}</span>;
}

/** `text` with the first `phrase` in it highlighted, for text from config (the tagline). */
export function withHighlight(text: string, phrase: string): ReactNode {
  const at = text.indexOf(phrase);
  if (!phrase || at < 0) return text;
  return (
    <>
      {text.slice(0, at)}
      <Highlight>{phrase}</Highlight>
      {text.slice(at + phrase.length)}
    </>
  );
}

/**
 * A small monospaced label: section numbers, categories, notes under prices. Uppercase and
 * letter-spaced in Latin. Arabic labels are set in Alexandria (the grotesk stack), unspaced:
 * the mono font's wide spaces would leave gaps between Arabic words.
 */
export function Label({
  as: Tag = "span",
  className = "",
  ...props
}: { as?: "span" | "p" | "div" | "h2" | "h3" } & Omit<ComponentProps<"span">, "ref">) {
  return (
    <Tag
      className={`font-mono text-label font-medium tracking-[0.08em] uppercase rtl:font-grotesk rtl:text-sm rtl:tracking-normal ${className}`}
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
