"use client";

import { Link, usePathname } from "@/i18n/navigation";

type Props = {
  label: string;
  /** Links marked `from` show only from that breakpoint: phones have room for two. */
  links: { href: string; label: string; from?: "sm" | "md" }[];
};

const hiddenBelow = { sm: "max-sm:hidden", md: "max-md:hidden" } as const;

/** The header's page links; the current section is marked for screen readers and in gold. */
export function SiteNav({ label, links }: Props) {
  const pathname = usePathname();

  return (
    <nav aria-label={label}>
      <ul className="flex items-center gap-1">
        {links.map((link) => {
          const inSection = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <li key={link.href} className={link.from && hiddenBelow[link.from]}>
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
