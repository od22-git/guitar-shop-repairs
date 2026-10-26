import { expect, test, type Page } from "@playwright/test";

import { openTicket, uniquePhone } from "./tickets";

// The "Done when" for M7b's repair payments: money recorded on a ticket turns the
// tracking page's amount due into a balance. The customer gets their own browser.

async function record(page: Page, kind: "Deposit" | "Payment", amount: string) {
  const panel = page.getByRole("region", { name: "Payments" });
  await panel.getByLabel("What", { exact: true }).selectOption({ label: kind });
  await panel.getByLabel("How", { exact: true }).selectOption({ label: "Cash" });
  await panel.getByLabel("Amount (AED)").fill(amount);
  await panel.getByRole("button", { name: "Record" }).click();
}

test("a repair payment turns the tracking page's amount due into a balance", async ({
  page,
  browser,
}) => {
  test.setTimeout(90_000);
  const phone = uniquePhone();
  const { trackingUrl } = await openTicket(page, {
    phone: phone.typed,
    name: "Paying Customer",
    locale: "English",
  });
  const payments = page.getByRole("region", { name: "Payments" });
  // Nothing is owed until a price is agreed.
  await expect(payments.getByText("No price agreed yet")).toBeVisible();
  await expect(payments.getByRole("button", { name: "Record" })).toHaveCount(0);

  // A fixed-price job approved at drop-off.
  const quote = page.getByRole("region", { name: "Quote" });
  await quote.getByRole("button", { name: "Write a quote" }).click();
  await quote.getByLabel("Line 1", { exact: true }).fill("Full setup");
  await quote.getByLabel("Line 1 amount (AED)").fill("300");
  await quote.getByLabel("The customer approved it in person just now").check();
  await quote.getByRole("button", { name: "Save quote" }).click();
  await expect(payments.getByTestId("order-due")).toHaveText("AED 300");
  const status = page.getByRole("region", { name: "Status" });
  await status.getByRole("button", { name: "Start repair" }).click();
  await expect(status.getByText("Now: In repair")).toBeVisible();
  await status.getByRole("button", { name: "Mark ready" }).click();
  await expect(status.getByText("Now: Ready")).toBeVisible();

  // No admin session: the project's one would be applied otherwise.
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const visitor = await context.newPage();
  await visitor.goto(trackingUrl);
  await visitor.getByLabel("Last 4 digits of your mobile number").fill(phone.last4);
  await visitor.getByRole("button", { name: "Show my ticket" }).click();
  const pay = visitor.getByRole("region", { name: "To pay" });
  await expect(pay.getByText("On collection or delivery: AED 300")).toBeVisible();

  await record(page, "Deposit", "100");
  await expect(payments.getByText("Payment recorded.")).toBeVisible();
  await expect(payments.getByTestId("order-paid")).toHaveText("AED 100");
  await expect(payments.getByTestId("order-due")).toHaveText("AED 200");
  await visitor.reload();
  await expect(pay.getByText("Total:")).toBeVisible();
  await expect(pay.getByText("AED 300")).toBeVisible();
  await expect(pay.getByTestId("ticket-balance")).toHaveText(
    "Balance on collection or delivery:AED 200",
  );

  // More than is due is refused.
  await record(page, "Payment", "250");
  await expect(payments.getByText("That's more than is still due.")).toBeVisible();
  await record(page, "Payment", "200");
  await expect(payments.getByTestId("order-due")).toHaveText("Paid in full");
  await visitor.reload();
  await expect(pay.getByTestId("ticket-balance")).toHaveText("Paid in full: AED 300. Thank you!");
  await context.close();
});
