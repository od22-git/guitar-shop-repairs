import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { twoFactor } from "better-auth/plugins";

import { brand } from "../../config/brand";
import type { Database } from "../db/connect";
import {
  authAccounts,
  authRateLimits,
  authSessions,
  authTwoFactors,
  authUsers,
  authVerifications,
} from "../db/schema";

// Admin sign-in: email + password, then a TOTP code from an authenticator app. There is
// one admin, created with `pnpm admin:create`; sign-up is disabled, and there is no
// email, so password and 2FA resets are scripts too (scripts/admin.mts).
// Plain module (no "server-only") so the scripts and tests can build their own instance;
// the app's is in ./index.ts.

export const MIN_PASSWORD_LENGTH = 12;

export function createAuth({
  db,
  secret,
  baseURL,
}: {
  db: Database;
  secret: string;
  baseURL: string;
}) {
  return betterAuth({
    appName: brand.name.en,
    baseURL,
    basePath: "/api/auth",
    secret,
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user: authUsers,
        session: authSessions,
        account: authAccounts,
        verification: authVerifications,
        twoFactor: authTwoFactors,
        rateLimit: authRateLimits,
      },
    }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: MIN_PASSWORD_LENGTH,
      maxPasswordLength: 128,
    },
    session: {
      // A week, renewed daily while in use.
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    },
    rateLimit: {
      enabled: true,
      // In the database, so limits hold across serverless instances.
      storage: "database",
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/email": { window: 60, max: 10 },
        "/two-factor/*": { window: 60, max: 10 },
      },
    },
    plugins: [
      twoFactor({
        issuer: brand.name.en,
        // Ten wrong codes in a row lock 2FA sign-in for 15 minutes.
        accountLockout: { enabled: true, maxFailedAttempts: 10, durationSeconds: 15 * 60 },
      }),
    ],
    telemetry: { enabled: false },
  });
}

export type Auth = ReturnType<typeof createAuth>;
