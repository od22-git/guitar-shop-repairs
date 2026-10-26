import type { MetadataRoute } from "next";

import { env } from "@/lib/env";

// Crawlers may read the public site; the admin and API are off limits. Until launch (M9)
// every page also says noindex (see the locale layout), so nothing is indexed yet.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] },
    sitemap: new URL("/sitemap.xml", env.SITE_URL).toString(),
  };
}
