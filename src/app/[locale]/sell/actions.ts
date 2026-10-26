"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { hasLocale } from "next-intl";

import { routing } from "@/i18n/routing";
import { db } from "@/lib/db/client";
import { env } from "@/lib/env";
import { createSellOffer, parseSellForm, type SellProblem } from "@/lib/inbox";
import { claimSellPhotos, deleteSellPhotos, MAX_SELL_PHOTOS } from "@/lib/inbox/sell-photos";
import { hitRateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { hashIp } from "@/lib/signing";
import { storage } from "@/lib/storage";
import { TURNSTILE_FIELD, verifyTurnstile } from "@/lib/turnstile";

// The Sell-us-your-guitar form. A public endpoint, so: a honeypot field, Zod limits on
// every field, Cloudflare Turnstile, and at most OFFERS_PER_HOUR from one IP address. The
// photos were uploaded already (src/app/api/upload/sell); the form sends their signed
// tokens, and they move to the inbox with the offer.

const OFFERS_PER_HOUR = 5;

export type SellState =
  | { status: "idle" }
  | { status: "sent" }
  | { status: "invalid"; errors: Partial<Record<string, SellProblem>>; at: number }
  | { status: "spam" | "rate_limited" | "photos_expired"; at: number };

export async function sellAction(_: SellState, form: FormData): Promise<SellState> {
  const at = Date.now();
  // Bots fill every field; people never see this one.
  if (form.get("website")) return { status: "spam", at };

  const parsed = parseSellForm(form, MAX_SELL_PHOTOS);
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
  if (!(await hitRateLimit(db, `sell-offer:${who}`, OFFERS_PER_HOUR, 60 * 60))) {
    return { status: "rate_limited", at };
  }

  const keys = await claimSellPhotos(storage, env.BETTER_AUTH_SECRET, parsed.data.photoTokens);
  // Forged, already sent, or gone: the visitor picks the photos again.
  if (!keys) return { status: "photos_expired", at };
  try {
    await createSellOffer(db, parsed.data, keys, locale);
  } catch (error) {
    await deleteSellPhotos(storage, keys);
    throw error;
  }
  // The admin's inbox badge.
  revalidatePath("/admin", "layout");
  return { status: "sent" };
}
