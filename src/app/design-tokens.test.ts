import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

// WCAG 2.2 AA: 4.5:1 for body text, 3:1 for large text (24px, or 18.66px bold) and for
// UI parts and focus rings against what's next to them. Mirror any change in docs/design.md.
const TEXT = 4.5;
const LARGE_OR_UI = 3;

type Pair = [foreground: string, background: string, minimum: number, use: string];

// M9a, Midtown Gears: black on white, greys, blue for highlights, red for errors.
const pairs: Pair[] = [
  ["black", "white", TEXT, "body text and headings"],
  ["black", "grey-100", TEXT, "text on raised surfaces"],
  ["grey-600", "white", TEXT, "muted text"],
  ["grey-600", "grey-100", TEXT, "muted text on raised surfaces"],
  ["blue", "white", TEXT, "highlighted words in headings and text"],
  ["white", "blue", TEXT, "highlight badge"],
  ["white", "black", TEXT, "primary button; text on black sections; solid badge"],
  ["grey-400", "black", TEXT, "muted text on black sections"],
  ["white", "grey-800", TEXT, "primary button, hover"],
  ["black", "grey-300", TEXT, "inverse button, hover"],
  ["red", "white", TEXT, "error messages"],
  ["blue", "white", LARGE_OR_UI, "focus ring on white"],
  ["blue", "black", LARGE_OR_UI, "focus ring on black"],
  ["black", "white", LARGE_OR_UI, "input and button edges"],
  ["grey-600", "white", LARGE_OR_UI, "unselected option card edge"],
  ["red", "white", LARGE_OR_UI, "edge of a field with an error"],
];

// M1–M8: the dark look the pages still use until M9b, which deletes these with the tokens.
const legacyPairs: Pair[] = [
  ["mist", "ink", TEXT, "body text"],
  ["ink-subtle", "ink", TEXT, "secondary text"],
  ["gold", "ink", TEXT, "headings, link underlines, focus ring"],
  ["mist", "rosewood", TEXT, "text on rosewood"],
  ["ink-subtle", "rosewood", TEXT, "secondary text on rosewood"],
  ["gold", "rosewood", TEXT, "headings and focus ring on rosewood"],
  ["white", "fiesta", TEXT, "primary button"],
  ["white", "fiesta-deep", TEXT, "primary button, hover"],
  ["fiesta", "ink", LARGE_OR_UI, "primary button edge on the page"],
  ["white", "sherwood", TEXT, "WhatsApp button"],
  ["mist", "rosewood", LARGE_OR_UI, "WhatsApp button ring over rosewood"],
  ["ink", "mist", TEXT, "skip link"],
  ["ink", "paper", TEXT, "text on light cards"],
  ["ink-muted", "mist", TEXT, "secondary text on mist"],
  ["ink-muted", "paper", TEXT, "secondary text on light cards"],
  ["fiesta-deep", "mist", TEXT, "small red text on mist"],
  ["fiesta-deep", "paper", TEXT, "small red text on light cards"],
  ["ink", "white", TEXT, "admin form inputs"],
  ["ink-muted", "white", LARGE_OR_UI, "admin input borders"],
];

const css = readFileSync(new URL("./globals.css", import.meta.url), "utf8");

function token(name: string): string {
  const match = css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-f]{6})\\b`, "i"));
  if (!match) throw new Error(`--color-${name} is not defined as a hex colour in globals.css`);
  return match[1];
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

describe("colour tokens meet WCAG AA", () => {
  it("computes contrast like the WCAG formula", () => {
    expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrast("#777777", "#ffffff")).toBeCloseTo(4.48, 2);
  });

  it.each(pairs)("%s on %s ≥ %s:1 (%s)", (foreground, background, minimum) => {
    expect(contrast(token(foreground), token(background))).toBeGreaterThanOrEqual(minimum);
  });

  it.each(legacyPairs)("M1 tokens: %s on %s ≥ %s:1 (%s)", (foreground, background, minimum) => {
    expect(contrast(token(foreground), token(background))).toBeGreaterThanOrEqual(minimum);
  });

  it("keeps the brand colours as the owners gave them", () => {
    expect(token("black")).toBe("#0a0a0a");
    expect(token("blue")).toBe("#1f5bff");
  });
});
