import { expect, test } from "@playwright/test";

import ar from "../messages/ar.json";
import en from "../messages/en.json";
import { brand } from "../src/config/brand";
import { policies } from "../src/config/policies";
import { defaultSettings } from "../src/lib/settings/schema";

// About, Contact, the FAQ and the policies (M8), in both languages.

const messages = { en, ar } as const;
const locales = ["en", "ar"] as const;

for (const locale of locales) {
  const m = messages[locale];

  test.describe(`content pages (${locale})`, () => {
    test("about tells the shop's story and leads to the shop and contact", async ({ page }) => {
      await page.goto(`/${locale}/about`);
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(m.About.heading);
      for (const section of Object.values(m.About.sections)) {
        await expect(page.getByRole("heading", { level: 2, name: section.heading })).toBeVisible();
      }
      await expect(page.getByRole("main")).toContainText(brand.name[locale]);
      await expect(
        page.getByRole("main").getByRole("link", { name: m.About.contactCta }),
      ).toHaveAttribute("href", `/${locale}/contact`);
    });

    test("contact offers WhatsApp and a call, without an address", async ({ page }) => {
      await page.goto(`/${locale}/contact`);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(m.Contact.title);
      const main = page.getByRole("main");
      const number = defaultSettings.whatsapp_number;
      await expect(main.getByRole("link", { name: m.WhatsApp.cta })).toHaveAttribute(
        "href",
        new RegExp(`^https://wa\\.me/${number.slice(1)}\\?text=`),
      );
      // The number reads left to right in Arabic too.
      const call = main.locator(`a[href="tel:${number}"]`);
      await expect(call).toHaveText("+971 50 000 0000");
      await expect(call.locator("bdi")).toHaveAttribute("dir", "ltr");
      await expect(main).toContainText(brand.location[locale]);
    });

    test("the FAQ answers every group's questions and links each policy", async ({ page }) => {
      await page.goto(`/${locale}/faq`);
      await expect(page.locator("#condition")).toBeVisible();
      const main = page.getByRole("main");
      for (const group of Object.values(m.Faq.groups)) {
        await expect(main.getByRole("heading", { level: 2, name: group.heading })).toBeVisible();
        for (const { q } of Object.values(group.questions)) {
          await expect(main.getByRole("heading", { level: 3, name: q })).toBeVisible();
        }
      }
      // Numbers come from src/config/policies.ts, not left as placeholders.
      await expect(main).not.toContainText("{");
      for (const policy of policies) {
        await expect(main.getByRole("link", { name: m.Policies[policy].title })).toHaveAttribute(
          "href",
          `/${locale}/policies/${policy}`,
        );
      }
    });

    for (const policy of policies) {
      test(`the ${policy} policy has every section`, async ({ page }) => {
        const response = await page.goto(`/${locale}/policies/${policy}`);
        expect(response?.status()).toBe(200);
        await expect(page.getByRole("heading", { level: 1 })).toHaveText(m.Policies[policy].title);
        const main = page.getByRole("main");
        await expect(main).toContainText(m.Policies.updated.replace(/\{date\}.*/, "").trim());
        await expect(main).not.toContainText("{");
        await expect(main.locator("h2")).toHaveCount(
          Object.keys(m.Policies[policy].sections).length + 1, // + "Other policies"
        );
      });
    }

    test("the delivery policy lists the delivery zones' fees", async ({ page }) => {
      await page.goto(`/${locale}/policies/delivery`);
      const table = page.getByRole("table", { name: m.Policies.zonesCaption });
      // The seeded zones (src/lib/db/seed.ts).
      await expect(table.getByRole("row")).toHaveCount(4);
      await expect(table.getByRole("row").nth(1)).toContainText(locale === "en" ? "AED" : "د.إ.");
    });

    test("the footer links the about, contact and policy pages", async ({ page }) => {
      await page.goto(`/${locale}`);
      const footer = page.getByRole("contentinfo");
      for (const [name, href] of [
        [m.Footer.about, "/about"],
        [m.Footer.contact, "/contact"],
        ...policies.map((policy) => [m.Policies[policy].title, `/policies/${policy}`]),
      ]) {
        await expect(footer.getByRole("link", { name, exact: true })).toHaveAttribute(
          "href",
          `/${locale}${href}`,
        );
      }
    });
  });
}

test("an unknown policy is a real 404", async ({ request }) => {
  expect((await request.get("/en/policies/refunds")).status()).toBe(404);
  expect((await request.get("/ar/policies")).status()).toBe(404);
});

test("the header links Contact on wide screens; phones find it behind Menu", async ({
  page,
  isMobile,
}) => {
  await page.goto("/en/contact");
  const nav = page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Contact" });
  if (isMobile) {
    await expect(nav).toBeHidden();
    const menu = page.getByRole("button", { name: "Menu" });
    await menu.click();
    await expect(menu).toHaveAttribute("aria-expanded", "true");
    await expect(nav).toHaveAttribute("aria-current", "page");
    await page.keyboard.press("Escape");
    await expect(nav).toBeHidden();
    // Following a link closes the menu too.
    await menu.click();
    await page
      .getByRole("navigation", { name: "Main" })
      .getByRole("link", { name: "About" })
      .click();
    await expect(page).toHaveURL("/en/about");
    await expect(nav).toBeHidden();
  } else {
    await expect(page.getByRole("button", { name: "Menu" })).toBeHidden();
    await expect(nav).toHaveAttribute("aria-current", "page");
  }
});

test("the sitemap lists the content pages in both languages", async ({ request }) => {
  const xml = await (await request.get("/sitemap.xml")).text();
  for (const locale of locales) {
    for (const path of ["/about", "/contact", ...policies.map((p) => `/policies/${p}`)]) {
      expect(xml).toContain(`/${locale}${path}</loc>`);
    }
  }
});
