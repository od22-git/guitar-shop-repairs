import { defineConfig, devices } from "@playwright/test";

import { ADMIN } from "./e2e/admin/admin";

const port = Number(process.env.PORT ?? 3000);
const baseURL = `http://localhost:${port}`;

// E2E runs against the production build (`pnpm build` first), like CI.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { baseURL, trace: "on-first-retry" },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: ["env.spec.ts", "admin/**"],
    },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testIgnore: ["env.spec.ts", "admin/**"] },
    // Spawns its own `next start`; needs no browser and runs once.
    { name: "startup", testMatch: "env.spec.ts" },
    // Signed-in admin tests add products, so they run after the public tests, which
    // count the sample products. The setup signs in once and shares the session.
    { name: "admin-setup", testMatch: "admin/auth.setup.ts", dependencies: ["desktop", "mobile"] },
    {
      name: "admin-desktop",
      testMatch: "admin/*.spec.ts",
      dependencies: ["admin-setup"],
      use: { ...devices["Desktop Chrome"], storageState: ADMIN.storageState },
    },
    {
      name: "admin-mobile",
      testMatch: "admin/*.spec.ts",
      dependencies: ["admin-setup"],
      use: { ...devices["Pixel 7"], storageState: ADMIN.storageState },
    },
  ],
  webServer: {
    command: `pnpm start --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
