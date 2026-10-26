/**
 * The constraint a query broke, if it failed with a unique violation (23505). Drivers
 * wrap the Postgres error, so this looks through `cause`.
 */
export function uniqueViolation(error: unknown): string | null {
  let current = error;
  for (let depth = 0; depth < 5 && typeof current === "object" && current !== null; depth++) {
    const { code, constraint, cause } = current as {
      code?: unknown;
      constraint?: unknown;
      cause?: unknown;
    };
    if (code === "23505") return typeof constraint === "string" ? constraint : "";
    current = cause;
  }
  return null;
}
