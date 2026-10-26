import { expect, test } from "@playwright/test";
import sharp from "sharp";

import { uniquePhone } from "./tickets";

// The "Done when" for M7b's sell form: an offer lands in the inbox with its photos,
// which only the signed-in admin can see. The visitor gets their own browser.

test("a guitar offered on /sell lands in the inbox with private photos", async ({
  page,
  browser,
  baseURL,
}) => {
  test.setTimeout(90_000);
  const phone = uniquePhone();
  const name = `Seller ${phone.last4}`;
  // No admin session: the project's one would be applied otherwise.
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const visitor = await context.newPage();
  await visitor.goto(`${baseURL}/en/sell`);
  const form = visitor.getByRole("region", { name: "Offer us your guitar" });
  await form.getByLabel("Your name").fill(name);
  await form.getByLabel("Mobile number (WhatsApp)").fill(phone.typed);
  await form.getByLabel("Brand").fill("Fender");
  await form.getByLabel(/^Model/).fill("Telecaster");
  await form.getByLabel(/^Year/).fill("2012");
  await form.getByLabel(/^Serial number/).fill("MZ2123456");
  await form.getByLabel("Condition").selectOption("excellent");
  await form.getByLabel(/^Asking price/).fill("3,200");
  await form.getByLabel("Tell us about it").fill("Locking tuners fitted, original case.");
  // Straight off a phone, with GPS in its EXIF.
  const photo = await sharp({
    create: { width: 1600, height: 1200, channels: 3, background: "#7a4b2a" },
  })
    .jpeg()
    .withExif({ IFD3: { GPSLatitudeRef: "N", GPSLatitude: "25/1 47/1 0/1" } })
    .toBuffer();
  await form.getByLabel("Add photos").setInputFiles([
    { name: "front.jpg", mimeType: "image/jpeg", buffer: photo },
    { name: "back.jpg", mimeType: "image/jpeg", buffer: photo },
  ]);
  await expect(form.getByRole("img", { name: "Your photo 2" })).toBeVisible();
  await form.getByLabel("I own this instrument and it’s mine to sell.").check();
  await form.getByLabel(/You can reply to me about it/).check();
  // Cloudflare's test key passes once the widget has run.
  await expect(form.locator('input[name="cf-turnstile-response"]')).not.toHaveValue("", {
    timeout: 30_000,
  });
  await form.getByRole("button", { name: "Send to the shop" }).click();
  await expect(form.getByText("Thank you, we’ve got the details")).toBeVisible();

  await page.goto("/admin/inbox");
  const item = page.getByRole("link", { name: new RegExp(`Guitar offered · ${name}`) });
  await expect(item).toContainText("Fender Telecaster");
  await expect(item).toContainText("2 photos");
  await item.click();
  for (const text of ["MZ2123456", "Excellent", "AED 3,200", "confirmed they own it"]) {
    await expect(page.getByText(text, { exact: false }).first()).toBeVisible();
  }
  const reply = new URL(
    (await page.getByRole("link", { name: "Reply on WhatsApp" }).getAttribute("href")) ?? "",
  );
  expect(reply.searchParams.get("text")).toMatch(
    new RegExp(`^Hello ⁨${name}⁩, thanks for offering us your ⁨Fender Telecaster⁩`),
  );

  const image = page.getByRole("img", { name: "Photo 1 of 2" });
  await expect(image).toBeVisible();
  const src = (await image.getAttribute("src")) ?? "";
  expect(src).toMatch(/^\/api\/inbox-photos\/inbox\/[a-f0-9]{20}-640\.webp$/);
  const file = await page.request.get(src);
  expect(file.status()).toBe(200);
  expect(file.headers()["cache-control"]).toBe("private, no-store");
  expect((await sharp(await file.body()).metadata()).exif).toBeUndefined();

  // Signed out, the same photo is refused.
  const signedOut = await visitor.request.get(src);
  expect(signedOut.status()).toBe(401);
  await context.close();
});
