import { expect, test } from "@playwright/test";

import { brand } from "../src/config/brand";

test("home page renders the brand", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle(brand.name.en);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(brand.name.en);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("the pre-launch site is not indexable", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
});

test("responses do not advertise the framework", async ({ request }) => {
  const response = await request.get("/");
  expect(response.headers()["x-powered-by"]).toBeUndefined();
});
