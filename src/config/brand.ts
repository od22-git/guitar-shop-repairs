// The brand must match the trade licence ("Midtown Gears"), so change it here and only here.
// Arabic running text uses the Arabic name; the Latin wordmark is used everywhere else,
// in both languages (src/components/wordmark.tsx).
export const brand = {
  name: { en: "Midtown Gears", ar: "ميدتاون جيرز" },
  /** The letters-only wordmark. */
  wordmark: "MIDTOWN GEARS",
  tagline: {
    en: "Big tone, no big-brand tax.",
    ar: "صوت كبير، بلا ضريبة الماركات.",
  },
  // Online-first and UAE-wide; the home workshop's address is never published.
  location: { en: "UAE", ar: "الإمارات" },
  /**
   * Social handles, without the @. Each link stays hidden while its handle is null; set the
   * handle once the account exists (docs/OWNER-TODO.md).
   */
  social: {
    instagram: null as string | null,
    tiktok: null as string | null,
  },
} as const;

// The WhatsApp number is an admin-editable setting: see src/lib/settings.

export type Brand = typeof brand;

export type SocialNetwork = keyof Brand["social"];

const profileUrl: Record<SocialNetwork, (handle: string) => string> = {
  instagram: (handle) => `https://www.instagram.com/${encodeURIComponent(handle)}/`,
  tiktok: (handle) => `https://www.tiktok.com/@${encodeURIComponent(handle)}`,
};

/** The social profiles to link to: only the networks whose handle is set. */
export function socialLinks(social: Brand["social"] = brand.social) {
  return (Object.keys(profileUrl) as SocialNetwork[]).flatMap((network) => {
    const handle = social[network]?.trim().replace(/^@/, "");
    return handle ? [{ network, handle, url: profileUrl[network](handle) }] : [];
  });
}
