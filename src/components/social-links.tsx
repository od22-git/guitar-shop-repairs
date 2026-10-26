import { socialLinks } from "@/config/brand";

const names = { instagram: "Instagram", tiktok: "TikTok" } as const;

/**
 * Links to the shop's Instagram and TikTok. Each one shows only once its handle is set in
 * src/config/brand.ts, so nothing shows until the accounts exist.
 */
export function SocialLinks({
  linkClass,
  className = "",
}: {
  linkClass: string;
  className?: string;
}) {
  const links = socialLinks();
  if (links.length === 0) return null;

  return (
    <ul className={`flex flex-wrap gap-x-6 ${className}`}>
      {links.map(({ network, url }) => (
        <li key={network}>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
            translate="no"
          >
            {names[network]}
          </a>
        </li>
      ))}
    </ul>
  );
}
