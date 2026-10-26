import { defineConfig } from "drizzle-kit";

// `pnpm db:generate` writes a SQL migration to drizzle/ from changes in the schema.
// Migrations are applied by `pnpm db:migrate` (scripts/db-migrate.mts), which needs no
// credentials here.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  strict: true,
  verbose: true,
});
