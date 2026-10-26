import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth";

import { TwoFactorSetup } from "./two-factor-setup";

export const metadata: Metadata = { title: "Set up 2FA" };

// Signed in with a password but no 2FA yet: the only page such a session can open.
export default async function SetupTwoFactorPage() {
  const user = await getSessionUser();
  if (!user) redirect("/admin/login");
  if (user.twoFactorEnabled) redirect("/admin");
  return (
    <>
      <h1 className="text-2xl font-bold">Set up two-factor sign-in</h1>
      <p>
        Every sign-in needs a code from an authenticator app on your phone, such as Google
        Authenticator, Microsoft Authenticator or 1Password.
      </p>
      <TwoFactorSetup />
    </>
  );
}
