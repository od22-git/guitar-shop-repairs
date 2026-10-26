import { describe, expect, it } from "vitest";

import { repairMessage, type RepairMessageInput } from "./repair-message";

const base: RepairMessageInput = {
  locale: "en",
  customerName: "Sara",
  number: "R-0007",
  instrument: "Fender Jazzmaster",
  trackingUrl: "https://shop.example/en/r/tok",
  event: {
    kind: "status",
    toStatus: "received",
    closeReason: null,
    publicNote: null,
    etaDate: null,
  },
  totalFils: null,
};
// Without the isolates, direction marks and no-break spaces, for readable expectations.
const plain = (text: string) => text.replace(/[\u2066-\u2069\u200f]/g, "").replace(/\u00a0/g, " ");
const message = (
  patch: Partial<RepairMessageInput["event"]>,
  extra: Partial<RepairMessageInput> = {},
) => repairMessage({ ...base, ...extra, event: { ...base.event, ...patch } });

describe("repair WhatsApp messages", () => {
  it("opens with the ticket number and the tracking link", () => {
    expect(plain(message({}))).toBe(
      "Hello Sara, we’ve received your Fender Jazzmaster for repair. Your ticket number is R-0007.\n" +
        "Follow your repair here: https://shop.example/en/r/tok",
    );
  });

  it("isolates the name, number and amounts, and leaves the link bare", () => {
    const text = message({ toStatus: "diagnosed" }, { totalFils: 35_000 });
    expect(text).toContain("⁨Sara⁩");
    expect(text).toContain("⁦R-0007⁩");
    expect(text).toContain("⁨AED\u00a0350⁩");
    expect(
      text.endsWith("Please review and approve the quote here: https://shop.example/en/r/tok"),
    ).toBe(true);
  });

  it("writes Arabic for Arabic-speaking customers, with Western digits", () => {
    const text = plain(
      message(
        { toStatus: "diagnosed" },
        {
          locale: "ar",
          totalFils: 35_000,
          trackingUrl: "https://shop.example/ar/r/tok",
          instrument: null,
        },
      ),
    );
    expect(text).toContain("مرحباً Sara، فحصنا آلتك (التذكرة R-0007). قيمة عرض السعر: 350 د.إ.\n");
    expect(text).toContain(
      "يرجى مراجعة عرض السعر والموافقة عليه هنا: https://shop.example/ar/r/tok",
    );
  });

  it("adds the note and new ETA to an update", () => {
    expect(
      plain(
        message({
          kind: "update",
          toStatus: null,
          publicNote: "Waiting for the pickups.",
          etaDate: "2026-11-03",
        }),
      ),
    ).toBe(
      "Hello Sara, an update on your Fender Jazzmaster (ticket R-0007):\n" +
        "Waiting for the pickups.\n" +
        "Expected to be ready by 3 November 2026.\n" +
        "Follow your repair here: https://shop.example/en/r/tok",
    );
  });

  it("says what's owed when ready, and closes without a link", () => {
    expect(plain(message({ toStatus: "ready" }, { totalFils: 20_050 }))).toContain(
      "Total: AED 200.50.",
    );
    const closed = plain(message({ toStatus: "closed", closeReason: "abandoned" }));
    expect(closed).toBe(
      "Hello Sara, ticket R-0007 has been closed under our repair terms, as the instrument wasn’t collected.",
    );
  });

  it("explains a correction with the status name in the customer's language", () => {
    expect(plain(message({ kind: "correction", toStatus: "in_repair" }))).toContain(
      "its status is back to “In repair”",
    );
    expect(
      plain(message({ kind: "correction", toStatus: "in_repair" }, { locale: "ar" })),
    ).toContain("حالتها الآن «قيد التصليح»");
  });
});
