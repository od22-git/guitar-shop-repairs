import { expect, test } from "@playwright/test";

import { cspViolations, watchCsp } from "../csp";

// The admin, signed in, works under the Content-Security-Policy (src/lib/security-headers.ts).

test("admin pages load with nothing blocked by the CSP", async ({ page }) => {
  test.slow();
  await watchCsp(page);
  for (const path of [
    "/admin",
    "/admin/products",
    "/admin/products/new",
    "/admin/repairs",
    "/admin/repairs/new",
    "/admin/orders",
    "/admin/orders/new",
    "/admin/inbox",
    "/admin/settings",
  ]) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(200);
    await expect(page.getByRole("heading", { level: 1 }), path).toBeVisible();
    await page.waitForLoadState("load");
    expect(await cspViolations(page), path).toEqual([]);
  }

  // A product's page, with its photos and the photo picker.
  await page.goto("/admin/products");
  await page.locator("main a[href^='/admin/products/']").filter({ visible: true }).last().click();
  await expect(page).toHaveURL(/\/admin\/products\/\d+/);
  await page.waitForLoadState("load");
  expect(await cspViolations(page)).toEqual([]);
});
