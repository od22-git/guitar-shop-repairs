import { z } from "zod";

// Plain module (no "server-only") so next.config.ts can import it and fail
// `next dev`, `next build` and `next start` before anything else runs.
// App code imports `env` from "@/lib/env" instead.

// An empty string counts as missing, so `FOO=` in a .env file can't slip through.
const required = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (value === "" ? undefined : value), schema);

const isLocalHost = (url: URL) =>
  url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]";

export const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: required(
      z.url({ protocol: /^postgres(ql)?$/, error: "must be a postgres:// or postgresql:// URL" }),
    ),
    SITE_URL: required(
      z.url({ protocol: /^https?$/, error: "must be an http:// or https:// URL" }),
    ),
  })
  .superRefine((env, ctx) => {
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
