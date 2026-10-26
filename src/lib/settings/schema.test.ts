import { describe, expect, it } from "vitest";

import { normalizePhone } from "../phone";
import { defaultSettings, parseSettings, SettingsError } from "./schema";

describe("parseSettings", () => {
  it("uses the defaults when nothing is stored", () => {
    expect(parseSettings([])).toEqual(defaultSettings);
  });

  it("has a default WhatsApp number that is a valid UAE mobile", () => {
    expect(normalizePhone(defaultSettings.whatsapp_number, { mobileOnly: true })).toBe(
      defaultSettings.whatsapp_number,
    );
  });

  it("takes stored values over the defaults and ignores unknown keys", () => {
    expect(
      parseSettings([
        { key: "whatsapp_number", value: "+971501234567" },
        { key: "vat_enabled", value: true },
        { key: "trn", value: "100123456700003" },
        { key: "retired_setting", value: 42 },
      ]),
    ).toEqual({ whatsapp_number: "+971501234567", vat_enabled: true, trn: "100123456700003" });
  });

  it("refuses an invalid stored value instead of falling back", () => {
    for (const row of [
      { key: "whatsapp_number", value: "0501234567" },
      { key: "whatsapp_number", value: "+97172223333" }, // a landline can't use WhatsApp
      { key: "vat_enabled", value: "yes" },
      { key: "trn", value: "12345" },
    ]) {
      expect(() => parseSettings([row]), row.key).toThrow(SettingsError);
    }
  });

  it("needs a TRN while VAT is on", () => {
    expect(() => parseSettings([{ key: "vat_enabled", value: true }])).toThrow(/TRN/);
  });
});
