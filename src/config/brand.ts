// The brand name is a placeholder until the owner picks one. It must match the
// trade licence, so change it here (and only here) before applying.
export const brand = {
  name: { en: "Colour Chart Guitars", ar: "كولور تشارت للجيتار" },
  tagline: {
    en: "Used electric guitars, gear and repairs",
    ar: "جيتارات كهربائية مستعملة ومعدات وتصليح",
  },
  location: { en: "Ras Al Khaimah, UAE", ar: "رأس الخيمة، الإمارات" },
} as const;

export type Brand = typeof brand;
