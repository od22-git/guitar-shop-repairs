import { z } from "zod";

// The `specs` column of a product. Every field is optional: gear uses few of them.
// Values are technical terms written as the owner types them ("Alder"); the labels are
// translated, the values are shown as written. Body style and pickup layout are fixed
// lists instead, because the shop filters on them.
const text = z.string().trim().min(1).max(200);

/** Body shapes the shop filters on. Labels are in messages/*.json under "BodyStyle". */
export const bodyStyles = [
  "s_style",
  "t_style",
  "single_cut",
  "double_cut",
  "offset",
  "superstrat",
  "semi_hollow",
  "hollow",
  "other",
] as const;

/**
 * Pickup layouts, neck to bridge: H humbucker, S single-coil, P P-90. Labels are in
 * messages/*.json under "PickupLayout".
 */
export const pickupLayouts = [
  "S",
  "SS",
  "SSS",
  "HS",
  "HSS",
  "HSH",
  "H",
  "HH",
  "HHH",
  "P",
  "PP",
] as const;

export type BodyStyle = (typeof bodyStyles)[number];
export type PickupLayout = (typeof pickupLayouts)[number];

export const productSpecsSchema = z
  .object({
    bodyStyle: z.enum(bodyStyles),
    body: text,
    finish: text,
    neck: text,
    fretboard: text,
    frets: z.int().min(1).max(36),
    scale: text,
    pickupLayout: z.enum(pickupLayouts),
    /** Pickup models, e.g. "Burstbucker Pro". */
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
