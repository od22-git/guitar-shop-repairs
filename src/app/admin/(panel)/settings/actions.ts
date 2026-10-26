"use server";

import { revalidatePath, updateTag } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { MAX_FILS, parseAedToFils } from "@/lib/money";
import { normalizePhone } from "@/lib/phone";
import { SETTINGS_TAG } from "@/lib/settings";
import { saveSettings, SettingsError, updateDeliveryZone } from "@/lib/settings/store";

import type { ActionState } from "../../_components/action-state";

// Every action starts with requireAdmin() (see e2e/admin-access.spec.ts). A change expires
// the settings cache, so the shop's pages pick it up at once.

function done(message: string): ActionState {
  updateTag(SETTINGS_TAG);
  revalidatePath("/admin", "layout");
  return { ok: true, message, at: Date.now() };
}

function toId(value: unknown): number {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) throw new Error("Invalid id");
  return id;
}

export async function saveWhatsAppAction(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const number = normalizePhone(String(form.get("whatsappNumber") ?? ""), { mobileOnly: true });
  if (!number) {
    const message = "Enter a mobile number, like 050 123 4567";
    return { ok: false, message, errors: { whatsappNumber: message } };
  }
  await saveSettings(db, { whatsapp_number: number });
  return done("Saved. Every WhatsApp button now goes to this number.");
}

export async function saveVatAction(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const enabled = form.get("vatEnabled") === "on";
  const trn = String(form.get("trn") ?? "").replace(/[\s-]/g, "");
  if (trn && !/^\d{15}$/.test(trn)) {
    const message = "A TRN is 15 digits.";
    return { ok: false, message, errors: { trn: message } };
  }
  if (enabled && !trn) {
    const message = "VAT needs the shop's TRN.";
    return { ok: false, message, errors: { trn: message } };
  }
  try {
    await saveSettings(db, { vat_enabled: enabled, trn: trn || null });
  } catch (error) {
    if (error instanceof SettingsError) return { ok: false, message: error.message };
    throw error;
  }
  return done(
    enabled
      ? "VAT is on. New orders show the VAT inside their prices, with the TRN."
      : "VAT is off.",
  );
}

export async function saveZoneAction(
  zoneId: number,
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const fee = parseAedToFils(String(form.get("fee") ?? ""));
  if (fee === null || fee > MAX_FILS) {
    const message = "Enter a fee in AED, like 35";
    return { ok: false, message, errors: { fee: message } };
  }
  const saved = await updateDeliveryZone(db, toId(zoneId), {
    feeFils: fee,
    active: form.get("active") === "on",
  });
  if (!saved) return { ok: false, message: "This zone no longer exists." };
  return done("Zone saved.");
}
