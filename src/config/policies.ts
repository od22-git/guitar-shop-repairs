// The shop's policies at /policies/<slug>. Their text is in messages/{en,ar}.json under
// "Policies.<key>"; the numbers they quote are here so the pages, the FAQ and the
// repair ticket say the same thing. These are drafts for the owner to review (M8).

export const policies = ["terms", "privacy", "returns", "delivery", "repair-terms"] as const;

export type PolicySlug = (typeof policies)[number];

/** When the policies' text last changed, shown on each page. Update with the text. */
export const policiesUpdated = new Date("2026-10-26T00:00:00+04:00");

export const policyNumbers = {
  /** Days a buyer has to report a problem and ask to return an item. */
  returnDays: 3,
  /** Hours to report damage in transit, from delivery. */
  damageHours: 48,
  /** Days within which a refund is sent once a return is received and checked. */
  refundDays: 7,
  /** Days after Ready before an uncollected instrument may be treated as abandoned. */
  abandonDays: 90,
  /** Days the shop guarantees its repair work. */
  repairWarrantyDays: 30,
  /** Months of local warranty on new devices (the NANOCORE, footswitches). */
  warrantyMonths: 6,
  /** Rounds of tweaks to a custom tone included before delivery. */
  toneRounds: 3,
} as const;

export const isPolicySlug = (value: string): value is PolicySlug =>
  (policies as readonly string[]).includes(value);
