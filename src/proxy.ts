import createMiddleware from "next-intl/middleware";

import { routing } from "@/i18n/routing";

// Sends paths without a locale to /en or /ar (cookie first, then Accept-Language),
// keeps the language cookie in sync, and adds hreflang alternates as a Link header.
export default createMiddleware(routing);

export const config = {
  // Everything except the admin (English only), API routes, Next internals and files.
  matcher: ["/((?!api|admin|_next|_vercel|.*\\..*).*)"],
};
