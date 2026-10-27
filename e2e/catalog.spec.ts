import { expect, test, type Page } from "@playwright/test";

import { brand } from "../src/config/brand";
import { defaultSettings } from "../src/lib/settings/schema";

// The public catalog against the seeded sample products (src/lib/db/seed.ts).

const siteUrl = process.env.SITE_URL ?? "http://localhost:3000";
const number = defaultSettings.whatsapp_number.slice(1);
const wa = (text: string) => `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
// Product titles and SKUs are wrapped in Unicode isolates in WhatsApp messages.
const fsi = (text: string) => `⁨${text}⁩`;
const lri = (text: string) => `⁦${text}⁩`;

/** On phones the filters fold behind a button, which works once the page has hydrated. */
async function openFilters(page: Page, label: string) {
  // The results and their toolbar stream in; the sort menu shows on every screen size.
  await expect(page.getByRole("combobox", { name: /Sort by|الترتيب حسب/ })).toBeVisible();
  const toggle = page.getByRole("button", { name: label });
  if (!(await toggle.isVisible())) return;
  await expect(async () => {
    if ((await toggle.getAttribute("aria-expanded")) !== "true") await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true", { timeout: 500 });
  }).toPass();
}

/** Product links in the results. Next keeps the previous page hidden in the DOM, so only visible ones. */
const productLinks = (page: Page) =>
  page.locator("main ul a[href*='/product/']").filter({ visible: true });

const journeys = {
  en: {
    shop: "Shop",
    category: "Used guitars",
    filters: "Filters",
    twoItems: "2 items",
    order: "Order on WhatsApp",
    text: `Hello ${brand.name.en}, I’d like to order ${fsi("Fender Stratocaster, sunburst")} (SKU ${lri("SAMPLE-G-001")}).\n${siteUrl}/en/product/fender-stratocaster-sunburst`,
    title: "Fender Stratocaster, sunburst",
  },
  ar: {
    shop: "المتجر",
    category: "جيتارات مستعملة",
    filters: "الفلاتر",
    twoItems: "منتجان",
    order: "اطلب عبر واتساب",
    text: `مرحباً ${brand.name.ar}، أود طلب ${fsi("فندر ستراتوكاستر، صن برست")} (رمز المنتج ${lri("SAMPLE-G-001")}).\n${siteUrl}/ar/product/fender-stratocaster-sunburst`,
    title: "فندر ستراتوكاستر، صن برست",
  },
} as const;

for (const [locale, j] of Object.entries(journeys)) {
  test(`browse, filter, open a product and order on WhatsApp (${locale})`, async ({ page }) => {
    await page.goto(`/${locale}`);
    // Phones fold the header links behind the Menu button.
    const menu = page.getByRole("button", { name: /^(Menu|القائمة)$/ });
    if (await menu.isVisible()) await menu.click();
    await page
      .getByRole("navigation", { name: /Main|القائمة/ })
      .getByRole("link", { name: j.shop })
      .click();
    await expect(page).toHaveURL(`/${locale}/shop`);

    await page.getByRole("link", { name: j.category, exact: true }).first().click();
    await expect(page).toHaveURL(`/${locale}/shop/used-guitars`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(j.category);

    await openFilters(page, j.filters);
    await page.getByRole("checkbox", { name: "Fender" }).check();
    await expect(page).toHaveURL(`/${locale}/shop/used-guitars?brand=Fender`);
    await expect(page.getByText(j.twoItems, { exact: true })).toBeVisible();
    const cards = productLinks(page);
    await expect(cards).toHaveCount(2);
    await expect(cards.nth(0)).toHaveAttribute(
      "href",
      `/${locale}/product/fender-stratocaster-sunburst`,
    );
    await expect(cards.nth(1)).toHaveAttribute(
      "href",
      `/${locale}/product/fender-player-telecaster-tidepool`,
    );

    await cards.nth(0).click();
    await expect(page).toHaveURL(`/${locale}/product/fender-stratocaster-sunburst`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(j.title);
    const order = page.getByRole("link", { name: j.order });
    await expect(order).toHaveAttribute("href", wa(j.text));
    await expect(order).toHaveAttribute("target", "_blank");
    await expect(order).toHaveAttribute("rel", /noopener/);
  });
}

test.describe("filters", () => {
  test("combine, survive a reload, and can be cleared from an empty result", async ({ page }) => {
    await page.goto("/en/shop/used-guitars?brand=Fender&condition=fair");
    await expect(page.getByText("Nothing matches these filters.")).toBeVisible();
    await openFilters(page, "Filters");
    await expect(page.getByRole("checkbox", { name: "Fender" })).toBeChecked();

    await page.getByRole("link", { name: "Clear filters" }).click();
    await expect(page).toHaveURL("/en/shop/used-guitars");
    await expect(page.getByText("5 items", { exact: true })).toBeVisible();
    await openFilters(page, "Filters");
    await expect(page.getByRole("checkbox", { name: "Fender" })).not.toBeChecked();
  });

  test("filter by pickups, body style, price and availability", async ({ page }) => {
    await page.goto("/en/shop/used-guitars?pickups=HH");
    await expect(productLinks(page)).toHaveCount(3);
    await page.goto("/en/shop/used-guitars?body=t_style");
    await expect(productLinks(page)).toHaveCount(1);
    await page.goto("/en/shop?min=1000&max=3000");
    await expect(productLinks(page)).toHaveCount(3);
    await page.goto("/en/shop?available=1");
    await expect(page.getByText("6 items", { exact: true })).toBeVisible();
  });

  test("offer guitar filters only on the guitars, and ignore them elsewhere", async ({ page }) => {
    await page.goto("/en/shop?pickups=HH&brand=Fender");
    await expect(page.getByText("9 items", { exact: true })).toBeVisible();
    await openFilters(page, "Filters");
    await expect(page.getByRole("group", { name: "Brand" })).toHaveCount(0);
    await expect(page.getByRole("group", { name: "Condition" })).toHaveCount(0);
    await expect(page.getByRole("checkbox", { name: "Available now only" })).toBeVisible();

    await page.goto("/en/shop/used-guitars");
    await openFilters(page, "Filters");
    await expect(page.getByRole("checkbox", { name: "Fender" })).toBeVisible();
  });

  test("sorts by price, with sold items last", async ({ page }) => {
    await page.goto("/en/shop");
    await page
      .getByRole("combobox", { name: "Sort by" })
      .selectOption({ label: "Price, low to high" });
    await expect(page).toHaveURL("/en/shop?sort=price-asc");
    const hrefs = await page
      .locator("main ul a[href*='/product/']")
      .evaluateAll((links) => links.map((a) => a.getAttribute("href")));
    expect(hrefs[0]).toBe("/en/product/bell-knobs-white-set-of-3");
    expect(hrefs.at(-1)).toBe("/en/product/epiphone-les-paul-standard-cherry");
  });

  test("leave drafts out of the shop", async ({ page }) => {
    await page.goto("/en/shop");
    await expect(page.locator("a[href='/en/product/ibanez-rg550-draft']")).toHaveCount(0);
  });
});

test.describe("product states", () => {
  test("a sold guitar offers similar ones instead of an order", async ({ page }) => {
    await page.goto("/en/product/epiphone-les-paul-standard-cherry");
    await expect(page.getByTestId("stock-status")).toHaveText("Sold");
    await expect(page.getByRole("link", { name: "Order on WhatsApp" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Ask about similar" })).toHaveAttribute(
      "href",
      wa(
        `Hello ${brand.name.en}, I see ${fsi("Epiphone Les Paul Standard, cherry flame")} (SKU ${lri("SAMPLE-G-003")}) has sold. Do you have anything similar?\n${siteUrl}/en/product/epiphone-les-paul-standard-cherry`,
      ),
    );
  });

  test("a held guitar shows On hold and asks to be told if it comes free", async ({ page }) => {
    await page.goto("/en/product/fender-player-telecaster-tidepool");
    await expect(page.getByTestId("stock-status")).toHaveText("On hold");
    await expect(page.getByRole("link", { name: "Order on WhatsApp" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Ask to be told if it comes free" })).toBeVisible();
    // The hold note is the owner's, never the customer's.
    await expect(page.locator("body")).not.toContainText("Deposit AED 500");
  });

  test("sold-out gear says Sold out", async ({ page }) => {
    await page.goto("/ar/product/instrument-cable-3m");
    await expect(page.getByTestId("stock-status")).toHaveText("نفدت الكمية");
  });

  test("a price drop shows the old price struck through", async ({ page }) => {
    await page.goto("/en/product/fender-stratocaster-sunburst");
    await expect(page.locator("main s")).toHaveText("AED 3,800");
    await expect(page.getByText("Was AED 3,800")).toBeAttached();
  });

  test("never shows the serial", async ({ page }) => {
    await page.goto("/en/product/gibson-les-paul-standard-tobacco-burst");
    expect(await page.content()).not.toContain("SAMPLE-SERIAL-002");
  });
});

test.describe("missing pages", () => {
  for (const path of [
    "/en/product/ibanez-rg550-draft",
    "/ar/product/ibanez-rg550-draft",
    "/en/product/no-such-guitar",
  ]) {
    test(`${path} is a 404`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(404);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        path.startsWith("/ar") ? "الصفحة غير موجودة" : "Page not found",
      );
    });
  }

  test("an unknown category shows not found and is kept out of search", async ({ page }) => {
    await page.goto("/en/shop/no-such-category");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Page not found");
    await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toBeAttached();
  });
});

test("an item without Arabic text falls back to English, marked as English", async ({ page }) => {
  await page.goto("/ar/product/bell-knobs-white-set-of-3");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  const title = page.getByRole("heading", { level: 1 });
  await expect(title).toHaveText("Bell knobs, white, set of 3");
  await expect(title).toHaveAttribute("lang", "en");
  await expect(title).toHaveAttribute("dir", "auto");
  await expect(page.getByText("هذا الإعلان متوفر بالإنجليزية فقط حالياً.")).toBeVisible();
  await expect(page.getByText("One volume and two tone knobs")).toHaveAttribute("lang", "en");
  // The page around it stays Arabic.
  await expect(page.getByRole("link", { name: "اطلب عبر واتساب" })).toBeVisible();
});

test.describe("gallery", () => {
  for (const locale of ["en", "ar"] as const) {
    test(`steps through the photos, the right way round (${locale})`, async ({ page }) => {
      await page.goto(`/${locale}/product/epiphone-sg-standard-ebony`);
      const slides = page.locator("main ul[aria-label] > li");
      await expect(slides).toHaveCount(2);
      const [first, second] = [
        await slides.nth(0).boundingBox(),
        await slides.nth(1).boundingBox(),
      ];
      // The second photo waits on the inline-end side: right in English, left in Arabic.
      if (locale === "en") expect(second!.x).toBeGreaterThan(first!.x);
      else expect(second!.x).toBeLessThan(first!.x);

      await page
        .getByRole("button", { name: locale === "en" ? "Next photo" : "الصورة التالية" })
        .click();
      await expect(slides.nth(1)).toBeInViewport({ ratio: 0.9 });
      await expect(page.getByRole("button", { name: /Show photo 2|عرض الصورة 2/ })).toHaveAttribute(
        "aria-current",
        "true",
      );
      for (const image of await page.locator("main img").all()) {
        expect(await image.evaluate((img) => getComputedStyle(img).transform)).toBe("none");
      }
    });
  }
});

test("the condition grade links to the condition guide", async ({ page }) => {
  await page.goto("/en/product/epiphone-sg-standard-ebony");
  await page.getByRole("link", { name: "How we grade condition" }).click();
  await expect(page).toHaveURL("/en/faq#condition");
  await expect(page.getByRole("heading", { name: "How we grade condition" })).toBeVisible();
  await expect(page.locator("#condition dt")).toHaveText([
    "New",
    "Mint",
    "Excellent",
    "Very good",
    "Good",
    "Fair",
  ]);
});

test.describe("SEO", () => {
  test("product pages carry hreflang, a canonical URL and a JPEG link preview", async ({
    page,
    request,
  }) => {
    await page.goto("/ar/product/fender-stratocaster-sunburst");
    const path = "product/fender-stratocaster-sunburst";
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      `${siteUrl}/ar/${path}`,
    );
    for (const [lang, href] of [
      ["en", `${siteUrl}/en/${path}`],
      ["ar", `${siteUrl}/ar/${path}`],
      ["x-default", `${siteUrl}/en/${path}`],
    ]) {
      await expect(page.locator(`link[rel="alternate"][hreflang="${lang}"]`)).toHaveAttribute(
        "href",
        href,
      );
    }
    const image = await page.locator('meta[property="og:image"]').getAttribute("content");
    expect(image).toBe(`${siteUrl}/images/samples/strat-sunburst-og.jpg`);
    const response = await request.get(new URL(image!).pathname);
    expect(response.headers()["content-type"]).toBe("image/jpeg");
  });

  test("product JSON-LD states the price and availability", async ({ page }) => {
    const offer = async (slug: string) => {
      await page.goto(`/en/product/${slug}`);
      const json = await page.locator('script[type="application/ld+json"]').textContent();
      return JSON.parse(json!).offers;
    };
    expect(await offer("fender-stratocaster-sunburst")).toMatchObject({
      price: "3450.00",
      priceCurrency: "AED",
      availability: "https://schema.org/InStock",
    });
    expect((await offer("fender-player-telecaster-tidepool")).availability).toBe(
      "https://schema.org/Reserved",
    );
    expect((await offer("epiphone-les-paul-standard-cherry")).availability).toBe(
      "https://schema.org/SoldOut",
    );
  });

  test("the sitemap lists listed products in both languages and no drafts", async ({ request }) => {
    const xml = await (await request.get("/sitemap.xml")).text();
    for (const locale of ["en", "ar"]) {
      expect(xml).toContain(`<loc>${siteUrl}/${locale}/product/fender-stratocaster-sunburst</loc>`);
      expect(xml).toContain(
        `<loc>${siteUrl}/${locale}/product/epiphone-les-paul-standard-cherry</loc>`,
      );
      expect(xml).toContain(`<loc>${siteUrl}/${locale}/shop/parts-knobs</loc>`);
      expect(xml).toContain(`<loc>${siteUrl}/${locale}/product/nanocore</loc>`);
      expect(xml).toContain(`<loc>${siteUrl}/${locale}/policies/warranty</loc>`);
    }
    // Footswitches have only a draft so far, and add-ons have no page.
    expect(xml).not.toContain("/shop/footswitches");
    expect(xml).not.toContain("extra-custom-tone");
    expect(xml).not.toContain("ibanez-rg550-draft");
  });

  test("robots.txt points at the sitemap and keeps crawlers out of the admin", async ({
    request,
  }) => {
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Disallow: /admin");
    expect(robots).toContain(`Sitemap: ${siteUrl}/sitemap.xml`);
  });
});
