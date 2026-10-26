"use client";

import { useRouter } from "next/navigation";

import { authClient } from "../_components/auth-client";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="py-2 underline underline-offset-4"
      onClick={async () => {
        await authClient.signOut();
        router.replace("/admin/login");
      }}
    >
      Sign out
    </button>
  );
}
