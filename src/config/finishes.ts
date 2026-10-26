// The finishes behind the site's palette, shown as the colour chart graphic.
// `swatch` is a Tailwind background class using the matching token in globals.css.
export const finishes = [
  { key: "sonicBlue", swatch: "bg-mist" },
  { key: "lakePlacidBlue", swatch: "bg-ink" },
  { key: "fiestaRed", swatch: "bg-fiesta" },
  { key: "shorelineGold", swatch: "bg-gold" },
  { key: "sherwoodGreen", swatch: "bg-sherwood" },
  { key: "rosewood", swatch: "bg-rosewood" },
] as const;

export type FinishKey = (typeof finishes)[number]["key"];
