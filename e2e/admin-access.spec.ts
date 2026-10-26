import { readFileSync } from "node:fs";

import { expect, test } from "@playwright/test";

// The "Done when" for M4: every admin page and action refuses a signed-out visitor.
// Pages and actions are read from the build's manifests, so a new one is covered as
// soon as it exists.

const manifest = (name: string) => JSON.parse(readFileSync(`.next/server/${name}`, "utf8"));

/** URLs of every admin page except sign-in itself, with [id] filled in. */
function adminPages(): string[] {
  return Object.keys(manifest("app-paths-manifest.json"))
    .filter((route) => route.startsWith("/admin/") && route !== "/admin/(auth)/login/page")
    .map((route) =>
      route
        .replace(/\/\([^)]+\)/g, "")
        .replace(/\/page$/, "")
        .replace(/\[[^\]]+\]/g, "1"),
    )
    .map((path) => path || "/admin");
}

/** Ids of every server action defined under src/app/admin. */
function adminActions(): { id: string; name: string }[] {
  const actions: Record<string, { filename?: string; exportedName?: string }> = manifest(
    "server-reference-manifest.json",
  ).node;
  return Object.entries(actions)
    .filter(([, action]) => action.filename?.startsWith("src/app/admin/"))
    .map(([id, action]) => ({ id, name: action.exportedName ?? id }));
}

test("every admin page sends a signed-out visitor to sign in", async ({ page }) => {
  const pages = adminPages();
  expect(pages).toEqual(
    expect.arrayContaining([
      "/admin",
      "/admin/products",
      "/admin/products/new",
      "/admin/products/1",
    ]),
  );
  for (const path of pages) {
    await page.goto(path);
    await expect(page, path).toHaveURL("/admin/login");
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  }
});

test("every admin action refuses a signed-out caller", async ({ request }) => {
  const actions = adminActions();
  expect(actions.length).toBeGreaterThanOrEqual(13);
  for (const { id, name } of actions) {
    // Called the way the browser calls a server action, with a product or photo id.
    const response = await request.post("/admin", {
      headers: { "next-action": id, accept: "text/x-component", "content-type": "text/plain" },
      data: "[1]",
      maxRedirects: 0,
    });
    expect(response.headers()["x-action-redirect"], name).toMatch(/^\/admin\/login/);
  }
});

test("the photo upload route refuses a signed-out caller", async ({ request, baseURL }) => {
  const response = await request.post("/api/upload", {
    headers: { origin: baseURL ?? "" },
    multipart: {
      productId: "1",
      file: { name: "a.jpg", mimeType: "image/jpeg", buffer: Buffer.from("x") },
    },
  });
  expect(response.status()).toBe(401);
});

test("sign-up is disabled", async ({ request, baseURL }) => {
  const account = { email: "intruder@example.test", password: "a long enough password" };
  const signUp = await request.post("/api/auth/sign-up/email", {
    headers: { origin: baseURL ?? "" },
    data: { ...account, name: "Intruder" },
  });
  expect(signUp.ok()).toBe(false);
  const signIn = await request.post("/api/auth/sign-in/email", {
    headers: { origin: baseURL ?? "" },
    data: account,
  });
  expect(signIn.status()).toBe(401);
});

test("admin pages are private: never cached, indexed or referred", async ({ request }) => {
  const response = await request.get("/admin/login");
  expect(response.headers()).toMatchObject({
    "cache-control": "private, no-store",
    "x-robots-tag": "noindex, nofollow",
    "referrer-policy": "no-referrer",
  });
});
