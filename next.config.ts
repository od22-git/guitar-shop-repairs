import type { NextConfig } from "next";

import { parseEnv } from "./src/lib/env-schema";

// Fail `next dev`, `next build` and `next start` early, with a readable list of
// missing or invalid variables, instead of erroring later on first use.
parseEnv(process.env);

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
