import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createPgliteDatabase, type TestDatabase } from "@/test/db";

import type { Database } from "../db/connect";
import { deliveryZones, settings } from "../db/schema";

import {
  listDeliveryZones,
  loadSettings,
  saveSettings,
  SettingsError,
  updateDeliveryZone,
} from "./store";

let test: TestDatabase;
let db: Database;

beforeAll(async () => {
  test = await createPgliteDatabase();
  db = test.db;
}, 30_000);
afterAll(() => test?.close());
beforeEach(() => test.reset());

const stored = () => loadSettings(db);

describe("saveSettings", () => {
  it("stores values as their own JSON types, a TRN staying a string", async () => {
    await saveSettings(db, { whatsapp_number: "+971501234567" });
    await saveSettings(db, { vat_enabled: true, trn: "100123456700003" });
    expect(await stored()).toEqual({
      whatsapp_number: "+971501234567",
      vat_enabled: true,
      trn: "100123456700003",
    });
    await saveSettings(db, { vat_enabled: false, trn: null });
    expect(await stored()).toMatchObject({ vat_enabled: false, trn: null });
  });

  it("refuses VAT without a TRN, or a bad value, writing nothing", async () => {
    await expect(saveSettings(db, { vat_enabled: true })).rejects.toThrow(SettingsError);
    await expect(saveSettings(db, { trn: "12345" })).rejects.toThrow(SettingsError);
    expect(await db.select().from(settings)).toHaveLength(0);
  });
});

describe("delivery zones", () => {
  it("changes a zone's fee and whether it's offered", async () => {
    const [zone] = await db
      .insert(deliveryZones)
      .values({ nameEn: "RAK", nameAr: "رأس الخيمة", emirates: ["ras_al_khaimah"], feeFils: 2_000 })
      .returning({ id: deliveryZones.id });
    expect(await updateDeliveryZone(db, zone.id, { feeFils: 2_500, active: false })).toBe(true);
    expect(await listDeliveryZones(db)).toMatchObject([{ feeFils: 2_500, active: false }]);
    expect(await updateDeliveryZone(db, zone.id + 1, { feeFils: 0, active: true })).toBe(false);
  });
});
