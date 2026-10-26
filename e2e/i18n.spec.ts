import { expect, test } from "@playwright/test";

import { brand } from "../src/config/brand";

const noRedirect = { maxRedirects: 0 };

test.describe("locale detection", () => {
  test("an Arabic browser is sent to /ar", async ({ request }) => {
    const response = await request.get("/", {
      ...noRedirect,
      headers: { "accept-language": "ar-AE,ar;q=0.9,en;q=0.8" },
    });
    expect(response.status()).toBe(307);
    expect(response.headers().location).toBe("/ar");
  });

  test("an English browser is sent to /en", async ({ request }) => {
    const response = await request.get("/", {
      ...noRedirect,
      headers: { "accept-language": "en-GB,en;q=0.9" },
    });
    expect(response.headers().location).toBe("/en");
  });

  test("any other language, or none, falls back to English", async ({ request }) => {
    for (const language of ["fr-FR,fr;q=0.9", "hi-IN", ""]) {
      const response = await request.get("/", {
        ...noRedirect,
        headers: { "accept-language": language },
      });
      expect(response.headers().location, language).toBe("/en");
    }
  });

  test("the language cookie wins over the browser language", async ({ request }) => {
    const response = await request.get("/", {
      ...noRedirect,
      headers: { "accept-language": "en-US,en;q=0.9", cookie: "NEXT_LOCALE=ar" },
    });
    expect(response.headers().location).toBe("/ar");
  });

  test("paths without a locale keep their path", async ({ request }) => {
    const response = await request.get("/shop?x=1", {
      ...noRedirect,
      headers: { "accept-language": "ar" },
    });
    expect(response.headers().location).toBe("/ar/shop?x=1");
  });

  test("pages announce both languages and x-default to search engines", async ({ request }) => {
    const response = await request.get("/ar");
    const links = response
      .headersArray()
      .find((h) => h.name.toLowerCase() === "link" && h.value.includes("alternate"));
    expect(links?.value).toContain('hreflang="en"');
    expect(links?.value).toContain('hreflang="ar"');
    expect(links?.value).toContain('hreflang="x-default"');
  });
});

test.describe("document language and direction", () => {
  test("English is lang=en, left-to-right", async ({ page }) => {
    await page.goto("/en");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  });

  test("Arabic is lang=ar, right-to-left, with Arabic content", async ({ page }) => {
    await page.goto("/ar");
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page).toHaveTitle(brand.name.ar);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(brand.tagline.ar);
  });

  test("Arabic text uses Alexandria and Latin text uses Archivo", async ({ page }) => {
    await page.goto("/ar");
    await page.evaluate(() => document.fonts.ready);
    const loaded = await page.evaluate(() =>
      [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family),
    );
    expect(loaded.some((family) => /alexandria/i.test(family))).toBe(true);
    expect(loaded.some((family) => /archivo/i.test(family))).toBe(true);
  });

  test("unknown pages are a localized 404 inside the site layout", async ({ page }) => {
    const response = await page.goto("/ar/no-such-page");
    expect(response?.status()).toBe(404);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("الصفحة غير موجودة");
  });
});

test.describe("language switch", () => {
  test("goes to the same page in the other language and is remembered", async ({
    page,
    context,
  }) => {
    await page.goto("/en");
    const toArabic = page.getByRole("link", { name: "العربية" });
    await expect(toArabic).toHaveAttribute("lang", "ar");
    await expect(toArabic).toHaveAttribute("hreflang", "ar");
    await toArabic.click();
    await expect(page).toHaveURL(/\/ar$/);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");

    // Coming back to the bare domain later lands on Arabic, whatever the browser says.
    const cookies = await context.cookies();
    expect(cookies.find((c) => c.name === "NEXT_LOCALE")?.value).toBe("ar");
    await page.goto("/");
    await expect(page).toHaveURL(/\/ar$/);

    await page.getByRole("link", { name: "English" }).click();
    await expect(page).toHaveURL(/\/en$/);
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  });

  test("keeps the current path", async ({ page }) => {
    await page.goto("/en/no-such-page");
    await expect(page.getByRole("link", { name: "العربية" })).toHaveAttribute(
      "href",
      "/ar/no-such-page",
    );
  });
});
