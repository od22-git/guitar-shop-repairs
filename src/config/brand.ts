// The brand name is a placeholder until the owner picks one. It must match the
// trade licence, so change it here (and only here) before applying.
export const brand = {
  name: { en: "Colour Chart Guitars", ar: "كولور تشارت للجيتار" },
  tagline: {
    en: "Used electric guitars, gear and repairs",
    ar: "جيتارات كهربائية مستعملة ومعدات وتصليح",
  },
  location: { en: "Ras Al Khaimah, UAE", ar: "رأس الخيمة، الإمارات" },
  // PLACEHOLDER, not the shop's number. The owner's dedicated WhatsApp Business number
  // replaces it; from M2 it lives in the admin-editable settings table instead.
  whatsappE164: "+971500000000",
} as const;

export type Brand = typeof brand;
