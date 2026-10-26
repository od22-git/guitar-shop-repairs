import { asc, eq, sql } from "drizzle-orm";

import type { Database } from "../db/connect";
import { deliveryZones, settings, type DeliveryZone } from "../db/schema";

import { parseSettings, SettingsError, type Settings } from "./schema";

// Reading and saving the shop's settings. Callers of saveSettings revalidate
// SETTINGS_TAG afterwards.

/**
 * The stored value as the driver parsed it. Drizzle's jsonb mapping would parse a string
 * value a second time, turning a stored TRN "100123456700003" into a number.
 */
const storedValue = sql<unknown>`${settings.value}`;

/** The settings as stored now, over the defaults. */
export async function loadSettings(db: Database): Promise<Settings> {
  return parseSettings(await db.select({ key: settings.key, value: storedValue }).from(settings));
}

/**
 * Stores the given settings over the current ones, all or none. The result is checked
 * as a whole (VAT needs a TRN) before anything is written.
 */
export async function saveSettings(db: Database, changes: Partial<Settings>): Promise<Settings> {
  return db.transaction(async (tx) => {
    // Locks the rows there are, so two saves at once can't mix.
    const rows = await tx
      .select({ key: settings.key, value: storedValue })
      .from(settings)
      .for("update");
    const merged = parseSettings(rows);
    Object.assign(merged, changes);
    const result = parseSettings(Object.entries(merged).map(([key, value]) => ({ key, value })));
    for (const [key, value] of Object.entries(changes)) {
      // As JSON text, so a null (no TRN) is stored as JSON null rather than SQL NULL.
      const json = sql`${JSON.stringify(value)}::jsonb`;
      await tx
        .insert(settings)
        .values({ key, value: json })
        .onConflictDoUpdate({ target: settings.key, set: { value: json } });
    }
    return result;
  });
}

export { SettingsError };

export async function listDeliveryZones(db: Database): Promise<DeliveryZone[]> {
  return db.select().from(deliveryZones).orderBy(asc(deliveryZones.sort), asc(deliveryZones.id));
}

/** Changes a zone's fee and whether it's offered. False if it no longer exists. */
export async function updateDeliveryZone(
  db: Database,
  id: number,
  change: { feeFils: number; active: boolean },
): Promise<boolean> {
  const updated = await db
    .update(deliveryZones)
    .set(change)
    .where(eq(deliveryZones.id, id))
    .returning({ id: deliveryZones.id });
  return updated.length > 0;
}
