import { expect, test } from "@playwright/test";

import { brand } from "../src/config/brand";

test("home page renders the brand", async ({ page }) => {
  const response = await page.goto("/en");
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle(brand.name.en);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(brand.tagline.en);
  await expect(page.getByRole("banner")).toContainText(brand.name.en);
});

test("the pre-launch site is not indexable", async ({ page }) => {
  for (const locale of ["en", "ar"]) {
    await page.goto(`/${locale}`);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      "noindex, nofollow",
    );
  }
});

test("responses do not advertise the framework", async ({ request }) => {
  const response = await request.get("/en");
  expect(response.headers()["x-powered-by"]).toBeUndefined();
});
