import { expect, test } from "@playwright/test";

import { brand } from "../src/config/brand";
import { stockPhotos } from "../src/config/stock-photos";
import { defaultSettings } from "../src/lib/settings/schema";

for (const locale of ["en", "ar"] as const) {
  test.describe(`home page photos (${locale})`, () => {
    test("every photo loads from the site itself, sized for the screen, with alt text", async ({
      page,
    }) => {
      await page.goto(`/${locale}`);
      const images = page.locator("main img");
      await expect(images).toHaveCount(7);
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
      for (const { author, username } of Object.values(stockPhotos)) {
        await expect(credits.getByRole("link", { name: author })).toHaveAttribute(
          "href",
          `https://unsplash.com/@${username}?utm_source=guitar_shop_repairs&utm_medium=referral`,
        );
      }
    });
  });
}

test("the repairs button opens WhatsApp with a repair question", async ({ page }) => {
  await page.goto("/en");
  const text = `Hello ${brand.name.en}, I’d like to ask about a repair.`;
  await expect(page.getByRole("link", { name: "Ask about a repair" })).toHaveAttribute(
    "href",
    `https://wa.me/${defaultSettings.whatsapp_number.slice(1)}?text=${encodeURIComponent(text)}`,
  );
});
