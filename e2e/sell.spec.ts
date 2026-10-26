import { expect, test } from "@playwright/test";
import sharp from "sharp";

// The public /sell page and its form. An offer that goes through, and what the admin
// sees of it, is in admin/sell.spec.ts.

test("the sell page explains how buying works, in both languages", async ({ page, isMobile }) => {
  await page.goto("/en/sell");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sell us your guitar");
  // Phones fold the header links behind Menu; Sell is in the footer too.
  const nav = page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Sell" });
  if (isMobile) await expect(nav).toBeHidden();
  else await expect(nav).toHaveAttribute("aria-current", "page");
  await expect(
    page.getByRole("contentinfo").getByRole("link", { name: "Sell us your guitar" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Only instruments you own" })).toBeVisible();

  await page.goto("/ar/sell");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("بِع لنا جيتارك");
});

test("the sell form explains what's missing, in the visitor's language", async ({ page }) => {
  await page.goto("/ar/sell");
  const form = page.getByRole("region", { name: "اعرض علينا جيتارك" });
  await form.getByLabel(/^سنة الصنع/).fill("٩٨");
  await form.getByRole("button", { name: "أرسل إلى المتجر" }).click();
  await expect(form.getByRole("alert")).toHaveText("يرجى مراجعة الحقول المحددة أدناه.");
  await expect(form.getByLabel("الماركة")).toHaveAttribute("aria-invalid", "true");
  await expect(form.getByText("أدخل سنة، مثل 1998.")).toBeVisible();
  await expect(form.getByText("يرجى إضافة صورة واحدة على الأقل.")).toBeVisible();
  await expect(form.getByText("نشتري فقط الآلات التي تملكها. يرجى التأكيد.")).toBeVisible();
});

test("a picked photo uploads, shows a preview and can be removed", async ({ page }) => {
  await page.goto("/en/sell");
  const form = page.getByRole("region", { name: "Offer us your guitar" });
  const photo = await sharp({
    create: { width: 1200, height: 900, channels: 3, background: "#4a2f27" },
  })
    .jpeg()
    .toBuffer();
  await form.getByLabel("Add photos").setInputFiles([
    { name: "front.jpg", mimeType: "image/jpeg", buffer: photo },
    { name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("not a photo") },
  ]);
  await expect(form.getByRole("img", { name: "Your photo 1" })).toBeVisible();
  await expect(form.getByText("notes.txt isn’t a photo we can read.")).toBeVisible();
  await expect(form.locator('input[name="photo"]')).toHaveCount(1);
  await form.getByRole("button", { name: "Remove 1" }).click();
  await expect(form.getByRole("img", { name: "Your photo 1" })).toHaveCount(0);
});

test("the sell photo upload only takes photos from the site's own pages", async ({
  request,
  baseURL,
}) => {
  const file = { name: "a.jpg", mimeType: "image/jpeg", buffer: Buffer.from("x") };
  const cross = await request.post("/api/upload/sell", {
    headers: { origin: "https://example.com" },
    multipart: { file },
  });
  expect(cross.status()).toBe(403);
  const notPhoto = await request.post("/api/upload/sell", {
    headers: { origin: baseURL ?? "" },
    multipart: { file },
  });
  expect(notPhoto.status()).toBe(422);
  expect(await notPhoto.json()).toEqual({ error: "not_an_image" });
});
