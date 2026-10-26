import { sql } from "drizzle-orm";

import type { Database } from "./db/connect";
import { customers } from "./db/schema";

import type { Locale } from "@/i18n/routing";

export type CustomerInput = {
  name: string;
  /** E.164, from normalizePhone(). */
  phone: string;
  preferredLocale: Locale;
  whatsappConsent: boolean;
};

/**
 * Finds the customer by phone number, or adds them. A returning customer's name and
 * language are updated to what was entered; WhatsApp consent, once given, is kept.
 */
export async function upsertCustomer(db: Database, input: CustomerInput): Promise<number> {
  const [customer] = await db
    .insert(customers)
    .values({
      name: input.name,
      phoneE164: input.phone,
      preferredLocale: input.preferredLocale,
      whatsappConsentAt: input.whatsappConsent ? new Date() : null,
    })
    .onConflictDoUpdate({
      target: customers.phoneE164,
      set: {
        name: input.name,
        preferredLocale: input.preferredLocale,
        whatsappConsentAt: sql`coalesce(${customers.whatsappConsentAt}, excluded.whatsapp_consent_at)`,
      },
    })
    .returning({ id: customers.id });
  return customer.id;
}
