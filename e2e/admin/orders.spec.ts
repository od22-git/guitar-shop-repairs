import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";

import { uniquePhone } from "./tickets";

// Runs signed in, after the public tests. Each test lists its own products, so the
// samples the public tests count are untouched.

/** Lists a product the way the admin does (create, add a photo, publish). */
async function listProduct(
  page: Page,
  baseURL: string,
  { title, price, gear = 0 }: { title: string; price: string; gear?: number },
) {
  const sku = `e2e-o-${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
  await page.goto("/admin/products/new");
  if (gear) await page.getByLabel("Gear (pedals, amps, parts)").check();
  await page.getByLabel("Category").selectOption({ label: gear ? "Pedals" : "Electric guitars" });
  await page.getByLabel("Title in English").fill(title);
  await page.getByLabel("Price (AED)", { exact: true }).fill(price);
  await page.getByLabel("SKU").fill(sku);
  if (gear) await page.getByLabel("How many in stock").fill(String(gear));
  await page.getByRole("button", { name: "Create draft" }).click();
  await expect(page).toHaveURL(/\/admin\/products\/\d+\?created=1$/);
  const id = page.url().match(/products\/(\d+)/)?.[1] ?? "";
  const slug = await page.getByLabel("Link (slug)").inputValue();
  const photo = await sharp({
    create: { width: 1200, height: 1500, channels: 3, background: "#13294b" },
  })
    .jpeg()
    .toBuffer();
  const upload = await page.request.post("/api/upload", {
    headers: { origin: baseURL },
    multipart: {
      productId: id,
      file: { name: "front.jpg", mimeType: "image/jpeg", buffer: photo },
    },
  });
  expect(upload.status()).toBe(201);
  await page.reload();
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByText("Published. It's in the shop now.")).toBeVisible();
  return { id, slug, adminUrl: `/admin/products/${id}` };
}

/** Takes a test product out of the shop again, so reruns' public tests see only samples. */
async function archive(page: Page, adminUrl: string) {
  await page.goto(adminUrl);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Archive" }).click();
  await expect(page.getByText("Archived. It's no longer in the shop.")).toBeVisible();
}

async function fillCustomer(page: Page, name: string, locale: "English" | "Arabic" = "English") {
  await page.getByLabel("Mobile number").fill(uniquePhone().typed);
  await page.getByLabel("Name").fill(name);
  await page.getByLabel(locale, { exact: true }).check();
}

const payments = (page: Page) => page.getByRole("region", { name: "Payments" });

async function recordPayment(page: Page, what: "Deposit" | "Payment", amount?: string) {
  const panel = payments(page);
  await panel.getByLabel("What").selectOption({ label: what });
  if (amount) await panel.getByLabel("Amount (AED)").fill(amount);
  await panel.getByRole("button", { name: "Record" }).click();
  await expect(panel.getByText("Payment recorded.")).toBeVisible();
}

test("hold, order, deposit, pay in full and hand over: the guitar shows Sold", async ({
  page,
  baseURL,
}, testInfo) => {
  test.setTimeout(90_000);
  const title = `E2E Order Strat ${testInfo.project.name}-${Date.now().toString(36)}`;
  const product = await listProduct(page, baseURL ?? "", { title, price: "3,450" });

  // A customer pays a deposit to hold it.
  await page.getByLabel("Hold for (name, deposit)").fill("Omar, deposit AED 500");
  await page.getByRole("button", { name: "Put on hold" }).click();
  await expect(page.getByText("On hold.", { exact: true })).toBeVisible();
  const shop = await page.context().newPage();
  await shop.goto(`/en/product/${product.slug}`);
  await expect(shop.getByTestId("stock-status")).toHaveText("On hold");

  // The order for the customer holding it starts from the product.
  await page.getByRole("link", { name: "Make the order for the customer holding it" }).click();
  await expect(page.getByLabel("Product 1", { exact: true })).toHaveValue(product.id);
  await fillCustomer(page, "Omar Haddad", "Arabic");
  await page.getByLabel("Courier delivery").check();
  await page.getByLabel("Emirate").selectOption("dubai");
  await page.getByLabel("Area").fill("Al Barsha");
  await page.getByRole("button", { name: "Create order" }).click();
  await expect(page).toHaveURL(/\/admin\/orders\/\d+\?created=1$/);
  const orderUrl = page.url().replace(/\?created=1$/, "");

  // AED 3,450 plus the Dubai zone's AED 35.
  await expect(page.getByTestId("order-total")).toHaveText("AED 3,485");
  await expect(page.getByTestId("order-due")).toHaveText("AED 3,485");
  await recordPayment(page, "Deposit", "500");
  await expect(page.getByTestId("order-due")).toHaveText("AED 2,985");
  // The amount starts at what's still due.
  await expect(payments(page).getByLabel("Amount (AED)")).toHaveValue("2985");
  await recordPayment(page, "Payment");
  await expect(page.getByTestId("order-paid")).toHaveText("AED 3,485");
  await expect(page.getByTestId("order-due")).toHaveText("Paid in full");

  await page.getByRole("button", { name: "Mark as handed over" }).click();
  await expect(page.getByText("Marked as handed over.")).toBeVisible();

  await shop.reload();
  await expect(shop.getByTestId("stock-status")).toHaveText("Sold");

  // The receipt is in the customer's language.
  await page.goto(`${orderUrl}/receipt`);
  const receipt = page.getByRole("article");
  await expect(receipt).toHaveAttribute("dir", "rtl");
  // "Receipt", or "Tax invoice" if the VAT test has VAT on at this moment.
  await expect(receipt.getByRole("heading", { level: 1 })).toHaveText(/إيصال|فاتورة ضريبية/);
  await expect(receipt.getByText("Omar Haddad")).toBeVisible();
  await expect(receipt.getByText("مدفوع بالكامل")).toBeVisible();
  await archive(page, product.adminUrl);
});

test("cancelling an order puts its stock back", async ({ page, baseURL }, testInfo) => {
  test.setTimeout(90_000);
  const title = `E2E Order Pedal ${testInfo.project.name}-${Date.now().toString(36)}`;
  const product = await listProduct(page, baseURL ?? "", { title, price: "450", gear: 3 });

  await page.getByRole("link", { name: "Make an order" }).click();
  await fillCustomer(page, "Layla");
  await page.getByLabel("Product 1 quantity").fill("2");
  await page.getByLabel("Product 1 price each (AED)").fill("400");
  await page.getByRole("button", { name: "Create order" }).click();
  await expect(page).toHaveURL(/\/admin\/orders\/\d+\?created=1$/);
  await expect(page.getByTestId("order-total")).toHaveText("AED 800");
  const orderUrl = page.url();

  await page.goto(product.adminUrl);
  await expect(page.getByText("1 in stock.")).toBeVisible();

  // Asking for more than is left fails cleanly.
  await page.goto(`/admin/orders/new?product=${product.id}`);
  await fillCustomer(page, "Someone else");
  await page.getByLabel("Product 1 quantity").fill("2");
  await page.getByRole("button", { name: "Create order" }).click();
  await expect(page.getByText("doesn't have that many in stock any more.")).toBeVisible();

  await page.goto(orderUrl);
  await recordPayment(page, "Deposit", "100");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Cancel order" }).click();
  await expect(page.getByText("Cancelled. The items are back in stock.")).toBeVisible();
  await page.reload();
  // The deposit is owed back.
  await expect(page.getByTestId("order-due")).toHaveText("AED 100");
  await expect(payments(page).getByText("To refund")).toBeVisible();

  await page.goto(product.adminUrl);
  await expect(page.getByText("3 in stock.")).toBeVisible();
  await archive(page, product.adminUrl);
});

test("VAT on and off: the same prices, with and without the VAT inside", async ({
  page,
  baseURL,
}, testInfo) => {
  // VAT is shop-wide, so only one project switches it.
  test.skip(testInfo.project.name !== "admin-desktop", "switches a shop-wide setting");
  test.setTimeout(120_000);
  const product = await listProduct(page, baseURL ?? "", {
    title: `E2E VAT Pedal ${Date.now().toString(36)}`,
    price: "1,050",
    gear: 5,
  });

  const order = async () => {
    await page.goto(`/admin/orders/new?product=${product.id}`);
    await fillCustomer(page, "Khalid");
    await page.getByRole("button", { name: "Create order" }).click();
    await expect(page).toHaveURL(/\/admin\/orders\/\d+\?created=1$/);
    return page.url().replace(/\?created=1$/, "");
  };

  const vat = page.getByRole("region", { name: "VAT" });
  try {
    await page.goto("/admin/settings");
    await vat.getByLabel("The shop is VAT-registered").check();
    await vat.getByRole("button", { name: "Save VAT" }).click();
    await expect(vat.getByText("VAT needs the shop's TRN.").first()).toBeVisible();
    await vat.getByLabel("TRN (Tax Registration Number)").fill("100123456700003");
    await vat.getByRole("button", { name: "Save VAT" }).click();
    await expect(vat.getByText(/^VAT is on\./)).toBeVisible();

    const withVat = await order();
    await expect(page.getByTestId("order-total")).toHaveText("AED 1,050");
    // 1050 × 5/105 = 50.
    await expect(page.getByTestId("order-vat")).toHaveText("AED 50");
    await page.goto(`${withVat}/receipt`);
    const receipt = page.getByRole("article");
    await expect(receipt.getByRole("heading", { level: 1 })).toHaveText("Tax invoice");
    await expect(receipt.getByText("TRN: 100123456700003")).toBeVisible();
    await expect(receipt.getByText("Includes VAT at 5%")).toBeVisible();
  } finally {
    await page.goto("/admin/settings");
    await vat.getByLabel("The shop is VAT-registered").uncheck();
    await vat.getByLabel("TRN (Tax Registration Number)").fill("");
    await vat.getByRole("button", { name: "Save VAT" }).click();
    await expect(vat.getByText("VAT is off.")).toBeVisible();
  }

  const withoutVat = await order();
  await expect(page.getByTestId("order-total")).toHaveText("AED 1,050");
  await expect(page.getByTestId("order-vat")).toHaveText("Not registered");
  await page.goto(`${withoutVat}/receipt`);
  const receipt = page.getByRole("article");
  await expect(receipt.getByRole("heading", { level: 1 })).toHaveText("Receipt");
  await expect(receipt.getByText("Not VAT-registered. Prices are final.")).toBeVisible();
  await expect(receipt.getByText(/TRN/)).toHaveCount(0);
  await archive(page, product.adminUrl);
});
