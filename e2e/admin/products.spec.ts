import { readFileSync } from "node:fs";

import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";

import { totpCode } from "../../src/test/totp";

import { ADMIN } from "./admin";

// Runs signed in (see auth.setup.ts), after the public tests: it adds a listed product,
// which would change their product counts.

/** A phone photo carrying the camera's details and GPS coordinates in its EXIF. */
function phonePhoto(): Promise<Buffer> {
  return sharp({ create: { width: 1600, height: 1200, channels: 3, background: "#4a2f27" } })
    .jpeg()
    .withMetadata({ orientation: 6 })
    .withExifMerge({
      IFD0: { Make: "PhoneMaker", Model: "PhoneModel" },
      IFD3: { GPSLatitudeRef: "N", GPSLatitude: "25/1 47/1 0/1", GPSLongitude: "55/1 57/1 0/1" },
    })
    .toBuffer();
}

/** Every stored file of each photo on the edit page: three widths and the preview. */
async function storedPhotoUrls(page: Page): Promise<string[]> {
  const sources = await page
    .getByRole("region", { name: "Photos" })
    .getByRole("img")
    .evaluateAll((images) => images.map((image) => (image as HTMLImageElement).src));
  return sources.flatMap((src) => {
    const base = src.replace(/-\d+\.webp$/, "");
    return [`${base}-640.webp`, `${base}-1280.webp`, `${base}-1920.webp`, `${base}-og.jpg`];
  });
}

test("add a product with photos, publish it, and see edits in the shop at once", async ({
  page,
  baseURL,
}, testInfo) => {
  test.setTimeout(90_000);
  // Short and unique per run and project (SKUs are up to 30 characters).
  const suffix = `${testInfo.project.name.replace("admin-", "")}-${Date.now().toString(36)}`;
  const title = `E2E Jazzmaster ${suffix}`;

  await page.goto("/admin/products/new");
  await page.getByLabel("Category").selectOption({ label: "Electric guitars" });
  await page.getByLabel("Title in English").fill(title);
  await page.getByLabel("Price (AED)", { exact: true }).fill("3,450");
  await page.getByLabel("SKU").fill(`e2e-${suffix}`);
  await page.getByLabel("Body style").selectOption("offset");
  await page.getByRole("button", { name: "Create draft" }).click();

  await expect(page).toHaveURL(/\/admin\/products\/\d+\?created=1$/);
  const productId = page.url().match(/products\/(\d+)/)?.[1] ?? "";
  const status = page.getByRole("region", { name: "Status and stock" });
  await expect(status.getByText("Add at least one photo.")).toBeVisible();
  const slug = await page.getByLabel("Link (slug)").inputValue();
  expect(slug).toBe(`e2e-jazzmaster-${suffix}`);

  // Through the page: the browser shrinks the photo before upload.
  await page.locator("#photo-files").setInputFiles({
    name: "front.jpg",
    mimeType: "image/jpeg",
    buffer: await phonePhoto(),
  });
  await expect(page.getByText("Added 1 photo.")).toBeVisible();

  // Straight to the server, untouched by the browser: the server must clean it too.
  const upload = await page.request.post("/api/upload", {
    headers: { origin: baseURL ?? "" },
    multipart: {
      productId,
      file: { name: "back.jpg", mimeType: "image/jpeg", buffer: await phonePhoto() },
    },
  });
  expect(upload.status()).toBe(201);

  await page.reload();
  await expect(page.getByRole("region", { name: "Photos" }).getByRole("img")).toHaveCount(2);
  const files = await storedPhotoUrls(page);
  expect(files).toHaveLength(8);
  for (const url of files) {
    const response = await page.request.get(url);
    expect(response.status(), url).toBe(200);
    const body = await response.body();
    const metadata = await sharp(body).metadata();
    expect(metadata.exif, url).toBeUndefined();
    expect(metadata.xmp, url).toBeUndefined();
    expect(body.includes("PhoneMaker"), url).toBe(false);
  }

  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByText("Published. It's in the shop now.")).toBeVisible();
  // The link is locked from now on.
  await expect(page.getByLabel("Link (slug)")).toHaveAttribute("readonly");

  const shop = await page.context().newPage();
  await shop.goto(`/en/product/${slug}`);
  await expect(shop.getByRole("heading", { level: 1 })).toHaveText(title);
  await expect(shop.getByText("3,450").first()).toBeVisible();

  await page.getByLabel("Price (AED)", { exact: true }).fill("3,200");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Saved.")).toBeVisible();

  await shop.reload();
  await expect(shop.getByText("3,200").first()).toBeVisible();
  await expect(shop.getByText("3,450")).toHaveCount(0);

  // Archived products leave the shop.
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Archive" }).click();
  await expect(page.getByText("Archived. It's no longer in the shop.")).toBeVisible();
  const gone = await shop.goto(`/en/product/${slug}`);
  expect(gone?.status()).toBe(404);
});

test("the photo route refuses files that aren't photos", async ({ page, baseURL }) => {
  await page.goto("/admin/products/new");
  const upload = await page.request.post("/api/upload", {
    headers: { origin: baseURL ?? "" },
    multipart: {
      productId: "1",
      file: { name: "x.jpg", mimeType: "image/jpeg", buffer: Buffer.from("<svg/>") },
    },
  });
  expect(upload.status()).toBe(422);
  const crossSite = await page.request.post("/api/upload", {
    headers: { origin: "https://evil.example" },
    multipart: {
      productId: "1",
      file: { name: "x.jpg", mimeType: "image/jpeg", buffer: Buffer.from("x") },
    },
  });
  expect(crossSite.status()).toBe(403);
});

test.describe("signing in", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("needs the password and then the authenticator code", async ({ page }) => {
    const { secret } = JSON.parse(readFileSync(ADMIN.totpFile, "utf8")) as { secret: string };
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill(ADMIN.email);
    await page.getByLabel("Password").fill(ADMIN.password);
    await page.getByRole("button", { name: "Sign in" }).click();

    const code = page.getByLabel("Code from your authenticator app");
    await code.fill("000000");
    await page.getByRole("button", { name: "Verify" }).click();
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page).toHaveURL("/admin/login");

    await code.fill(totpCode(secret));
    await page.getByRole("button", { name: "Verify" }).click();
    await expect(page).toHaveURL("/admin");
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  });
});
