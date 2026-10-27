// The NANOCORE's ways to buy and their launch prices, in fils, from the business plan
// ("subject to change"). The home page shows them until M10 makes them variants of the
// NANOCORE product, edited in admin; then this file goes. Names and details are in
// messages/*.json under Home.nanocore.variants.
export const nanocoreVariants = [
  { key: "device", fils: 200_00 },
  { key: "starter", fils: 299_00, pick: true },
  { key: "custom", fils: 349_00 },
] as const;

/** One more custom tone, on either bundle. */
export const extraToneFils = 50_00;
