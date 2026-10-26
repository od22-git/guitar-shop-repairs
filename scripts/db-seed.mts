import { seed } from "../src/lib/db/seed";

import { withDatabase } from "./db.mjs";

// Adds the starting categories and delivery zones, plus the sample products unless
// run with --no-samples. Safe to run again: existing rows are left alone.
const samples = !process.argv.includes("--no-samples");
await withDatabase((db) => seed(db, { samples }));
console.log(samples ? "Seeded, with sample products." : "Seeded, without sample products.");
