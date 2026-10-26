"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/repairs", label: "Repairs" },
];

/** `unsent`: WhatsApp updates waiting to be sent, shown as a badge on Repairs. */
export function AdminNav({ unsent }: { unsent: number }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin">
      <ul className="flex gap-4">
        {items.map(({ href, label }) => {
          const current = href === "/admin" ? pathname === href : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={current ? "page" : undefined}
                className="inline-block py-2 underline-offset-8 aria-[current=page]:font-semibold aria-[current=page]:text-gold aria-[current=page]:underline"
              >
                {label}
                {href === "/admin/repairs" && unsent > 0 && (
                  <span className="ms-1.5 inline-block min-w-6 rounded-full bg-fiesta px-1.5 text-center text-sm font-bold text-white no-underline">
                    {unsent}
                    <span className="sr-only"> unsent {unsent === 1 ? "update" : "updates"}</span>
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
