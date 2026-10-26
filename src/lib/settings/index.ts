import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { db } from "@/lib/db/client";

import { SETTINGS_TAG, type Settings } from "./schema";
import { loadSettings } from "./store";

export { SETTINGS_TAG, type Settings } from "./schema";

/**
 * The shop's settings. Cached until an admin change revalidates SETTINGS_TAG, so the
 * pages that show them stay static.
 */
export async function getSettings(): Promise<Settings> {
  "use cache";
  cacheLife("max");
  cacheTag(SETTINGS_TAG);
  return loadSettings(db);
}
