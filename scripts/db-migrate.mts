import { migrate } from "drizzle-orm/node-postgres/migrator";

import { withDatabase } from "./db.mjs";

// Applies any migrations in drizzle/ that the database hasn't had yet.
await withDatabase((db) => migrate(db, { migrationsFolder: "drizzle" }));
console.log("Migrations applied.");
