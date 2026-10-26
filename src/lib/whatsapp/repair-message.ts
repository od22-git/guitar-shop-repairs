import { createTranslator } from "next-intl";

import type { Locale } from "@/i18n/routing";
import { isolate, isolateLtr } from "@/lib/bidi";
import { endOfDubaiDay, formatDate } from "@/lib/datetime";
import type { RepairCloseReason, RepairEventKind, RepairStatus } from "@/lib/db/schema";
import { formatMoney } from "@/lib/money";

import ar from "../../../messages/ar.json";
import en from "../../../messages/en.json";

// The WhatsApp message for each repair event, in the customer's language. The admin
// sends it with a wa.me link (src/lib/repairs/notify.ts). Names, the ticket number and
// amounts are isolated so they stay whole inside Arabic text.

const messages = { en, ar };

export type RepairMessageInput = {
  locale: Locale;
  customerName: string;
  number: string;
  /** "Fender Jazzmaster", or null when brand and model weren't recorded. */
  instrument: string | null;
  /** The tracking page (M6), where the customer also approves quotes. */
  trackingUrl: string;
  event: {
    kind: RepairEventKind;
    toStatus: RepairStatus | null;
    closeReason: RepairCloseReason | null;
    publicNote: string | null;
    /** "YYYY-MM-DD", a day in Dubai. */
    etaDate: string | null;
  };
  /** What the customer owes: the quote at hand, or the diagnosis fee after a decline. */
  totalFils: number | null;
};

function etaText(locale: Locale, etaDate: string): string | null {
  const day = endOfDubaiDay(etaDate);
  return day ? formatDate(day, locale) : null;
}

export function repairMessage(input: RepairMessageInput): string {
  const { locale, event } = input;
  const t = createTranslator({ locale, messages: messages[locale], namespace: "RepairWhatsApp" });
  const statusName = createTranslator({
    locale,
    messages: messages[locale],
    namespace: "RepairStatus",
  });

  const total = input.totalFils === null ? null : isolate(formatMoney(input.totalFils, locale));
  const values = {
    name: isolate(input.customerName),
    number: isolateLtr(input.number),
    instrument: input.instrument
      ? t("instrumentNamed", { instrument: isolate(input.instrument) })
      : t("instrumentUnnamed"),
    total: total ?? "",
  };

  const lines: string[] = [];
  let link: "track" | "approve" | null = "track";
  if (event.kind === "update") {
    lines.push(t("update", values));
  } else if (event.kind === "quote") {
    lines.push(t("quote", values));
    link = "approve";
  } else if (event.kind === "correction" && event.toStatus) {
    lines.push(t("correction", { ...values, status: statusName(event.toStatus) }));
  } else {
    switch (event.toStatus) {
      case "received":
      case "in_repair":
        lines.push(t(event.toStatus, values));
        break;
      case "diagnosed":
        lines.push(t("diagnosed", values));
        link = "approve";
        break;
      case "ready":
        lines.push(t("ready", values));
        if (total) lines.push(t("total", values));
        break;
      case "closed":
        lines.push(t(`closed_${event.closeReason ?? "collected"}`, values));
        link = null;
        break;
      default:
        throw new RangeError(`No message for a ${event.kind} event`);
    }
  }

  if (event.publicNote) lines.push(event.publicNote);
  const eta = event.etaDate && etaText(locale, event.etaDate);
  if (eta && event.toStatus !== "ready" && event.toStatus !== "closed") {
    lines.push(t("eta", { date: isolate(eta) }));
  }
  if (link) lines.push(t(link, { url: input.trackingUrl }));
  return lines.join("\n");
}
