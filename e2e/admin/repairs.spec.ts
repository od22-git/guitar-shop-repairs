import { expect, test } from "@playwright/test";
import sharp from "sharp";

import { messages, openTicket, sendFirst, uniquePhone } from "./tickets";

// The "Done when" for M5: a ticket from intake to closed, through diagnosis, an
// in-person approval, the repair and Ready, with the exact WhatsApp message at each
// step. Runs signed in (see auth.setup.ts).

const FSI = "⁨";
const LRI = "⁦";
const PDI = "⁩";
const iso = (text: string) => `${FSI}${text}${PDI}`;
const ltr = (text: string) => `${LRI}${text}${PDI}`;

test.beforeEach(async ({ context }) => {
  // "Send on WhatsApp" opens wa.me in a new tab; answer it locally.
  await context.route("https://wa.me/**", (route) => route.fulfill({ body: "WhatsApp" }));
  await context.route("https://api.whatsapp.com/**", (route) =>
    route.fulfill({ body: "WhatsApp" }),
  );
});

test("a repair from intake to collection, with the WhatsApp message at each step", async ({
  page,
}) => {
  test.setTimeout(120_000);
  page.on("dialog", (dialog) => dialog.accept());
  const phone = uniquePhone();
  const { number, trackingUrl } = await openTicket(page, {
    phone: phone.typed,
    name: "E2E Customer",
    locale: "English",
  });
  expect(trackingUrl).toMatch(/^http:\/\/localhost:\d+\/en\/r\/[A-Za-z0-9_-]{22}$/);
  const hello = `Hello ${iso("E2E Customer")}`;
  const instrument = `your ${iso("Fender Jazzmaster")}`;
  const ticket = `(ticket ${ltr(number)})`;
  const track = `Follow your repair here: ${trackingUrl}`;

  expect(await messages(page)).toEqual([
    {
      phone: phone.e164.slice(1),
      text: `${hello}, we’ve received ${instrument} for repair. Your ticket number is ${ltr(number)}.\n${track}`,
    },
  ]);
  await sendFirst(page);

  // Diagnose: no status change until there's a quote.
  const status = page.getByRole("region", { name: "Status" });
  await expect(status.getByText("Mark diagnosed: needs a quote.")).toBeVisible();
  const quote = page.getByRole("region", { name: "Quote" });
  await quote.getByRole("button", { name: "Write a quote" }).click();
  await quote.getByLabel("Line 1", { exact: true }).fill("Full setup");
  await quote.getByLabel("Line 1 amount (AED)").fill("250");
  await quote.getByRole("button", { name: "Add a line" }).click();
  await quote.getByLabel("Line 2", { exact: true }).fill("Strings");
  await quote.getByLabel("Line 2 amount (AED)").fill("50");
  await quote.getByRole("button", { name: "Save quote" }).click();
  await expect(quote.getByText("Version 1: Waiting for the customer")).toBeVisible();
  await expect(quote.getByText("AED 300")).toBeVisible();

  await status.getByRole("button", { name: "Mark diagnosed" }).click();
  await expect(status.getByText("Now: Diagnosed")).toBeVisible();
  expect((await messages(page)).map((m) => m.text)).toEqual([
    `${hello}, we’ve checked ${instrument} ${ticket}. The quote comes to ${iso("AED 300")}.\n` +
      `Please review and approve the quote here: ${trackingUrl}`,
  ]);
  await expect(status.getByText("Start repair: needs the quote approved.")).toBeVisible();

  // The customer agrees at the bench: the quote message is no longer needed.
  await quote.getByLabel("Approved").selectOption("in_person");
  await quote.getByRole("button", { name: "Record approval" }).click();
  await expect(quote.getByText("Version 1: Approved")).toBeVisible();
  await expect(page.getByRole("region", { name: /WhatsApp updates? to send/ })).toBeHidden();

  await status.getByRole("button", { name: "Start repair" }).click();
  await expect(status.getByText("Now: In repair")).toBeVisible();
  expect((await messages(page)).map((m) => m.text)).toEqual([
    `${hello}, work on ${instrument} ${ticket} has started.\n${track}`,
  ]);
  await sendFirst(page);

  // Waiting for parts: an update with a new ETA, and its own message.
  const update = page.getByRole("region", { name: "Post update" });
  await update.getByLabel("Note for the customer").fill("The new strings arrive on Monday.");
  await update.getByLabel("Internal note").fill("Ordered from the supplier");
  await update.getByLabel("New ETA").fill("2026-11-03");
  await update.getByRole("button", { name: "Post update" }).click();
  await expect(update.getByText("Update posted.")).toBeVisible();
  expect((await messages(page)).map((m) => m.text)).toEqual([
    `${hello}, an update on ${instrument} ${ticket}:\nThe new strings arrive on Monday.\n` +
      `Expected to be ready by ${iso("3 November 2026")}.\n${track}`,
  ]);
  await sendFirst(page);

  // Wrong button: undo it. The customer never heard, so there's nothing to send.
  await status.getByRole("button", { name: "Mark ready" }).click();
  await expect(status.getByText("Now: Ready")).toBeVisible();
  await status.getByRole("button", { name: "Undo last status (back to in repair)" }).click();
  await expect(status.getByText("Now: In repair")).toBeVisible();
  await expect(page.getByRole("region", { name: /WhatsApp updates? to send/ })).toBeHidden();
  const history = page.getByRole("region", { name: "History" });
  await expect(history.getByText("Undo: back to in repair")).toBeVisible();
  await expect(history.getByText("In repair → Ready")).toBeVisible();

  await status.getByRole("button", { name: "Mark ready" }).click();
  await expect(status.getByText("Now: Ready")).toBeVisible();
  expect((await messages(page)).map((m) => m.text)).toEqual([
    `${hello}, ${instrument} ${ticket} is ready. Message us to arrange collection or delivery.\n` +
      `Total: ${iso("AED 300")}.\n${track}`,
  ]);
  await sendFirst(page);

  await status.getByLabel("Close as").selectOption("collected");
  await status.getByRole("button", { name: "Close ticket" }).click();
  await expect(page.getByText("Closed (collected)")).toBeVisible();
  expect((await messages(page)).map((m) => m.text)).toEqual([
    `Thank you, ${iso("E2E Customer")}. Ticket ${ltr(number)} is now closed. Enjoy playing!`,
  ]);
  await sendFirst(page);
  await expect(history.getByText("Closed: collected")).toBeVisible();

  // The list finds it by number and by phone, and it's no longer open.
  await page.goto(`/admin/repairs?status=all&q=${number}`);
  await expect(
    page.getByRole("link", { name: new RegExp(`${number} · E2E Customer`) }),
  ).toBeVisible();
  await page.goto(`/admin/repairs?status=open&q=${phone.e164.slice(-7)}`);
  await expect(page.getByText("No tickets match.")).toBeVisible();
});

