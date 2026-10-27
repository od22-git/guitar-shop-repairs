import Link from "next/link";

import { count, isNull } from "drizzle-orm";

import { Wordmark } from "@/components/wordmark";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { repairEvents } from "@/lib/db/schema";
import { countNewSubmissions } from "@/lib/inbox";

import { AdminNav } from "./admin-nav";
import { SignOutButton } from "./sign-out-button";

export default async function PanelLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();
  const [[{ unsent }], inbox] = await Promise.all([
    db.select({ unsent: count() }).from(repairEvents).where(isNull(repairEvents.notifiedAt)),
    countNewSubmissions(db),
  ]);
  return (
    <>
      <header className="sticky top-0 z-10 bg-black text-white print:hidden">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-5 gap-y-1 px-4 py-2">
          <Link href="/admin" className="me-auto py-2">
            <Wordmark className="text-base" />
          </Link>
          <AdminNav unsent={unsent} inbox={inbox} />
          <SignOutButton />
        </div>
      </header>
      <main id="main" className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6">
        {children}
      </main>
    </>
  );
}
