import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

import { parseEnv } from "./src/lib/env-schema";

// Fail `next dev`, `next build` and `next start` early, with a readable list of
// missing or invalid variables, instead of erroring later on first use.
const env = parseEnv(process.env);

// Admin pages, auth and customers' repair tickets (/<locale>/r/<token>): never cached,
// never indexed, and no referrer to leak their URLs.
const privateHeaders = [
  { key: "Cache-Control", value: "private, no-store" },
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
  { key: "Referrer-Policy", value: "no-referrer" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  // Images are stored pre-sized (see src/lib/image-loader.ts), so there is no runtime
  // image optimisation. The sizes match `stockPhotoWidths` in src/config/stock-photos.ts.
  images: {
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
    deviceSizes: [640, 1280, 1920],
    imageSizes: [],
  },
  async headers() {
    return [
      { source: "/admin", headers: privateHeaders },
      { source: "/admin/:path*", headers: privateHeaders },
      { source: "/api/:path*", headers: privateHeaders },
      { source: "/:locale(en|ar)/r/:token", headers: privateHeaders },
    ];
  },
  async rewrites() {
    // With R2, product photos at /media/<key> come straight from the public bucket.
    if (env.STORAGE_DRIVER !== "r2" || !env.R2_PUBLIC_URL) return [];
    return {
      beforeFiles: [{ source: "/media/:path*", destination: `${env.R2_PUBLIC_URL}/:path*` }],
      afterFiles: [],
      fallback: [],
    };
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
