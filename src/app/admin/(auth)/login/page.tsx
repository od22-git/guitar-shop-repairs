import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect(user.twoFactorEnabled ? "/admin" : "/admin/setup-2fa");
  return (
    <>
      <h1 className="text-2xl font-bold">Sign in</h1>
      <LoginForm />
    </>
  );
}
