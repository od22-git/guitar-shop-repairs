import { expect, test, type Page } from "@playwright/test";

import { brand } from "../src/config/brand";
import { defaultSettings } from "../src/lib/settings/schema";

const locales = ["en", "ar"] as const;
const greeting = {
  en: `Hello ${brand.name.en}, I have a question.`,
  ar: `مرحباً ${brand.name.ar}، لدي سؤال.`,
};

type Box = { x: number; y: number; width: number; height: number };
const overlaps = (a: Box, b: Box) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

async function buttonBox(page: Page): Promise<Box> {
  const box = await page.getByTestId("whatsapp-button").boundingBox();
  if (!box) throw new Error("WhatsApp button is not visible");
  return box;
}

for (const locale of locales) {
  test.describe(`WhatsApp button (${locale})`, () => {
    test("opens a chat with the shop and a greeting in the page's language", async ({ page }) => {
      await page.goto(`/${locale}`);
      const button = page.getByTestId("whatsapp-button");
      const number = defaultSettings.whatsapp_number.slice(1);
      await expect(button).toHaveAttribute(
        "href",
        `https://wa.me/${number}?text=${encodeURIComponent(greeting[locale])}`,
      );
      await expect(button).toHaveAttribute("rel", /noopener/);
      await expect(button).toHaveAccessibleName(
        locale === "en" ? "Message us on WhatsApp" : "راسلنا على واتساب",
      );
    });

    test("sits at the inline end of the screen", async ({ page }) => {
      await page.goto(`/${locale}`);
      const box = await buttonBox(page);
      const width = page.viewportSize()!.width;
      if (locale === "en") expect(width - (box.x + box.width)).toBeLessThan(32);
      else expect(box.x).toBeLessThan(32);
    });

    test("never covers content at the end of the page", async ({ page }) => {
      await page.goto(`/${locale}`);
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      const button = await buttonBox(page);
      const content = page.locator("main :is(h1,h2,p,a,li), footer :is(h2,p,a)");
      for (const element of await content.all()) {
        const box = await element.boundingBox();
        if (box) expect(overlaps(box, button), await element.innerText()).toBe(false);
      }
    });

    test("never covers the focused element", async ({ page }) => {
      await page.goto(`/${locale}`);
      const focusable = await page
        .locator("a[href], button, input, select, textarea, [tabindex]:not([tabindex='-1'])")
        .count();
      for (let i = 0; i < focusable; i++) {
        await page.keyboard.press("Tab");
        const focused = page.locator(":focus");
        if ((await focused.getAttribute("data-testid")) === "whatsapp-button") continue;
        const box = await focused.boundingBox();
        if (box) {
          expect(overlaps(box, await buttonBox(page)), await focused.innerText()).toBe(false);
        }
      }
    });
  });
}
