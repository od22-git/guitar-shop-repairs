import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/lib/db/client";
import { env } from "@/lib/env";

import { createAuth } from "./config";

export const auth = createAuth({ db, secret: env.BETTER_AUTH_SECRET, baseURL: env.SITE_URL });

export type Admin = { id: string; email: string; name: string };

/**
 * The signed-in admin, or null. A session counts only once 2FA is set up: until then it
 * can reach the 2FA setup page and nothing else.
 */
export async function getAdmin(requestHeaders?: Headers): Promise<Admin | null> {
  const session = await auth.api.getSession({ headers: requestHeaders ?? (await headers()) });
  if (!session?.user.twoFactorEnabled) return null;
  const { id, email, name } = session.user;
  return { id, email, name };
}

/**
 * Call first in every admin page, server action and route. Sends anyone else to the
 * sign-in page (or to 2FA setup, when signed in without it).
 */
export async function requireAdmin(): Promise<Admin> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/admin/login");
  if (!session.user.twoFactorEnabled) redirect("/admin/setup-2fa");
  const { id, email, name } = session.user;
  return { id, email, name };
}

/** For the 2FA setup page: a signed-in user who may not have 2FA yet. */
export async function getSessionUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}
