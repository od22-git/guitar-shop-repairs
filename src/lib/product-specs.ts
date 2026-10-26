import { z } from "zod";

// The `specs` column of a product. Every field is optional: gear uses few of them.
// Values are technical terms written as the owner types them ("Alder", "SSS"); the
// labels are translated, the values are shown as written.
const text = z.string().trim().min(1).max(200);

export const productSpecsSchema = z
  .object({
    body: text,
    finish: text,
    neck: text,
    fretboard: text,
    frets: z.int().min(1).max(36),
    scale: text,
    pickups: text,
    weightKg: z.number().positive().max(30),
    // Admin only (public DTOs leave it out until the owner decides on a serials policy).
    serial: text,
    case: text,
    mods: text,
  })
  .partial()
  .strict();

export type ProductSpecs = z.infer<typeof productSpecsSchema>;
