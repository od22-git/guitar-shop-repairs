import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const pages = [
  "/en",
  "/ar",
  "/en/no-such-page",
  "/ar/no-such-page",
  "/en/shop",
  "/ar/shop/electric-guitars?brand=Fender",
  "/en/shop?brand=Fender&condition=fair",
  "/en/product/epiphone-sg-standard-ebony",
  "/ar/product/fender-player-telecaster-tidepool",
  "/ar/product/marshall-ms-2-micro-amp",
  "/en/faq",
  "/ar/faq",
  "/en/repairs",
  "/ar/repairs",
  "/en/sell",
  "/ar/sell",
];

for (const path of pages) {
  test(`axe finds no serious or critical issues on ${path}`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
      .analyze();
    const serious = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );
    expect(
      serious.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target).join(", ")})`),
    ).toEqual([]);
  });
}

test("the skip link moves focus to the main content", async ({ page }) => {
  await page.goto("/en");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await skip.press("Enter");
  await expect(page.locator("main")).toBeFocused();
});
