"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/repairs", label: "Repairs" },
  { href: "/admin/inbox", label: "Inbox" },
  { href: "/admin/settings", label: "Settings" },
];

/**
 * Badges: `unsent` WhatsApp updates waiting to be sent, on Repairs; `inbox` new items
 * from the public forms, on Inbox.
 */
export function AdminNav({ unsent, inbox }: { unsent: number; inbox: number }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin">
      <ul className="flex flex-wrap gap-x-4">
        {items.map(({ href, label }) => {
          const current = href === "/admin" ? pathname === href : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={current ? "page" : undefined}
                className="inline-block py-2 underline-offset-8 aria-[current=page]:font-semibold aria-[current=page]:underline"
              >
                {label}
                {href === "/admin/repairs" && unsent > 0 && (
                  <Badge n={unsent} label={unsent === 1 ? "unsent update" : "unsent updates"} />
                )}
                {href === "/admin/inbox" && inbox > 0 && (
                  <Badge n={inbox} label={inbox === 1 ? "new item" : "new items"} />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function Badge({ n, label }: { n: number; label: string }) {
  return (
    <span className="ms-1.5 inline-block min-w-6 rounded-full bg-blue px-1.5 text-center text-sm font-bold text-white no-underline">
      {n}
      <span className="sr-only"> {label}</span>
    </span>
  );
}
