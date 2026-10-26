import type { ReactNode } from "react";

import { Label } from "./text";

const variants = {
  /** Picks one thing out: "Most picked", "New". White on blue (5.25:1). */
  highlight: "bg-blue text-white",
  /** A state that needs no colour: "On hold", "Used". */
  outline: "inset-ring-1 inset-ring-current",
  /** On photos and black sections: "Sold". */
  solid: "bg-black text-white",
} as const;

export type BadgeVariant = keyof typeof variants;

/** A short mono label in a box. Its text must make sense on its own, without the colour. */
export function Badge({
  variant = "highlight",
  children,
  className = "",
}: {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Label
      className={`inline-block w-max px-2 py-1 align-middle ${variants[variant]} ${className}`}
    >
      {children}
    </Label>
  );
}
