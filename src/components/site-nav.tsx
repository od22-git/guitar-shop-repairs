"use client";

import { Link, usePathname } from "@/i18n/navigation";

type Props = {
  label: string;
  /** `wide` links show only from the sm breakpoint: phones have room for two. */
  links: { href: string; label: string; wide?: boolean }[];
};

/** The header's page links; the current section is marked for screen readers and in gold. */
export function SiteNav({ label, links }: Props) {
  const pathname = usePathname();

  return (
    <nav aria-label={label}>
      <ul className="flex items-center gap-1">
        {links.map((link) => {
          const inSection = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <li key={link.href} className={link.wide ? "max-sm:hidden" : undefined}>
              <Link
                href={link.href}
                aria-current={inSection ? (pathname === link.href ? "page" : "true") : undefined}
                className="inline-flex min-h-11 items-center rounded-sm px-3 font-semibold hover:text-gold aria-[current]:text-gold"
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