test("an Arabic-speaking customer gets Arabic messages", async ({ page }) => {
  const phone = uniquePhone();
  const { number, trackingUrl } = await openTicket(page, {
    phone: phone.typed,
    name: "سارة",
    locale: "Arabic",
  });
  expect(trackingUrl).toContain("/ar/r/");
  expect((await messages(page)).map((m) => m.text)).toEqual([
    `مرحباً ${iso("سارة")}، استلمنا آلتك ${iso("Fender Jazzmaster")} للتصليح. رقم التذكرة ${ltr(number)}.\n` +
      `تابع التصليح هنا: ${trackingUrl}`,
  ]);
  // Told in person instead: mark it sent.
  await page.getByRole("button", { name: "Mark as sent" }).click();
  await expect(page.getByRole("region", { name: /WhatsApp updates? to send/ })).toBeHidden();
});

test("intake photos are private and have no EXIF", async ({ page, playwright, baseURL }) => {
  const phone = uniquePhone();
  await openTicket(page, { phone: phone.typed, name: "E2E Photo", locale: "English" });

  const photo = await sharp({
    create: { width: 1200, height: 900, channels: 3, background: "#4a2f27" },
  })
    .jpeg()
    .withExifMerge({
      IFD0: { Make: "PhoneMaker" },
      IFD3: { GPSLatitudeRef: "N", GPSLatitude: "25/1 47/1 0/1" },
    })
    .toBuffer();
  const photos = page.getByRole("region", { name: "Photos" });
  await expect(photos.getByLabel("Stage")).toHaveValue("intake");
  await page
    .locator("#photo-files")
    .setInputFiles({ name: "intake.jpg", mimeType: "image/jpeg", buffer: photo });
  await expect(photos.getByText("Added 1 photo.")).toBeVisible();
  const image = photos.getByRole("img", { name: "At intake, photo 1" });
  await expect(image).toBeVisible();
  const src = (await image.getAttribute("src")) ?? "";
  expect(src).toMatch(/^\/api\/repair-photos\/repairs\/\d+\/[a-f0-9]+-640\.webp$/);

  const stored = await page.request.get(src);
  expect(stored.status()).toBe(200);
  expect(stored.headers()["cache-control"]).toBe("private, no-store");
  const metadata = await sharp(await stored.body()).metadata();
  expect(metadata.exif).toBeUndefined();

  // Signed out, the same file is refused.
  const anonymous = await playwright.request.newContext({
    baseURL,
    storageState: { cookies: [], origins: [] },
  });
  expect((await anonymous.get(src)).status()).toBe(401);
  await anonymous.dispose();

  await photos.getByRole("button", { name: "Show to customer" }).click();
  await expect(photos.getByRole("button", { name: "Hide from customer" })).toBeVisible();
});
