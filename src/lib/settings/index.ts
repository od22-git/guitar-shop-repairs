import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { db } from "@/lib/db/client";
import type { DeliveryZone } from "@/lib/db/schema";

import { SETTINGS_TAG, type Settings } from "./schema";
import { listDeliveryZones, loadSettings } from "./store";

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

export type PublicDeliveryZone = Pick<DeliveryZone, "nameEn" | "nameAr" | "feeFils">;

/** The delivery zones on offer, for the delivery policy. Cached like the settings. */
export async function getDeliveryZones(): Promise<PublicDeliveryZone[]> {
  "use cache";
  cacheLife("max");
  cacheTag(SETTINGS_TAG);
  const zones = await listDeliveryZones(db);
  return zones
    .filter((zone) => zone.active)
    .map(({ nameEn, nameAr, feeFils }) => ({ nameEn, nameAr, feeFils }));
}
