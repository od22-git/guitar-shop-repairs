import "server-only";

import { parseEnv } from "./env-schema";

export type { Env } from "./env-schema";

/** Validated server environment. Import this instead of reading process.env directly. */
export const env = parseEnv(process.env);
