import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createPgliteDatabase, type TestDatabase } from "@/test/db";
import { totpCode, totpSecret } from "@/test/totp";

import { AdminUserError, createAdmin, resetPassword, resetTwoFactor } from "./admin-users";
import { createAuth, type Auth } from "./config";

const baseURL = "http://localhost:3000";
const email = "owner@example.test";
const password = "correct horse battery";

let test: TestDatabase;
let auth: Auth;

beforeAll(async () => {
  test = await createPgliteDatabase();
  auth = createAuth({ db: test.db, secret: "x".repeat(32), baseURL });
}, 30_000);
afterAll(() => test?.close());
beforeEach(() => test.reset());

// Talks to the auth endpoints the way the browser does. Each call comes from its own
// IP so the sign-in rate limit doesn't trip across tests.
let ip = 0;
async function call(path: string, body: unknown, cookie = "") {
  const response = await auth.handler(
    new Request(`${baseURL}/api/auth${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: baseURL,
        cookie,
        "x-forwarded-for": `10.0.0.${++ip}`,
      },
      body: JSON.stringify(body),
    }),
  );
  const setCookies = response.headers.getSetCookie().map((c) => c.split(";")[0]);
  return {
    response,
    json: await response.json().catch(() => null),
    cookies: setCookies.join("; "),
  };
}

async function session(cookie: string) {
  return auth.api.getSession({ headers: new Headers({ cookie }) });
}

/** Signs in and sets up 2FA, as on the admin's first visit. Returns the TOTP secret. */
async function enrol(): Promise<{ secret: string; cookie: string }> {
  const signIn = await call("/sign-in/email", { email, password });
  const enable = await call("/two-factor/enable", { password }, signIn.cookies);
  expect(enable.response.status).toBe(200);
  const secret = totpSecret(enable.json.totpURI);
  const verify = await call("/two-factor/verify-totp", { code: totpCode(secret) }, signIn.cookies);
  expect(verify.response.status).toBe(200);
  return { secret, cookie: verify.cookies || signIn.cookies };
}

describe("admin sign-in", () => {
  it("refuses sign-up", async () => {
    const { response } = await call("/sign-up/email", {
      email: "intruder@example.test",
      password: "another long password",
      name: "Intruder",
    });
    expect(response.ok).toBe(false);
    expect(await test.db.query.authUsers.findMany()).toHaveLength(0);
  });

  it("signs in the admin created by the script, who has no 2FA yet", async () => {
    await createAdmin(auth, { email, name: "Owner", password });
    const { response, cookies } = await call("/sign-in/email", { email, password });
    expect(response.status).toBe(200);
    expect((await session(cookies))?.user.twoFactorEnabled).toBe(false);
  });

  it("refuses a wrong password", async () => {
    await createAdmin(auth, { email, name: "Owner", password });
    const { response } = await call("/sign-in/email", { email, password: "wrong password here" });
    expect(response.status).toBe(401);
  });

  it("asks for a TOTP code once 2FA is on, and only then starts a session", async () => {
    await createAdmin(auth, { email, name: "Owner", password });
    const { secret } = await enrol();

    const signIn = await call("/sign-in/email", { email, password });
    expect(signIn.json).toMatchObject({ twoFactorRedirect: true });
    expect(await session(signIn.cookies)).toBeNull();

    const wrong = await call("/two-factor/verify-totp", { code: "000000" }, signIn.cookies);
    expect(wrong.response.ok).toBe(false);

    const right = await call("/two-factor/verify-totp", { code: totpCode(secret) }, signIn.cookies);
    expect(right.response.status).toBe(200);
    expect((await session(right.cookies))?.user).toMatchObject({ email, twoFactorEnabled: true });
  });
});

describe("admin scripts", () => {
  it("refuses a short password and a duplicate admin", async () => {
    await expect(createAdmin(auth, { email, name: "Owner", password: "short" })).rejects.toThrow(
      AdminUserError,
    );
    await createAdmin(auth, { email, name: "Owner", password });
    await expect(
      createAdmin(auth, { email: email.toUpperCase(), name: "Owner", password }),
    ).rejects.toThrow("already exists");
  });

  it("resets the password and signs every session out", async () => {
    await createAdmin(auth, { email, name: "Owner", password });
    const before = await call("/sign-in/email", { email, password });
    await resetPassword(auth, email, "a brand new password");

    expect(await session(before.cookies)).toBeNull();
    expect((await call("/sign-in/email", { email, password })).response.status).toBe(401);
    const after = await call("/sign-in/email", { email, password: "a brand new password" });
    expect(after.response.status).toBe(200);
  });

  it("resets 2FA so the admin can set it up again", async () => {
    await createAdmin(auth, { email, name: "Owner", password });
    const { cookie } = await enrol();
    await resetTwoFactor(auth, test.db, email);

    expect(await session(cookie)).toBeNull();
    const signIn = await call("/sign-in/email", { email, password });
    expect(signIn.json).not.toMatchObject({ twoFactorRedirect: true });
    expect((await session(signIn.cookies))?.user.twoFactorEnabled).toBe(false);
  });

  it("names an unknown admin", async () => {
    await expect(resetPassword(auth, "nobody@example.test", password)).rejects.toThrow(
      "No admin with the email",
    );
  });
});
