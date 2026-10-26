import { expect, test } from "@playwright/test";

import ar from "../messages/ar.json";
import en from "../messages/en.json";
import { brand } from "../src/config/brand";

// The M9a design system page: the wordmark, the components and the new photos, in both
// languages. axe runs on it in a11y.spec.ts.

const messages = { en, ar } as const;

for (const locale of ["en", "ar"] as const) {
  const m = messages[locale].DesignSystem;

  test(`the design system page shows the components (${locale})`, async ({ page }) => {
    const response = await page.goto(`/${locale}/design-system`);
    expect(response?.status()).toBe(200);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);

    // The wordmark stays Latin and left to right in Arabic too.
    const wordmark = page.getByText(brand.wordmark, { exact: true }).first();
    await expect(wordmark).toBeVisible();
    await expect(wordmark).toHaveAttribute("dir", "ltr");
    await expect(wordmark).toHaveAttribute("translate", "no");

    const main = page.getByRole("main");
    for (const heading of [m.wordmarkHeading, m.typeHeading, m.buttonsHeading, m.formsHeading]) {
      await expect(
        main.getByRole("heading", { level: 2, name: heading, exact: true }),
      ).toBeVisible();
    }
    await expect(main.getByRole("link", { name: m.primary }).first()).toHaveAttribute(
      "href",
      `/${locale}/shop`,
    );

    // Option cards are real radios: picking one unpicks the other.
    const starter = main.getByRole("radio", { name: new RegExp(m.bundles.starter.name) });
    const device = main.getByRole("radio", { name: new RegExp(m.bundles.device.name) });
    await expect(starter).toBeChecked();
    await device.check();
    await expect(device).toBeChecked();
    await expect(starter).not.toBeChecked();

    // The field with an error says so to assistive technology.
    const phone = main.getByLabel(m.phoneLabel);
    await expect(phone).toHaveAttribute("aria-invalid", "true");
    await expect(phone).toHaveAccessibleDescription(`${m.phoneHint} ${m.phoneError}`);

    // Nothing runs past the edge of the screen.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBe(0);
  });
}

test("the design system page isn't in the sitemap", async ({ request }) => {
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).not.toContain("design-system");
});

test("social links stay hidden while the handles are unset", async ({ page }) => {
  test.skip(
    Boolean(brand.social.instagram || brand.social.tiktok),
    "a handle is set in src/config/brand.ts",
  );
  await page.goto("/en");
  await expect(page.locator('a[href*="instagram.com"], a[href*="tiktok.com"]')).toHaveCount(0);
});
