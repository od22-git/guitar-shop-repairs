import { expect, test } from "@playwright/test";

// The public repairs page and the Book-a-repair form. A booking that goes through, and
// what happens to it in the admin, is in admin/tracking.spec.ts.

test("the repairs page lists services with starting prices, in both languages", async ({
  page,
}) => {
  await page.goto("/en/repairs");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Guitar repairs");
  await expect(page.getByRole("link", { name: "Repairs", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );
  const services = page.getByRole("region", { name: "Services and starting prices" });
  await expect(services.getByRole("listitem")).toHaveCount(6);
  await expect(services.getByText("from AED 150")).toBeVisible();

  await page.goto("/ar/repairs");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("تصليح الجيتار");
  const price = page
    .getByRole("region", { name: "الخدمات والأسعار المبدئية" })
    .locator("bdi")
    .first();
  // Western digits, isolated inside the Arabic text.
  await expect(price).toHaveText("\u200f150 د.إ.\u200f");
});

test("the booking form explains what's missing, in the visitor's language", async ({ page }) => {
  await page.goto("/ar/repairs");
  const form = page.getByRole("region", { name: "احجز موعد تصليح" });
  await form.getByRole("button", { name: "أرسل الحجز" }).click();
  await expect(form.getByRole("alert")).toHaveText("يرجى مراجعة الحقول المحددة أدناه.");
  await expect(form.getByLabel("اسمك")).toHaveAttribute("aria-invalid", "true");
  await expect(form.getByText("نرد على واتساب، لذلك نحتاج موافقتك على مراسلتك.")).toBeVisible();

  await form.getByLabel("رقم الجوال (واتساب)").fill("123");
  await form.getByLabel("استلام عبر شركة شحن").check();
  await form.getByRole("button", { name: "أرسل الحجز" }).click();
  await expect(form.getByText("أدخل رقم جوال، مثل 050 123 4567.")).toBeVisible();
  // A courier pickup needs the emirate.
  await expect(form.getByLabel("الإمارة التي نستلم منها")).toHaveAttribute("aria-invalid", "true");
  // Typed values survive the error.
  await expect(form.getByLabel("رقم الجوال (واتساب)")).toHaveValue("123");
});

test("an unknown tracking link is a 404, never cached or indexed", async ({ request }) => {
  for (const path of ["/en/r/AAAAAAAAAAAAAAAAAAAAAA", "/ar/r/not-a-token"]) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(404);
    expect(response.headers()).toMatchObject({
      "cache-control": "private, no-store",
      "x-robots-tag": "noindex, nofollow",
    });
  }
});
