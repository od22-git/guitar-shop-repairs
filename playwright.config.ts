import { defineConfig, devices } from "@playwright/test";

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
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testIgnore: "env.spec.ts" },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testIgnore: "env.spec.ts" },
    // Spawns its own `next start`; needs no browser and runs once.
    { name: "startup", testMatch: "env.spec.ts" },
  ],
  webServer: {
    command: `pnpm start --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
