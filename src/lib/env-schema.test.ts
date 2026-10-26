import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { EnvError, parseEnv, publishedSecrets } from "./env-schema";

const valid = {
  DATABASE_URL: "postgresql://user:pass@db.example.com:5432/shop",
  SITE_URL: "https://shop.example.com",
  BETTER_AUTH_SECRET: "a".repeat(32),
  STORAGE_DRIVER: "fs",
  TURNSTILE_SITE_KEY: "0x4AAAAAAAreal-site-key",
  TURNSTILE_SECRET_KEY: "0x4AAAAAAAreal-secret-key",
};

const turnstileTestKeys = {
  TURNSTILE_SITE_KEY: "1x00000000000000000000AA",
  TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000AA",
};

const r2 = {
  STORAGE_DRIVER: "r2",
  R2_ACCOUNT_ID: "account",
  R2_ACCESS_KEY_ID: "key",
  R2_SECRET_ACCESS_KEY: "secret",
  R2_PUBLIC_BUCKET: "photos",
  R2_PRIVATE_BUCKET: "private",
  R2_PUBLIC_URL: "https://photos.example.com",
};

function errorOf(source: Record<string, string | undefined>): EnvError {
  try {
    parseEnv(source);
  } catch (error) {
    if (error instanceof EnvError) return error;
    throw error;
  }
  throw new Error("expected parseEnv to throw");
}

describe("parseEnv", () => {
  it("accepts a complete environment", () => {
    expect(parseEnv({ ...valid, NODE_ENV: "production" })).toEqual({
      ...valid,
      NODE_ENV: "production",
    });
  });

  it("defaults NODE_ENV to development", () => {
    expect(parseEnv(valid).NODE_ENV).toBe("development");
  });

  it("names every missing variable in one message", () => {
    const { message } = errorOf({});
    expect(message).toContain("Invalid environment variables:");
    expect(message).toContain("DATABASE_URL: is missing (required)");
    expect(message).toContain("SITE_URL: is missing (required)");
    expect(message).toContain("BETTER_AUTH_SECRET: is missing (required)");
    expect(message).toContain("STORAGE_DRIVER: is missing (required)");
    expect(message).toContain("TURNSTILE_SITE_KEY: is missing (required)");
    expect(message).toContain("TURNSTILE_SECRET_KEY: is missing (required)");
    expect(message).toContain(".env.example");
  });

  it("treats an empty string as missing", () => {
    expect(errorOf({ ...valid, DATABASE_URL: "" }).message).toContain(
      "DATABASE_URL: is missing (required)",
    );
  });

  it("rejects a non-postgres DATABASE_URL", () => {
    expect(errorOf({ ...valid, DATABASE_URL: "mysql://localhost/shop" }).message).toContain(
      "DATABASE_URL: must be a postgres:// or postgresql:// URL",
    );
  });

  it("rejects a malformed SITE_URL", () => {
    expect(errorOf({ ...valid, SITE_URL: "shop.example.com" }).message).toContain(
      "SITE_URL: must be an http:// or https:// URL",
    );
  });

  it("requires https for a public SITE_URL in production", () => {
    expect(
      errorOf({ ...valid, NODE_ENV: "production", SITE_URL: "http://shop.example.com" }).message,
    ).toContain("SITE_URL: must use https:// in production");
  });

  it("allows http://localhost in production for local runs and e2e", () => {
    expect(
      parseEnv({ ...valid, NODE_ENV: "production", SITE_URL: "http://localhost:3000" }).SITE_URL,
    ).toBe("http://localhost:3000");
  });

  it("never echoes values in the error", () => {
    const secret = "postgresql://user:s3cret-password@db.example.com";
    const { message } = errorOf({ DATABASE_URL: secret, SITE_URL: "nope" });
    expect(message).not.toContain("s3cret-password");
  });

  it("refuses Turnstile test keys in production, except on localhost", () => {
    const message = errorOf({ ...valid, ...turnstileTestKeys, NODE_ENV: "production" }).message;
    expect(message).toContain("TURNSTILE_SITE_KEY: is a Cloudflare test key");
    expect(message).toContain("TURNSTILE_SECRET_KEY: is a Cloudflare test key");
    const local = { ...valid, ...turnstileTestKeys, SITE_URL: "http://localhost:3000" };
    expect(parseEnv({ ...local, NODE_ENV: "production" }).TURNSTILE_SITE_KEY).toBe(
      turnstileTestKeys.TURNSTILE_SITE_KEY,
    );
    expect(parseEnv({ ...valid, ...turnstileTestKeys }).NODE_ENV).toBe("development");
  });

  it("refuses the repository's CI secret in production, except on localhost", () => {
    const ci = /BETTER_AUTH_SECRET: (\S+)/.exec(
      readFileSync(".github/workflows/ci.yml", "utf8"),
    )?.[1];
    expect(publishedSecrets).toContain(ci);
    const published = { ...valid, BETTER_AUTH_SECRET: ci, NODE_ENV: "production" };
    expect(errorOf(published).message).toContain("BETTER_AUTH_SECRET: is the CI value");
    expect(errorOf(published).message).not.toContain(ci);
    expect(parseEnv({ ...published, SITE_URL: "http://localhost:3000" }).BETTER_AUTH_SECRET).toBe(
      ci,
    );
  });

  it("rejects a short BETTER_AUTH_SECRET", () => {
    expect(errorOf({ ...valid, BETTER_AUTH_SECRET: "short" }).message).toContain(
      "BETTER_AUTH_SECRET: must be at least 32 characters",
    );
  });

  it("accepts R2 storage with all its settings", () => {
    expect(parseEnv({ ...valid, ...r2 }).STORAGE_DRIVER).toBe("r2");
  });

  it("requires every R2 setting when STORAGE_DRIVER is r2", () => {
    const { message } = errorOf({ ...valid, ...r2, R2_SECRET_ACCESS_KEY: "", R2_PUBLIC_URL: "" });
    expect(message).toContain("R2_SECRET_ACCESS_KEY: is missing (required)");
    expect(message).toContain("R2_PUBLIC_URL: is missing (required)");
  });

  it("rejects an unknown STORAGE_DRIVER", () => {
    expect(errorOf({ ...valid, STORAGE_DRIVER: "s3" }).message).toContain(
      'STORAGE_DRIVER: must be "fs" or "r2"',
    );
  });
});
