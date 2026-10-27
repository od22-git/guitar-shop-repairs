import { expect, test, type Page } from "@playwright/test";

import { brand } from "../src/config/brand";
import { defaultSettings } from "../src/lib/settings/schema";

// The catalog pivot (M10): the NANOCORE's bundles share one stock, a bundle picker names
// the chosen bundle (and add-on) in the WhatsApp message, and guitar pages stay as they
// were. Against the seeded shop products (src/lib/db/seed.ts).

const siteUrl = process.env.SITE_URL ?? "http://localhost:3000";
const number = defaultSettings.whatsapp_number.slice(1);
const wa = (text: string) => `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
// Names and SKUs are wrapped in Unicode isolates in WhatsApp messages.
const fsi = (text: string) => `⁨${text}⁩`;
const lri = (text: string) => `⁦${text}⁩`;

const locales = {
  en: {
    order: "Order on WhatsApp",
    custom: "Custom Tone Bundle",
    starter: "Starter Bundle",
    device: "Device only",
    addon: "Extra custom tone",
    text: (variant: string) =>
      `Hello ${brand.name.en}, I’d like to order ${fsi("NANOCORE")}, ${fsi(variant)} (SKU ${lri("NANOCORE")}).\n${siteUrl}/en/product/nanocore`,
    withAddon: (variant: string) =>
      `Hello ${brand.name.en}, I’d like to order ${fsi("NANOCORE")}, ${fsi(variant)}, with ${fsi("Extra custom tone")} (SKU ${lri("NANOCORE")}).\n${siteUrl}/en/product/nanocore`,
  },
  ar: {
    order: "اطلب عبر واتساب",
    custom: "باقة النغمات المخصصة",
    starter: "باقة البداية",
    device: "الجهاز فقط",
    addon: "نغمة مخصصة إضافية",
    text: (variant: string) =>
      `مرحباً ${brand.name.ar}، أود طلب ${fsi("NANOCORE")}، ${fsi(variant)} (رمز المنتج ${lri("NANOCORE")}).\n${siteUrl}/ar/product/nanocore`,
    withAddon: (variant: string) =>
      `مرحباً ${brand.name.ar}، أود طلب ${fsi("NANOCORE")}، ${fsi(variant)}، مع ${fsi("نغمة مخصصة إضافية")} (رمز المنتج ${lri("NANOCORE")}).\n${siteUrl}/ar/product/nanocore`,
  },
} as const;

/** Picks an option once the page has hydrated (before that, a click does nothing). */
async function pick(page: Page, name: string) {
  const option = page.getByRole("radio", { name: new RegExp(name) });
  await expect(async () => {
    await option.check({ timeout: 500 });
    await expect(option).toBeChecked({ timeout: 500 });
  }).toPass();
}

for (const [locale, l] of Object.entries(locales)) {
  test(`pick a bundle and order it on WhatsApp with the exact message (${locale})`, async ({
    page,
  }) => {
    await page.goto(`/${locale}/product/nanocore`);
    const order = page.getByRole("link", { name: l.order });
    // The featured bundle is chosen first, so the link works before any JavaScript runs.
    await expect(page.getByRole("radio", { name: new RegExp(l.starter) })).toBeChecked();
    await expect(order).toHaveAttribute("href", wa(l.text(l.starter)));
    await expect(order).toHaveAttribute("target", "_blank");

    await pick(page, l.custom);
    await expect(order).toHaveAttribute("href", wa(l.text(l.custom)));

    const addon = page.getByRole("checkbox", { name: new RegExp(l.addon) });
    await addon.check();
    await expect(order).toHaveAttribute("href", wa(l.withAddon(l.custom)));

    // A tone add-on can't go with the device on its own.
    await pick(page, l.device);
    await expect(addon).toBeDisabled();
    await expect(order).toHaveAttribute("href", wa(l.text(l.device)));
  });
}

test("every bundle shows the product's one stock state and price", async ({ page }) => {
  await page.goto("/en/product/nanocore");
  await expect(page.getByTestId("stock-status")).toHaveCount(1);
  await expect(page.getByTestId("stock-status")).toHaveText("Available");
  for (const [name, price] of [
    ["Device only", "AED 200"],
    ["Starter Bundle", "AED 299"],
    ["Custom Tone Bundle", "AED 349"],
  ]) {
    await pick(page, name);
    await expect(page.getByRole("radio", { name: new RegExp(`${name}.*${price}`) })).toBeChecked();
    await expect(page.getByTestId("stock-status")).toHaveText("Available");
  }
  await expect(page.locator("main")).toContainText("From");
});

test("a device page has its box, warranty and checks, and no guitar specs or condition guide", async ({
  page,
}) => {
  await page.goto("/en/product/nanocore");
  const main = page.locator("main");
  await expect(page.getByRole("heading", { name: "In the box" })).toBeVisible();
  await expect(main).toContainText("The NANOCORE");
  await expect(page.getByRole("heading", { name: "6-month local warranty" })).toBeVisible();
  await page.getByRole("link", { name: "Warranty policy" }).click();
  await expect(page).toHaveURL("/en/policies/warranty");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Warranty");

  await page.goto("/en/product/nanocore");
  await expect(page.getByRole("heading", { name: "Tested by us" })).toBeVisible();
  for (const check of [
    "Powers on and charges",
    "Every socket works",
    "Every knob, button and the screen respond",
    "Updated to the latest firmware",
    "Played through headphones and an amp",
  ]) {
    await expect(main.getByRole("listitem").filter({ hasText: check })).toBeVisible();
  }
  await expect(page.getByRole("link", { name: "How we grade condition" })).toHaveCount(0);
  await expect(page.getByText("Body style")).toHaveCount(0);
  // Stand-in photos are labelled as such.
  await expect(main.getByText("Stand-in photos: they show the idea")).toBeVisible();
});

test("guitar pages are unchanged: specs, condition guide, one order button", async ({ page }) => {
  await page.goto("/en/product/epiphone-sg-standard-ebony");
  await expect(page.getByRole("link", { name: "How we grade condition" })).toBeVisible();
  await expect(page.getByText("Body style")).toBeVisible();
  await expect(page.getByRole("radio")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Order on WhatsApp" })).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "In the box" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Tested by us" })).toHaveCount(0);
  await expect(page.getByText("Stand-in photos")).toHaveCount(0);
});

test("the shop lists the NANOCORE from its lowest bundle, labelled stand-in, without the add-on", async ({
  page,
}) => {
  await page.goto("/en/shop/devices-bundles");
  const card = page.locator("main ul a[href='/en/product/nanocore']");
  await expect(card).toContainText("From");
  await expect(card).toContainText("AED 200");
  await expect(card).toContainText("3 ways to buy");
  await expect(card).toContainText("Stand-in photo");
  await expect(page.locator("a[href*='extra-custom-tone']")).toHaveCount(0);
  expect((await page.request.get("/en/product/extra-custom-tone")).status()).toBe(404);
  // The draft footswitch isn't shown, and its empty category stays out of the menu.
  await expect(page.getByRole("link", { name: "Footswitches" })).toHaveCount(0);
  expect((await page.request.get("/en/product/nanocore-footswitch")).status()).toBe(404);
});

test("the NANOCORE's JSON-LD is an AggregateOffer over its bundles", async ({ page }) => {
  await page.goto("/en/product/nanocore");
  const json = await page.locator('script[type="application/ld+json"]').textContent();
  const { offers } = JSON.parse(json!);
  expect(offers).toMatchObject({
    "@type": "AggregateOffer",
    lowPrice: "200.00",
    highPrice: "349.00",
    offerCount: 3,
    priceCurrency: "AED",
    availability: "https://schema.org/InStock",
  });
  expect(offers.offers.map((o: { name: string }) => o.name)).toEqual([
    "Device only",
    "Starter Bundle",
    "Custom Tone Bundle",
  ]);
});
