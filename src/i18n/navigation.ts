import { createNavigation } from "next-intl/navigation";

import { routing } from "./routing";

// Locale-aware wrappers around Next's navigation APIs. Use these, not next/link,
// for links between pages of the site.
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
