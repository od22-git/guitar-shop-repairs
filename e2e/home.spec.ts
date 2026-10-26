import { expect, test } from "@playwright/test";

import { brand } from "../src/config/brand";
import { stockPhotos, type StockPhotoKey } from "../src/config/stock-photos";

// The photos on the home page.
const homePhotos: StockPhotoKey[] = ["bend", "workbench", "player"];

for (const locale of ["en", "ar"] as const) {
  test.describe(`home page photos (${locale})`, () => {
    test("every photo loads from the site itself, sized for the screen, with alt text", async ({
      page,
    }) => {
      await page.goto(`/${locale}`);
      const images = page.locator("main img");
      await expect(images).toHaveCount(homePhotos.length);
      for (const image of await images.all()) {
        await image.scrollIntoViewIfNeeded();
        await expect(image).toHaveAttribute("alt", /\S/);
        await expect(image).toHaveAttribute("src", /^\/images\/stock\/[a-z]+-\d+\.webp$/);
        await expect(image).toHaveAttribute("srcset", /-640\.webp 640w, .*-1920\.webp 1920w/);
        await expect
          .poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth))
          .toBeGreaterThan(0);
      }
    });

    test("photos are never mirrored for right-to-left", async ({ page }) => {
      await page.goto(`/${locale}`);
      for (const image of await page.locator("main img").all()) {
        expect(await image.evaluate((img) => getComputedStyle(img).transform)).toBe("none");
      }
    });

    test("credits each photographer, linking to Unsplash", async ({ page }) => {
      await page.goto(`/${locale}`);
      const credits = page.locator("main p", { hasText: "Unsplash" });
      for (const key of homePhotos) {
        const { author, username } = stockPhotos[key];
        await expect(credits.getByRole("link", { name: author })).toHaveAttribute(
          "href",
          `https://unsplash.com/@${username}?utm_source=guitar_shop_repairs&utm_medium=referral`,
        );
      }
    });
  });
}

test("the setup button leads to the repairs page", async ({ page }) => {
  await page.goto("/en");
  await page.getByRole("link", { name: "Book a setup" }).first().click();
  await expect(page).toHaveURL("/en/repairs");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Repairs and setups");
});

test("the headline is the tagline, with its highlight in blue", async ({ page }) => {
  await page.goto("/en");
  const heading = page.getByRole("heading", { level: 1 });
  await expect(heading).toHaveText(brand.tagline.en);
  await expect(heading.getByText(brand.taglineHighlight.en)).toHaveCSS("color", "rgb(31, 91, 255)");
});

test("the custom tones link opens the tones questions", async ({ page }) => {
  await page.goto("/en");
  await page.getByRole("link", { name: "How custom tones work" }).click();
  await expect(page).toHaveURL("/en/faq#tones");
  await expect(page.getByRole("heading", { level: 2, name: "Custom tones" })).toBeVisible();
});

test("the NANOCORE section lists its bundles and asks on WhatsApp", async ({ page }) => {
  await page.goto("/en");
  const section = page.getByRole("region", { name: "NANOCORE" });
  for (const [name, price] of [
    ["Device only", "AED 200"],
    ["Starter Bundle", "AED 299"],
    ["Custom Tone Bundle", "AED 349"],
  ]) {
    await expect(section.getByRole("listitem").filter({ hasText: name })).toContainText(price);
  }
  await expect(section.getByRole("link", { name: "Ask about NANOCORE" })).toHaveAttribute(
    "href",
    /^https:\/\/wa\.me\/\d+\?text=Hello%20Midtown%20Gears%2C%20I%E2%80%99d%20like%20to%20ask%20about%20the%20NANOCORE/,
  );
});
