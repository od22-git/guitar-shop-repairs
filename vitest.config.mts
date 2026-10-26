import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    // "server-only" throws outside Next's server bundle; tests run as server code.
    alias: { "server-only": new URL("./src/test/empty-module.ts", import.meta.url).pathname },
    // Database tests always run on PGlite. Given a real Postgres server (CI sets this),
    // the concurrency tests also run there, on separate connections.
    provide: { testPostgresUrl: process.env.TEST_DATABASE_URL ?? "" },
  },
});
