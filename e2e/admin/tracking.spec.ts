import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Browser, type Page } from "@playwright/test";
import sharp from "sharp";

import { openTicket, uniquePhone, writeQuote } from "./tickets";

// The "Done when" for M6: the customer's side of a repair. The admin works signed in;
// the customer gets their own browser with no session, as if opening the WhatsApp link.

test.beforeEach(async ({ context }) => {
  await context.route("https://wa.me/**", (route) => route.fulfill({ body: "WhatsApp" }));
});

/** A signed-out browser, opening the tracking link from WhatsApp. */
async function customer(browser: Browser, url: string): Promise<Page> {
  const context = await browser.newContext();
  const page = await context.newPage();
  const response = await page.goto(url);
  expect(response?.status()).toBe(200);
  return page;
}

async function passPhoneCheck(page: Page, digits: string) {
  await page.getByLabel("Last 4 digits of your mobile number").fill(digits);
  await page.getByRole("button", { name: "Show my ticket" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Ticket");
}

test("a courier customer approves the quote on the tracking link and follows it to collection", async ({
  page,
  browser,
}) => {
  test.setTimeout(120_000);
  page.on("dialog", (dialog) => dialog.accept());
  const phone = uniquePhone();
  const { number, trackingUrl } = await openTicket(page, {
    phone: phone.typed,
    name: "Link Customer",
    locale: "English",
    intake: "Courier",
  });
  await writeQuote(page, [
    ["Full setup", "250"],
    ["Strings", "50"],
  ]);
  const status = page.getByRole("region", { name: "Status" });
  await status.getByRole("button", { name: "Mark diagnosed" }).click();
  await expect(status.getByText("Now: Diagnosed")).toBeVisible();

  // A photo shown to the customer, through a short-lived signed link.
  const photo = await sharp({
    create: { width: 1200, height: 900, channels: 3, background: "#4a2f27" },
  })
    .jpeg()
    .toBuffer();
  const photos = page.getByRole("region", { name: "Photos" });
  await page
    .locator("#photo-files")
    .setInputFiles({ name: "intake.jpg", mimeType: "image/jpeg", buffer: photo });
  await expect(photos.getByText("Added 1 photo.")).toBeVisible();
  await photos.getByRole("button", { name: "Show to customer" }).click();
  await expect(photos.getByRole("button", { name: "Hide from customer" })).toBeVisible();

  // The link alone shows nothing personal: only the phone check.
  const visitor = await customer(browser, trackingUrl);
  await expect(visitor.getByRole("heading", { level: 1 })).toHaveText("Your repair ticket");
  for (const secret of [number, "Link Customer", "Jazzmaster", "Buzzing", "AED"]) {
    await expect(visitor.locator("body")).not.toContainText(secret);
  }
  const axe = await new AxeBuilder({ page: visitor }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual(
    [],
  );

  await visitor.getByLabel("Last 4 digits of your mobile number").fill("12");
  await visitor.getByRole("button", { name: "Show my ticket" }).click();
  await expect(visitor.getByText("Enter the 4 digits.")).toBeVisible();
  const wrong = phone.last4 === "0000" ? "1111" : "0000";
  await visitor.getByLabel("Last 4 digits of your mobile number").fill(wrong);
  await visitor.getByRole("button", { name: "Show my ticket" }).click();
  await expect(visitor.getByText("4 tries left")).toBeVisible();
  await passPhoneCheck(visitor, phone.last4);

  await expect(visitor.getByRole("heading", { level: 1 })).toHaveText(`Ticket ${number}`);
  await expect(visitor.getByText("Now: Waiting for your approval")).toBeVisible();
  const quote = visitor.getByRole("region", { name: "Your quote" });
  await expect(quote.getByText("AED 300")).toBeVisible();
  await expect(visitor.getByText("MX21012345")).toHaveCount(0);

  const image = visitor.getByRole("img", { name: "At drop-off, photo 1" });
  await expect(image).toBeVisible();
  const src = (await image.getAttribute("src")) ?? "";
  expect(src).toMatch(/^\/api\/ticket-photos\/repairs\/\d+\/[a-f0-9]+-640\.webp\?e=\d+&s=/);
  const signed = await visitor.request.get(src);
  expect(signed.status()).toBe(200);
  expect(signed.headers()["cache-control"]).toBe("private, no-store");
  // A different first character, whatever the signature starts with.
  const tampered = src.replace(/s=(.)/, (_, c: string) => `s=${c === "x" ? "y" : "x"}`);
  expect((await visitor.request.get(tampered)).status()).toBe(404);
  expect((await visitor.request.get(src.replace(/-640\.webp/, "-1920.webp"))).status()).toBe(404);

  // Courier customers accept the repair terms when they approve.
  await quote.getByRole("button", { name: "Approve the quote" }).click();
  await expect(quote.getByText("Please tick to accept the repair terms.")).toBeVisible();
  await quote.getByLabel("I accept the repair terms below.").check();
  await quote.getByRole("button", { name: "Approve the quote" }).click();
  await expect(quote.getByText(/^You approved this quote on /)).toBeVisible();
  await expect(visitor.getByText("Now: Quote ready")).toBeVisible();

  await page.reload();
  const adminQuote = page.getByRole("region", { name: "Quote" });
  await expect(adminQuote.getByText("Version 1: Approved")).toBeVisible();
  await expect(adminQuote.getByText(/Approved on the tracking link/)).toBeVisible();

  await status.getByRole("button", { name: "Start repair" }).click();
  await expect(status.getByText("Now: In repair")).toBeVisible();
  await status.getByRole("button", { name: "Mark ready" }).click();
  await expect(status.getByText("Now: Ready")).toBeVisible();

  await visitor.reload();
  await expect(visitor.getByText("Now: Ready")).toBeVisible();
  const pay = visitor.getByRole("region", { name: "To pay" });
  await expect(pay.getByText("On collection or delivery: AED 300")).toBeVisible();

  await status.getByLabel("Close as").selectOption("delivered");
  await status.getByRole("button", { name: "Close ticket" }).click();
  await expect(page.getByText("Closed (delivered)")).toBeVisible();
  await visitor.reload();
  await expect(visitor.getByText("Now: Delivered")).toBeVisible();
  await expect(visitor.getByRole("region", { name: "To pay" })).toBeHidden();
  const history = visitor.getByRole("region", { name: "Updates" });
  for (const step of ["Received", "Quote ready", "In repair", "Ready", "Delivered"]) {
    await expect(history.getByText(step, { exact: true })).toBeVisible();
  }
  await visitor.context().close();
});

test("an approval on a quote that changed is refused, and the new version can be approved", async ({
  page,
  browser,
}) => {
  const phone = uniquePhone();
  const { trackingUrl } = await openTicket(page, {
    phone: phone.typed,
    name: "Stale Customer",
    locale: "English",
  });
  await writeQuote(page, [["Fret level", "400"]]);
  await page
    .getByRole("region", { name: "Status" })
    .getByRole("button", { name: "Mark diagnosed" })
    .click();
  await expect(page.getByText("Now: Diagnosed")).toBeVisible();

  const visitor = await customer(browser, trackingUrl);
  await passPhoneCheck(visitor, phone.last4);
  const quote = visitor.getByRole("region", { name: "Your quote" });
  await expect(quote.getByText("Version 1")).toBeVisible();

  // The admin finds more to do while the customer's page is open.
  await writeQuote(page, [
    ["Fret level", "400"],
    ["New nut", "150"],
  ]);
  await expect(page.getByText("Version 2: Waiting for the customer")).toBeVisible();

  await quote.getByRole("button", { name: "Approve the quote" }).click();
  await expect(
    quote.getByText(
      "This quote changed while the page was open. Please reload to see the latest version.",
    ),
  ).toBeVisible();
  await quote.getByRole("button", { name: "Reload" }).click();
  await expect(quote.getByText("Version 2")).toBeVisible();
  await expect(quote.getByText("AED 550")).toBeVisible();

  // A decline asks first.
  visitor.on("dialog", (dialog) => dialog.accept());
  await quote.getByRole("button", { name: "Decline" }).click();
  await expect(quote.getByText(/^You declined this quote on /)).toBeVisible();
  await page.reload();
  await expect(page.getByText("Version 2: Declined")).toBeVisible();
  await visitor.context().close();
});

test("five wrong tries lock the ticket's page for 15 minutes", async ({ page, browser }) => {
  const phone = uniquePhone();
  const { trackingUrl } = await openTicket(page, {
    phone: phone.typed,
    name: "Locked Customer",
    locale: "Arabic",
  });
  expect(trackingUrl).toContain("/ar/r/");
  const visitor = await customer(browser, trackingUrl);
  await expect(visitor.locator("html")).toHaveAttribute("dir", "rtl");
  const wrong = phone.last4 === "0000" ? "1111" : "0000";
  const digits = visitor.getByLabel("آخر 4 أرقام من رقم جوالك");
  const show = visitor.getByRole("button", { name: "اعرض تذكرتي" });
  const left = ["تتبقى 4 محاولات", "تتبقى 3 محاولات", "تتبقى محاولتان", "تتبقى محاولة واحدة"];
  for (const message of left) {
    await digits.fill(wrong);
    await show.click();
    await expect(visitor.getByText(message)).toBeVisible();
  }
  await digits.fill(wrong);
  await show.click();
  await expect(visitor.getByText(/^محاولات خاطئة كثيرة/)).toBeVisible();

  // Locked even for the right digits, typed in Arabic-Indic numerals, and after a reload.
  await visitor.reload();
  const arabic = phone.last4.replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);
  await visitor.getByLabel("آخر 4 أرقام من رقم جوالك").fill(arabic);
  await visitor.getByRole("button", { name: "اعرض تذكرتي" }).click();
  await expect(visitor.getByText(/^محاولات خاطئة كثيرة/)).toBeVisible();
  await expect(visitor.getByRole("heading", { level: 1 })).toHaveText("تذكرة التصليح الخاصة بك");
  await visitor.context().close();
});

test("a rotated or invalid link is a 404, and ticket pages are private", async ({
  page,
  browser,
  request,
}) => {
  page.on("dialog", (dialog) => dialog.accept());
  const phone = uniquePhone();
  const { trackingUrl } = await openTicket(page, {
    phone: phone.typed,
    name: "Rotated Customer",
    locale: "English",
  });
  const visitor = await customer(browser, trackingUrl);
  await passPhoneCheck(visitor, phone.last4);

  const response = await request.get(trackingUrl);
  expect(response.status()).toBe(200);
  expect(response.headers()).toMatchObject({
    "cache-control": "private, no-store",
    "x-robots-tag": "noindex, nofollow",
    "referrer-policy": "no-referrer",
  });
  const html = await response.text();
  expect(html).toContain('<meta name="robots" content="noindex, nofollow"/>');
  expect(html).not.toContain("challenges.cloudflare.com");

  await page.getByRole("button", { name: "Make a new link" }).click();
  await expect(page.getByTestId("tracking-url")).not.toHaveText(trackingUrl);
  const newUrl = (await page.getByTestId("tracking-url").textContent()) ?? "";

  // The old link, and the access it gave, are gone.
  const old = await visitor.goto(trackingUrl);
  expect(old?.status()).toBe(404);
  await expect(visitor.getByRole("heading", { level: 1 })).toHaveText("Page not found");
  expect((await request.get(trackingUrl.replace(/[^/]+$/, "x".repeat(22)))).status()).toBe(404);
  expect((await request.get(trackingUrl.replace(/[^/]+$/, "short"))).status()).toBe(404);

  await visitor.goto(newUrl);
  await expect(visitor.getByRole("heading", { level: 1 })).toHaveText("Your repair ticket");
  await passPhoneCheck(visitor, phone.last4);
  await visitor.context().close();
});

test("an online booking lands in the inbox and becomes a ticket", async ({
  page,
  browser,
  baseURL,
}) => {
  test.setTimeout(90_000);
  const phone = uniquePhone();
  const context = await browser.newContext();
  const visitor = await context.newPage();
  await visitor.goto(`${baseURL}/ar/repairs`);
  const form = visitor.getByRole("region", { name: "احجز موعد تصليح" });
  await form.getByLabel("اسمك").fill("خالد");
  await form.getByLabel("رقم الجوال (واتساب)").fill(phone.typed);
  await form.getByLabel(/الماركة/).fill("Gibson");
  await form.getByLabel(/الطراز/).fill("Les Paul");
  await form.getByLabel("ما الذي تحتاجه الآلة؟").fill("صوت طنين في الوتر السادس");
  await form.getByLabel("استلام عبر شركة شحن").check();
  await form.getByLabel("الإمارة التي نستلم منها").selectOption("dubai");
  await form.getByLabel(/أوافق على الرد/).check();
  // Cloudflare's test key passes once the widget has run.
  await expect(form.locator('input[name="cf-turnstile-response"]')).not.toHaveValue("", {
    timeout: 30_000,
  });
  await form.getByRole("button", { name: "أرسل الحجز" }).click();
  await expect(form.getByText("شكراً لك، وصلنا حجزك")).toBeVisible();
  await context.close();

  await page.goto("/admin/inbox");
  const item = page.getByRole("link", { name: /Repair booking · خالد/ }).first();
  await expect(item).toContainText("Gibson Les Paul");
  await item.click();
  await expect(page.getByText("Wants a courier pickup, Dubai")).toBeVisible();
  const reply = new URL(
    (await page.getByRole("link", { name: "Reply on WhatsApp" }).getAttribute("href")) ?? "",
  );
  expect(reply.pathname).toBe(`/${phone.e164.slice(1)}`);
  expect(reply.searchParams.get("text")).toMatch(/^مرحباً ⁨خالد⁩، شكراً لحجزك موعد تصليح لدى /);

  await page.getByRole("link", { name: "Convert to ticket" }).click();
  await expect(page.getByLabel("Name")).toHaveValue("خالد");
  const local = phone.e164.slice(6);
  await expect(page.getByLabel("Mobile number")).toHaveValue(
    `+971 50 ${local.slice(0, 3)} ${local.slice(3)}`,
  );
  await expect(page.getByLabel("Arabic")).toBeChecked();
  await expect(page.getByLabel("Courier")).toBeChecked();
  await expect(page.getByLabel("Brand")).toHaveValue("Gibson");
  await expect(page.getByLabel("What needs doing")).toHaveValue("صوت طنين في الوتر السادس");
  await page.getByRole("button", { name: "Open ticket" }).click();
  await expect(page).toHaveURL(/\/admin\/repairs\/\d+\?created=1$/);
  const ticketUrl = new URL(page.url()).pathname;

  await page.goBack();
  await page.goto("/admin/inbox?status=converted");
  await page
    .getByRole("link", { name: /Repair booking · خالد/ })
    .first()
    .click();
  await expect(page.getByText("Ticket opened ·")).toBeVisible();
  await expect(page.getByRole("link", { name: "Open its repair ticket" })).toHaveAttribute(
    "href",
    ticketUrl,
  );
  await expect(page.getByRole("link", { name: "Convert to ticket" })).toHaveCount(0);
});
