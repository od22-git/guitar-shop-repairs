import type { Metadata } from "next";

import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { filsToDecimalString } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { listDeliveryZones, loadSettings } from "@/lib/settings/store";

import { Panel } from "../../_components/form";
import { emirateLabels } from "../orders/labels";

import { VatForm, WhatsAppForm, ZoneForm } from "./settings-forms";

export const metadata: Metadata = { title: "Settings" };

// The brand name stays in src/config/brand.ts: it must match the trade licence, and it's
// changed once, before launch.
export default async function SettingsPage() {
  await requireAdmin();
  const [settings, zones] = await Promise.all([loadSettings(db), listDeliveryZones(db)]);
  return (
    <>
      <h1 className="text-2xl font-bold">Settings</h1>
      <Panel title="WhatsApp">
        <WhatsAppForm value={formatPhone(settings.whatsapp_number)} />
      </Panel>
      <Panel title="VAT">
        <p className="mb-4 text-ink-muted">
          Prices are always final. Once registered, new orders show the 5% VAT inside them and the
          receipt becomes a tax invoice. Orders already made keep what they had.
        </p>
        <VatForm enabled={settings.vat_enabled} trn={settings.trn ?? ""} />
      </Panel>
      <Panel title="Delivery zones">
        <p className="mb-4 text-ink-muted">
          The courier fee added to an order for each emirate. Turn a zone off to stop offering
          delivery there.
        </p>
        <div className="flex flex-col gap-4">
          {zones.map((zone) => (
            <ZoneForm
              key={zone.id}
              zone={{
                id: zone.id,
                name: zone.nameEn,
                emirates: zone.emirates.map((e) => emirateLabels[e]).join(", "),
                fee: filsToDecimalString(zone.feeFils).replace(/\.00$/, ""),
                active: zone.active,
              }}
            />
          ))}
        </div>
      </Panel>
    </>
  );
}
