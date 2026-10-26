import { expect, test, type Page } from "@playwright/test";

import { openTicket } from "./tickets";

// M8b: walkthrough rows (docs/PLAN.md, "Use-case walkthrough") that no other test
// covered end to end. docs/walkthrough-tests.md maps every row to its test.

test.beforeEach(async ({ context }) => {
  await context.route("https://wa.me/**", (route) => route.fulfill({ body: "WhatsApp" }));
});

/** A random Saudi mobile number (+966 5x), for a customer from elsewhere in the GCC. */
function saudiPhone() {
  const digits = String(Math.floor(Math.random() * 10_000_000)).padStart(7, "0");
  return { typed: `+966 55 ${digits}`, e164: `+96655${digits}`, last4: digits.slice(-4) };
}

test("a GCC customer's ticket opens with the last 4 digits of their number", async ({
  page,
  browser,
}) => {
  const phone = saudiPhone();
  const { number, trackingUrl } = await openTicket(page, {
    phone: phone.typed,
    name: "Faisal GCC",
    locale: "English",
  });
  const context = await browser.newContext();
  const visitor = await context.newPage();
  await visitor.goto(trackingUrl);
  await visitor.getByLabel("Last 4 digits of your mobile number").fill(phone.last4);
  await visitor.getByRole("button", { name: "Show my ticket" }).click();
  await expect(visitor.getByRole("heading", { level: 1 })).toContainText(number);
  await context.close();
});

test("a ticket link's preview shows only the brand and 'Repair ticket'", async ({
  page,
  playwright,
  baseURL,
}) => {
  const phone = saudiPhone();
  const { number, trackingUrl } = await openTicket(page, {
    phone: phone.typed,
    name: "Preview Customer",
    locale: "English",
  });
  // What WhatsApp's link-preview fetcher gets: no cookies at all.
  const fetcher = await playwright.request.newContext({ baseURL });
  const html = await (await fetcher.get(trackingUrl)).text();
  await fetcher.dispose();

  expect(html).toMatch(/<title>Repair ticket[^<]*<\/title>/);
  for (const secret of [
    "Preview Customer",
    "Jazzmaster",
    "MX21012345",
    number,
    phone.e164.slice(4),
  ]) {
    expect(html, secret).not.toContain(secret);
  }
  for (const property of ["og:title", "og:description"]) {
    const content = /content="([^"]*)"/.exec(
      html.match(new RegExp(`<meta[^>]+property="${property}"[^>]*>`))?.[0] ?? "",
    )?.[1];
    if (content) expect(content, property).not.toMatch(/Preview Customer|Jazzmaster|R-\d/);
  }
});

async function fillBooking(page: Page, name: string) {
  const form = page.getByRole("region", { name: "Book a repair" });
  await form.getByLabel("Your name").fill(name);
  await form.getByLabel("Mobile number (WhatsApp)").fill("050 765 4321");
  await form.getByLabel(/^Brand/).fill("Ibanez");
  await form.getByLabel(/^Model/).fill("RG550");
  await form.getByLabel("What needs doing?").fill("Fret buzz");
  await form.getByLabel("I’ll drop it off").check();
  await form.getByLabel(/You can reply and send repair updates/).check();
  await expect(form.locator('input[name="cf-turnstile-response"]')).not.toHaveValue("", {
    timeout: 30_000,
  });
  return form;
}

test("a booking with the hidden honeypot filled in is refused and never reaches the inbox", async ({
  page,
  browser,
  baseURL,
}) => {
  test.setTimeout(90_000);
  const name = `Bot ${Date.now()}`;
  const context = await browser.newContext();
  const visitor = await context.newPage();
  await visitor.goto(`${baseURL}/en/repairs`);
  const form = await fillBooking(visitor, name);
  // People never see this field; bots fill in everything.
  await form.locator('input[name="website"]').evaluate((input: HTMLInputElement) => {
    input.value = "https://spam.example";
  });
  await form.getByRole("button", { name: "Send booking" }).click();
  await expect(form.getByText("We couldn’t confirm you’re a person.")).toBeVisible();
  await context.close();

  await page.goto("/admin/inbox");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText(name)).toHaveCount(0);
});
