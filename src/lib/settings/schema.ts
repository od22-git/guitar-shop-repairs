import { z } from "zod";

import { normalizePhone } from "../phone";

// Shop settings the admin can change, stored one row per key in the `settings` table.
// A key with no row uses its default. Plain module (no database) so tests and scripts
// can use it; pages read settings through getSettings() in ./index.ts.

/** Cache tag for everything that reads settings; admin changes revalidate it. */
export const SETTINGS_TAG = "settings";

const whatsappNumber = z
  .string()
  .refine((value) => normalizePhone(value, { mobileOnly: true }) === value, {
    error: "must be a mobile number in E.164 format, e.g. +971501234567",
  });

export const settingSchemas = {
  /** The shop's WhatsApp Business number, where every wa.me link points. */
  whatsapp_number: whatsappNumber,
  /** Prices include 5% VAT once the business is VAT-registered. */
  vat_enabled: z.boolean(),
  /** Tax Registration Number: 15 digits, required while VAT is on. */
  trn: z
    .string()
    .regex(/^\d{15}$/, { error: "must be 15 digits" })
    .nullable(),
} satisfies Record<string, z.ZodType>;

export type SettingKey = keyof typeof settingSchemas;
export type Settings = { [K in SettingKey]: z.infer<(typeof settingSchemas)[K]> };

export const defaultSettings: Settings = {
  // PLACEHOLDER, not the shop's number. The owner sets the real one in admin; the
  // launch check (M9) fails while this one is still in use.
  whatsapp_number: "+971500000000",
  vat_enabled: false,
  trn: null,
};

export class SettingsError extends Error {
  override name = "SettingsError";
}

const isSettingKey = (key: string): key is SettingKey => Object.hasOwn(settingSchemas, key);

/**
 * Builds the settings from stored rows over the defaults. Rows for unknown keys (left
 * by an older version) are ignored; an invalid stored value is an error, never
 * silently replaced by a default.
 */
export function parseSettings(rows: readonly { key: string; value: unknown }[]): Settings {
  const result: Record<string, unknown> = { ...defaultSettings };
  for (const { key, value } of rows) {
    if (!isSettingKey(key)) continue;
    const parsed = settingSchemas[key].safeParse(value);
    if (!parsed.success) {
      throw new SettingsError(
        `Setting "${key}" ${parsed.error.issues[0]?.message ?? "is invalid"}`,
      );
    }
    result[key] = parsed.data;
  }
  const settings = result as Settings;
  if (settings.vat_enabled && !settings.trn) {
    throw new SettingsError('Setting "vat_enabled" needs a TRN');
  }
  return settings;
}
