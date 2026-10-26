"use server";

import { refresh, revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { isolate } from "@/lib/bidi";
import { formatDateTime } from "@/lib/datetime";
import { db } from "@/lib/db/client";
import { env } from "@/lib/env";
import {
  ACCESS_COOKIE_DAYS,
  accessCookieName,
  accessCookieValue,
  checkPhoneDigits,
  hasAccess,
  parseLastDigits,
  ticketIdByToken,
} from "@/lib/repairs/access";
import { RepairError } from "@/lib/repairs/errors";
import { decideQuoteFromLink } from "@/lib/repairs/quotes";
import { clientIp } from "@/lib/request-ip";
import { hashIp } from "@/lib/signing";

// The tracking page's actions: the phone check and the customer's quote decision.
// Public endpoints, so each one finds the ticket by its token again and the decision
// also needs the cookie the phone check set. Bound arguments come from the page but a
// caller can change them, so they're checked like any input.

export type AccessState =
  { status: "idle" } | { status: "invalid" | "wrong" | "locked"; message: string; at: number };

export async function checkAccessAction(
  token: string,
  _: AccessState,
  form: FormData,
): Promise<AccessState> {
  const at = Date.now();
  const formLocale = form.get("locale");
  const locale = formLocale === "ar" ? "ar" : "en";
  const t = await getTranslations({ locale, namespace: "Ticket" });
  const raw = form.get("digits");
  const digits = typeof raw === "string" ? parseLastDigits(raw) : null;
  if (!digits) return { status: "invalid", message: t("invalidDigits"), at };

  const result = await checkPhoneDigits(db, String(token), digits);
  if (!result.ok) {
    if (result.problem === "wrong") {
      return { status: "wrong", message: t("wrong", { left: result.triesLeft }), at };
    }
    if (result.problem === "locked") {
      const time = formatDateTime(result.until, locale);
      return { status: "locked", message: t("locked", { time: isolate(time) }), at };
    }
    notFound();
  }

  const ticketId = await ticketIdByToken(db, token);
  if (!ticketId) notFound();
  (await cookies()).set(
    accessCookieName(ticketId),
    accessCookieValue(env.BETTER_AUTH_SECRET, token),
    {
      httpOnly: true,
      secure: env.SITE_URL.startsWith("https://"),
      sameSite: "lax",
      path: "/",
      maxAge: ACCESS_COOKIE_DAYS * 24 * 60 * 60,
    },
  );
  // Setting a cookie re-renders the page, now showing the ticket.
  return { status: "idle" };
}

export type DecisionState =
  | { status: "idle" }
  | { status: "approved" | "declined" }
  | { status: "stale" | "needs_terms" | "no_access"; at: number };

export async function decideQuoteAction(
  token: string,
  quoteId: number,
  version: number,
  _: DecisionState,
  form: FormData,
): Promise<DecisionState> {
  const at = Date.now();
  const ticketId = await ticketIdByToken(db, String(token));
  const jar = await cookies();
  if (
    !ticketId ||
    !hasAccess(env.BETTER_AUTH_SECRET, token, jar.get(accessCookieName(ticketId))?.value)
  ) {
    return { status: "no_access", at };
  }
  const decision = form.get("decision");
  if (decision !== "approved" && decision !== "declined") return { status: "stale", at };
  if (!Number.isSafeInteger(quoteId) || !Number.isSafeInteger(version)) {
    return { status: "stale", at };
  }

  const ip = clientIp(await headers());
  try {
    await decideQuoteFromLink(db, ticketId, {
      quoteId,
      version,
      decision,
      acceptTerms: form.get("acceptTerms") === "on",
      ipHash: hashIp(env.BETTER_AUTH_SECRET, ip ?? "unknown"),
    });
  } catch (error) {
    if (error instanceof RepairError) {
      return { status: error.problem === "needs_terms" ? "needs_terms" : "stale", at };
    }
    throw error;
  }
  // The page shows the decision; the admin sees it on the ticket and the dashboard.
  refresh();
  revalidatePath("/admin", "layout");
  return { status: decision };
}
