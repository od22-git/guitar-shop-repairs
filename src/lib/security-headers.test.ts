import { describe, expect, it } from "vitest";

import { contentSecurityPolicy, securityHeaders } from "./security-headers";

const directive = (policy: string, name: string) =>
  policy
    .split("; ")
    .find((part) => part.startsWith(`${name} `))
    ?.split(" ")
    .slice(1);

describe("contentSecurityPolicy", () => {
  const production = contentSecurityPolicy({
    development: false,
    siteUrl: "https://shop.example",
  });

  it("allows scripts only from the site and Turnstile, never eval in production", () => {
    expect(directive(production, "script-src")).toEqual([
      "'self'",
      "'unsafe-inline'",
      "https://challenges.cloudflare.com",
    ]);
  });

  it("allows eval in development, for React's debugging tools", () => {
    const development = contentSecurityPolicy({
      development: true,
      siteUrl: "http://localhost:3000",
    });
    expect(directive(development, "script-src")).toContain("'unsafe-eval'");
  });

  it("refuses plugins, framing, base changes and posts to other sites", () => {
    expect(directive(production, "object-src")).toEqual(["'none'"]);
    expect(directive(production, "frame-ancestors")).toEqual(["'none'"]);
    expect(directive(production, "base-uri")).toEqual(["'self'"]);
    expect(directive(production, "form-action")).toEqual(["'self'"]);
    expect(directive(production, "default-src")).toEqual(["'self'"]);
  });

  it("upgrades insecure requests only on https", () => {
    expect(production).toContain("upgrade-insecure-requests");
    expect(
      contentSecurityPolicy({ development: false, siteUrl: "http://localhost:3000" }),
    ).not.toContain("upgrade-insecure-requests");
  });
});

describe("securityHeaders", () => {
  const keys = (siteUrl: string) =>
    securityHeaders({ development: false, siteUrl }).map((header) => header.key);

  it("sends HSTS only on https", () => {
    expect(keys("https://shop.example")).toContain("Strict-Transport-Security");
    expect(keys("http://localhost:3000")).not.toContain("Strict-Transport-Security");
  });

  it("always sends the rest", () => {
    expect(keys("http://localhost:3000")).toEqual(
      expect.arrayContaining([
        "Content-Security-Policy",
        "X-Content-Type-Options",
        "X-Frame-Options",
        "Referrer-Policy",
        "Permissions-Policy",
        "Cross-Origin-Opener-Policy",
      ]),
    );
  });
});
