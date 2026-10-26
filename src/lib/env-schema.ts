import { z } from "zod";

// Plain module (no "server-only") so next.config.ts can import it and fail
// `next dev`, `next build` and `next start` before anything else runs.
// App code imports `env` from "@/lib/env" instead.

// An empty string counts as missing, so `FOO=` in a .env file can't slip through.
const required = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (value === "" ? undefined : value), schema);

const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (value === "" ? undefined : value), schema.optional());

const isLocalHost = (url: URL) =>
  url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]";

/** Required when STORAGE_DRIVER is "r2". */
export const r2Variables = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_PUBLIC_BUCKET",
  "R2_PRIVATE_BUCKET",
  "R2_PUBLIC_URL",
] as const;

/**
 * Cloudflare's Turnstile test keys (always pass, always fail, or "spent"): fine locally
 * and in CI, refused in production, where they would let every bot through.
 * https://developers.cloudflare.com/turnstile/troubleshooting/testing/
 */
const turnstileTestKey = /^[123]x0{10,}A{2}$/;

/**
 * BETTER_AUTH_SECRET values written in this repository (CI's), so public: anyone could
 * sign admin sessions and ticket links with them. Refused in production.
 */
export const publishedSecrets = ["ci-only-secret-not-used-anywhere-else-0000"];

export const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: required(
      z.url({ protocol: /^postgres(ql)?$/, error: "must be a postgres:// or postgresql:// URL" }),
    ),
    SITE_URL: required(
      z.url({ protocol: /^https?$/, error: "must be an http:// or https:// URL" }),
    ),
    // Signs admin session cookies. Generate with `openssl rand -base64 32`.
    BETTER_AUTH_SECRET: required(
      z.string().min(32, { error: "must be at least 32 characters (openssl rand -base64 32)" }),
    ),
    // Where photos are stored: "fs" (a local folder, for development and tests) or "r2"
    // (Cloudflare R2, needed on Vercel, whose filesystem is read-only).
    STORAGE_DRIVER: required(z.enum(["fs", "r2"], { error: 'must be "fs" or "r2"' })),
    STORAGE_DIR: optional(z.string()),
    R2_ACCOUNT_ID: optional(z.string()),
    R2_ACCESS_KEY_ID: optional(z.string()),
    R2_SECRET_ACCESS_KEY: optional(z.string()),
    R2_PUBLIC_BUCKET: optional(z.string()),
    R2_PRIVATE_BUCKET: optional(z.string()),
    // The public bucket's URL (custom domain or r2.dev), without a trailing slash.
    R2_PUBLIC_URL: optional(z.url({ protocol: /^https$/, error: "must be an https:// URL" })),
    // Cloudflare Turnstile, the spam check on public forms: the site key is public (it's
    // in the page), the secret key confirms tokens on the server.
    TURNSTILE_SITE_KEY: required(z.string()),
    TURNSTILE_SECRET_KEY: required(z.string()),
  })
  .superRefine((env, ctx) => {
    if (env.STORAGE_DRIVER === "r2") {
      for (const name of r2Variables) {
        if (!env[name]) ctx.addIssue({ code: "custom", path: [name], message: "is required" });
      }
    }
    if (
      env.NODE_ENV === "production" &&
      !isLocalHost(new URL(env.SITE_URL)) &&
      !env.SITE_URL.startsWith("https://")
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["SITE_URL"],
        message: "must use https:// in production",
      });
    }
    if (env.NODE_ENV === "production" && !isLocalHost(new URL(env.SITE_URL))) {
      if (publishedSecrets.includes(env.BETTER_AUTH_SECRET)) {
        ctx.addIssue({
          code: "custom",
          path: ["BETTER_AUTH_SECRET"],
          message:
            "is the CI value from this repository; generate a new one (openssl rand -base64 32)",
        });
      }
      for (const name of ["TURNSTILE_SITE_KEY", "TURNSTILE_SECRET_KEY"] as const) {
        if (turnstileTestKey.test(env[name])) {
          ctx.addIssue({
            code: "custom",
            path: [name],
            message: "is a Cloudflare test key; use the site's real key in production",
          });
        }
      }
    }
  });

export type Env = z.infer<typeof envSchema>;

export class EnvError extends Error {
  override name = "EnvError";
}

/** Validates the environment. Throws an EnvError listing every problem; never prints values. */
export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source);
  if (result.success) return result.data;

  const lines = result.error.issues.map((issue) => {
    const name = issue.path.join(".") || "(root)";
    const value = source[name];
    const missing = value === undefined || value === "";
    return `  - ${name}: ${missing ? "is missing (required)" : issue.message}`;
  });
  throw new EnvError(
    [
      "Invalid environment variables:",
      ...lines,
      "Set them in .env.local for development (see .env.example), or in the hosting provider's environment settings.",
    ].join("\n"),
  );
}
