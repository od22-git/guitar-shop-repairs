"use client";

import { useEffect, useId, useState, type ReactNode } from "react";

import { Link, usePathname } from "@/i18n/navigation";

type Props = {
  label: string;
  /** The phone menu button's text. */
  menu: string;
  /** Links marked `end` sit at the inline end on wide screens, next to the language switch. */
  links: { href: string; label: string; end?: boolean }[];
  localeSwitch: ReactNode;
};

/**
 * The header's page links. Wide screens show them in a row; phones show the language switch
 * and a Menu button that opens them as a list under the header. The current section is
 * underlined in blue and marked for screen readers.
 */
export function SiteNav({ label, menu, links, localeSwitch }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState(pathname);
  const panelId = useId();

  // A followed link closes the menu.
  if (open && pathname !== openedAt) setOpen(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <nav aria-label={label} className="flex flex-1 items-center justify-end gap-x-2 md:gap-x-6">
      <div className="md:hidden">{localeSwitch}</div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          setOpenedAt(pathname);
          setOpen((value) => !value);
        }}
        className="inline-flex min-h-11 items-center gap-2 ps-2 font-bold md:hidden"
      >
        {menu}
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className={`size-4 transition-transform motion-reduce:transition-none ${open ? "rotate-45" : ""}`}
        >
          <path d="M10 3v14M3 10h14" stroke="currentColor" strokeWidth="2" />
        </svg>
      </button>
      <ul
        id={panelId}
        className={`${open ? "" : "max-md:hidden"} max-md:absolute max-md:inset-x-0 max-md:top-full max-md:border-b max-md:border-black max-md:bg-white max-md:px-5 max-md:pb-6 md:flex md:flex-1 md:items-center md:gap-x-6`}
      >
        {links.map((link) => {
          const inSection = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <li
              key={link.href}
              className={`max-md:border-b max-md:border-grey-300 ${link.end ? "md:ms-auto" : ""}`}
            >
              <Link
                href={link.href}
                aria-current={inSection ? (pathname === link.href ? "page" : "true") : undefined}
                className="inline-flex min-h-11 items-center font-medium decoration-2 underline-offset-[6px] hover:underline aria-[current]:underline aria-[current]:decoration-blue max-md:min-h-14 max-md:w-full max-md:text-title max-md:font-extrabold max-md:font-stretch-semi-expanded"
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="max-md:hidden">{localeSwitch}</div>
    </nav>
  );
}
