import type { ComponentProps } from "react";

// Bidi isolation for values inside running text. Without it, Arabic text reorders
// neighbouring Latin runs: "+971 50…" shows as "971+", "R-0001" as "0001-R".

/** Isolates a value whose direction follows its own content (names, mixed text, prices). */
export function Bdi(props: ComponentProps<"bdi">) {
  return <bdi {...props} />;
}

/** Forces left-to-right: phone numbers, serials, SKUs, ticket numbers. */
export function Ltr(props: Omit<ComponentProps<"bdi">, "dir">) {
  return <bdi {...props} dir="ltr" />;
}
