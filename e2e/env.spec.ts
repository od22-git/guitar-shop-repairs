import { spawnSync } from "node:child_process";

import { expect, test } from "@playwright/test";

// The "Done when" for M0: a missing env var stops startup with a clear message.
// Runs `next start` with DATABASE_URL blank and checks it exits before serving.
// Blank rather than unset: Next never overrides a variable that is already in the
// environment, so a developer's .env.local can't fill it back in.
test("startup fails with a clear message when a required variable is missing", () => {
  test.setTimeout(60_000);
  const env = { ...process.env, DATABASE_URL: "", SITE_URL: "http://localhost:3999" };

  const result = spawnSync("pnpm", ["exec", "next", "start", "--port", "3999"], {
    env,
    encoding: "utf8",
    timeout: 45_000,
  });

  expect(result.signal, "next start kept running instead of failing").toBeNull();
  expect(result.status).not.toBe(0);
  const output = `${result.stdout}\n${result.stderr}`;
  expect(output).toContain("Invalid environment variables:");
  expect(output).toContain("DATABASE_URL: is missing (required)");
});
