import { eq } from "drizzle-orm";

import type { Database } from "../db/connect";
import { authTwoFactors, authUsers } from "../db/schema";

import { MIN_PASSWORD_LENGTH, type Auth } from "./config";

// What the admin scripts do (scripts/admin.mts). There's no email, so a forgotten
// password or a lost authenticator is fixed from the command line. Each reset signs
// every session out.

export class AdminUserError extends Error {
  override name = "AdminUserError";
}

function checkPassword(password: string) {
  if (password.length < MIN_PASSWORD_LENGTH || password.length > 128) {
    throw new AdminUserError(`The password must be ${MIN_PASSWORD_LENGTH} to 128 characters.`);
  }
}

async function findUser(auth: Auth, email: string) {
  const ctx = await auth.$context;
  const found = await ctx.internalAdapter.findUserByEmail(email.toLowerCase());
  if (!found) throw new AdminUserError(`No admin with the email ${email}.`);
  return { ctx, user: found.user };
}

/** Creates the admin. They set up 2FA on first sign-in. */
export async function createAdmin(
  auth: Auth,
  { email, name, password }: { email: string; name: string; password: string },
): Promise<void> {
  checkPassword(password);
  const ctx = await auth.$context;
  const normalised = email.trim().toLowerCase();
  if (await ctx.internalAdapter.findUserByEmail(normalised)) {
    throw new AdminUserError(`An admin with the email ${email} already exists.`);
  }
  const user = await ctx.internalAdapter.createUser(
    { email: normalised, name, emailVerified: true },
    { method: "admin" },
  );
  await ctx.internalAdapter.linkAccount({
    userId: user.id,
    providerId: "credential",
    accountId: user.id,
    password: await ctx.password.hash(password),
  });
}

export async function resetPassword(auth: Auth, email: string, password: string): Promise<void> {
  checkPassword(password);
  const { ctx, user } = await findUser(auth, email);
  await ctx.internalAdapter.updatePassword(user.id, await ctx.password.hash(password));
  await ctx.internalAdapter.deleteUserSessions(user.id);
}

/** Turns 2FA off; the admin sets it up again on next sign-in. */
export async function resetTwoFactor(auth: Auth, db: Database, email: string): Promise<void> {
  const { ctx, user } = await findUser(auth, email);
  await db.transaction(async (tx) => {
    await tx.delete(authTwoFactors).where(eq(authTwoFactors.userId, user.id));
    await tx.update(authUsers).set({ twoFactorEnabled: false }).where(eq(authUsers.id, user.id));
  });
  await ctx.internalAdapter.deleteUserSessions(user.id);
}
