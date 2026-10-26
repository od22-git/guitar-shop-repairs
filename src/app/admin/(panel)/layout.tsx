import Link from "next/link";

import { brand } from "@/config/brand";
import { requireAdmin } from "@/lib/auth";

import { AdminNav } from "./admin-nav";
import { SignOutButton } from "./sign-out-button";

export default async function PanelLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();
  return (
    <>
      <header className="sticky top-0 z-10 bg-rosewood text-mist">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-5 gap-y-1 px-4 py-2">
          <Link href="/admin" className="me-auto py-2 font-bold">
            {brand.name.en}
          </Link>
          <AdminNav />
          <SignOutButton />
        </div>
      </header>
      <main id="main" className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6">
        {children}
      </main>
    </>
  );
}
