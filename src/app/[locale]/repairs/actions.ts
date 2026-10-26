"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { hasLocale } from "next-intl";

import { routing } from "@/i18n/routing";
import { db } from "@/lib/db/client";
import { env } from "@/lib/env";
import { createRepairRequest, parseRepairRequestForm, type FieldProblem } from "@/lib/inbox";
import { hitRateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { hashIp } from "@/lib/signing";
import { TURNSTILE_FIELD, verifyTurnstile } from "@/lib/turnstile";

// The Book-a-repair form. A public endpoint, so: a honeypot field, Zod limits on every
// field, Cloudflare Turnstile, and at most BOOKINGS_PER_HOUR from one IP address. A
// booking lands in the admin inbox.

const BOOKINGS_PER_HOUR = 5;

export type BookingState =
  | { status: "idle" }
  | { status: "sent" }
  | { status: "invalid"; errors: Partial<Record<string, FieldProblem>>; at: number }
  | { status: "spam" | "rate_limited"; at: number };

export async function bookRepairAction(_: BookingState, form: FormData): Promise<BookingState> {
  const at = Date.now();
  // Bots fill every field; people never see this one.
  if (form.get("website")) return { status: "spam", at };

  const parsed = parseRepairRequestForm(form);
  if (!parsed.ok) return { status: "invalid", errors: parsed.errors, at };
  const locale = form.get("locale");
  if (typeof locale !== "string" || !hasLocale(routing.locales, locale)) {
    return { status: "spam", at };
  }

  const ip = clientIp(await headers());
  const token = form.get(TURNSTILE_FIELD);
  if (
    !(await verifyTurnstile(env.TURNSTILE_SECRET_KEY, typeof token === "string" ? token : null, ip))
  ) {
    return { status: "spam", at };
  }
  const who = ip ? hashIp(env.BETTER_AUTH_SECRET, ip) : "unknown";
  if (!(await hitRateLimit(db, `repair-booking:${who}`, BOOKINGS_PER_HOUR, 60 * 60))) {
    return { status: "rate_limited", at };
  }

  await createRepairRequest(db, parsed.data, locale);
  // The admin's inbox badge.
  revalidatePath("/admin", "layout");
  return { status: "sent" };
}
