import { expect, type Page } from "@playwright/test";

// Helpers for the signed-in repair tests: a customer per test, a ticket opened the way
// the admin does it, and the WhatsApp messages waiting on its page.

/** A random UAE mobile number, so each test has its own customer. */
export function uniquePhone(): { typed: string; e164: string; last4: string } {
  const digits = String(Math.floor(Math.random() * 10_000_000)).padStart(7, "0");
  return { typed: `050 ${digits}`, e164: `+97150${digits}`, last4: digits.slice(-4) };
}

/** The "Send on WhatsApp" links waiting on the ticket page, decoded. */
export async function messages(page: Page): Promise<{ phone: string; text: string }[]> {
  const hrefs = await page
    .getByRole("region", { name: /WhatsApp updates? to send/ })
    .getByRole("link", { name: "Send on WhatsApp" })
    .evaluateAll((links) => links.map((link) => (link as HTMLAnchorElement).href));
  return hrefs.map((href) => {
    const url = new URL(href);
    expect(url.origin).toBe("https://wa.me");
    return { phone: url.pathname.slice(1), text: url.searchParams.get("text") ?? "" };
  });
}

/** Sends the oldest waiting message the way the admin does, and checks it's gone. */
export async function sendFirst(page: Page) {
  const panel = page.getByRole("region", { name: /WhatsApp updates? to send/ });
  const before = await panel.getByRole("link", { name: "Send on WhatsApp" }).count();
  const popup = page.waitForEvent("popup");
  await panel.getByRole("link", { name: "Send on WhatsApp" }).first().click();
  await (await popup).close();
  if (before === 1) await expect(panel).toBeHidden();
  else await expect(panel.getByRole("link", { name: "Send on WhatsApp" })).toHaveCount(before - 1);
}

/** Opens a ticket from the admin's form; returns its number and tracking link. */
export async function openTicket(
  page: Page,
  {
    phone,
    name,
    locale,
    intake = "Drop-off",
  }: { phone: string; name: string; locale: "English" | "Arabic"; intake?: "Drop-off" | "Courier" },
) {
  await page.goto("/admin/repairs/new");
  await page.getByLabel("Mobile number").fill(phone);
  await page.getByLabel("Name").fill(name);
  await page.getByLabel(locale).check();
  await page.getByLabel("Agrees to updates on WhatsApp").check();
  await page.getByLabel("Brand").fill("Fender");
  await page.getByLabel("Model").fill("Jazzmaster");
  await page.getByLabel("Serial number").fill("MX21012345");
  await page.getByLabel("What needs doing").fill("Buzzing on the low E, needs a setup");
  await page.getByLabel("Received with it").fill("Gig bag");
  await page.getByLabel("Expected ready by").fill("");
  await page.getByLabel(intake).check();

  if (intake === "Drop-off") {
    // Terms are required at drop-off.
    await page.getByRole("button", { name: "Open ticket" }).click();
    await expect(page.getByText("The customer accepts the repair terms at drop-off")).toBeVisible();
    await page.getByLabel("The customer accepted the repair terms").check();
  }
  await page.getByRole("button", { name: "Open ticket" }).click();
  await expect(page).toHaveURL(/\/admin\/repairs\/\d+\?created=1$/);

  const heading = (await page.getByRole("heading", { level: 1 }).textContent()) ?? "";
  const number = heading.match(/R-\d{4,}/)?.[0] ?? "";
  expect(number).not.toBe("");
  const trackingUrl = (await page.getByTestId("tracking-url").textContent()) ?? "";
  return { number, trackingUrl, adminUrl: page.url().replace(/\?created=1$/, "") };
}

/** Writes a quote from the admin's ticket page: [label, AED amount] lines. */
export async function writeQuote(page: Page, lines: [string, string][]) {
  const quote = page.getByRole("region", { name: "Quote" });
  // A new version starts from the last one's lines.
  await quote.getByRole("button", { name: /^Write a (quote|new version)$/ }).click();
  for (const [index, [label, amount]] of lines.entries()) {
    if (index > 0 && !(await quote.getByLabel(`Line ${index + 1}`, { exact: true }).count())) {
      await quote.getByRole("button", { name: "Add a line" }).click();
    }
    await quote.getByLabel(`Line ${index + 1}`, { exact: true }).fill(label);
    await quote.getByLabel(`Line ${index + 1} amount (AED)`).fill(amount);
  }
  await quote.getByRole("button", { name: "Save quote" }).click();
}
