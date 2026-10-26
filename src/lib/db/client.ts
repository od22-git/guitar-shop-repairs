import "server-only";

import { env } from "@/lib/env";

import { connect } from "./connect";

export type { Database } from "./connect";

/** The app's database. One pool per server instance; it connects on first query. */
export const db = connect(env.DATABASE_URL).db;
