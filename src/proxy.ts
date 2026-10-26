import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";

import { routing } from "@/i18n/routing";
import { db } from "@/lib/db/client";
import { ticketIdByToken } from "@/lib/repairs/access";

// Sends paths without a locale to /en or /ar (cookie first, then Accept-Language),
// keeps the language cookie in sync, and adds hreflang alternates as a Link header.
const intl = createMiddleware(routing);

const ticketPath = /^\/(en|ar)\/r\/([^/]+)$/;

export default async function proxy(request: NextRequest) {
  // A repair ticket's page streams, so it can't set its own 404 status once it has
  // started: an unknown or rotated token is answered here, with the site's not-found
  // page and a real 404.
  const ticket = ticketPath.exec(request.nextUrl.pathname);
  if (ticket && !(await ticketIdByToken(db, ticket[2]))) {
    const notFound = new URL(`/${ticket[1]}/r/${ticket[2]}/not-found`, request.url);
    return NextResponse.rewrite(notFound, { status: 404 });
  }
  return intl(request);
}

export const config = {
  // Everything except the admin (English only), API routes, Next internals and files.
  matcher: ["/((?!api|admin|_next|_vercel|.*\\..*).*)"],
};
