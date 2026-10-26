import { expect, test } from "@playwright/test";

import { cspViolations, watchCsp } from "./csp";

// M8b hardening: the security headers on every kind of response, and every public page
// in both languages working under the Content-Security-Policy.

const pages = [
  "",
  "/shop",
  "/shop/electric-guitars",
  "/product/fender-stratocaster-sunburst",
  "/repairs",
  "/sell",
  "/about",
  "/contact",
  "/faq",
  "/policies/terms",
  "/policies/privacy",
  "/policies/returns",
  "/policies/delivery",
  "/policies/repair-terms",
];

const expectSecurityHeaders = (headers: Record<string, string>, label: string) => {
  expect(headers["content-security-policy"], label).toContain("default-src 'self'");
  expect(headers["content-security-policy"], label).toContain("frame-ancestors 'none'");
  expect(headers, label).toMatchObject({
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "cross-origin-opener-policy": "same-origin",
  });
  expect(headers["permissions-policy"], label).toContain("geolocation=()");
};

test("every kind of response carries the security headers", async ({ request }) => {
  for (const path of [
    "/en",
    "/ar/shop",
    "/en/no-such-page",
    "/admin/login",
    "/api/auth/get-session",
    "/robots.txt",
    "/sitemap.xml",
    "/images/stock/guitars-640.webp",
  ]) {
    const response = await request.get(path);
    expectSecurityHeaders(response.headers(), path);
  }
});

test("public pages keep the referrer to this site's origin; private ones send none", async ({
  request,
}) => {
  const shop = await request.get("/en/shop");
  expect(shop.headers()["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  const admin = await request.get("/admin/login");
  expect(admin.headers()["referrer-policy"]).toBe("no-referrer");
});

for (const locale of ["en", "ar"] as const) {
  test(`every public page works in ${locale}, with nothing blocked by the CSP`, async ({
    page,
  }) => {
    test.slow();
    await watchCsp(page);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const path of pages) {
      const url = `/${locale}${path}`;
      const response = await page.goto(url);
      expect(response?.status(), url).toBe(200);
      await expect(page.locator("html"), url).toHaveAttribute("lang", locale);
      await expect(page.locator("html"), url).toHaveAttribute(
        "dir",
        locale === "ar" ? "rtl" : "ltr",
      );
      await expect(page.getByRole("heading", { level: 1 }), url).toBeVisible();
      await page.waitForLoadState("load");
      expect(await cspViolations(page), url).toEqual([]);
    }
    expect(errors).toEqual([]);
  });
}

test("the spam check loads under the CSP", async ({ page }) => {
  await watchCsp(page);
  await page.goto("/en/repairs");
  // The widget's iframe is in a closed shadow root; the token it leaves in the form
  // shows it ran (Cloudflare's test key always passes).
  await expect(page.locator("input[name='cf-turnstile-response']")).toHaveValue(/.+/);
  expect(await cspViolations(page)).toEqual([]);
});

test("the site can't be framed by another page", async ({ page }) => {
  await page.setContent(`<iframe src="${test.info().project.use.baseURL}/en"></iframe>`);
  // Chromium replaces a frame refused by frame-ancestors with its own error page.
  await expect.poll(() => page.frames()[1]?.url()).toMatch(/^chrome-error:/);
});
