import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    // "server-only" throws outside Next's server bundle; tests run as server code.
    alias: { "server-only": new URL("./src/test/empty-module.ts", import.meta.url).pathname },
  },
});
