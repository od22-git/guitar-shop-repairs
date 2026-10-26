import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { expect, test as setup } from "@playwright/test";

import { totpCode } from "../../src/test/totp";

import { ADMIN } from "./admin";

function admin(...args: string[]) {
  return execFileSync("pnpm", ["-s", ...args], {
    env: { ...process.env, ADMIN_PASSWORD: ADMIN.password },
    encoding: "utf8",
    stdio: "pipe",
  });
}

setup("create the admin, sign in and set up 2FA", async ({ page }) => {
  try {
    admin("admin:create", ADMIN.email, "--name", "E2E admin");
  } catch (error) {
    if (!String((error as { stderr?: string }).stderr).includes("already exists")) throw error;
    admin("admin:reset-password", ADMIN.email);
  }
  admin("admin:reset-2fa", ADMIN.email);

  await page.goto("/admin");
  await expect(page).toHaveURL("/admin/login");
  await page.getByLabel("Email").fill(ADMIN.email);
  await page.getByLabel("Password").fill(ADMIN.password);
  await page.getByRole("button", { name: "Sign in" }).click();

  // Signed in with a password only: 2FA comes first, and nothing else opens.
  await expect(page).toHaveURL("/admin/setup-2fa");
  await page.goto("/admin/products");
  await expect(page).toHaveURL("/admin/setup-2fa");

  await page.getByLabel("Confirm your password").fill(ADMIN.password);
  await page.getByRole("button", { name: "Continue" }).click();
  const secret = (await page.getByTestId("totp-secret").textContent()) ?? "";
  expect(secret).toMatch(/^[A-Z2-7]+=*$/);
  await page.getByLabel("Enter the 6-digit code").fill(totpCode(secret));
  await page.getByRole("button", { name: "Turn on 2FA" }).click();
  await expect(page).toHaveURL("/admin");
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();

  mkdirSync(path.dirname(ADMIN.storageState), { recursive: true });
  writeFileSync(ADMIN.totpFile, JSON.stringify({ secret }));
  await page.context().storageState({ path: ADMIN.storageState });
});
