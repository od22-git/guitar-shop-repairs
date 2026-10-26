import { describe, expect, it } from "vitest";

import { EnvError, parseEnv } from "./env-schema";

const valid = {
  DATABASE_URL: "postgresql://user:pass@db.example.com:5432/shop",
  SITE_URL: "https://shop.example.com",
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
});
