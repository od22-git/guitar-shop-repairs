import type { Metadata } from "next";
import Link from "next/link";

import { requireAdmin } from "@/lib/auth";
import { dubaiDateInputValueInDays } from "@/lib/datetime";

import { createTicketAction } from "../actions";
import { TicketForm } from "../ticket-form";

export const metadata: Metadata = { title: "New repair ticket" };

export default async function NewTicketPage() {
  await requireAdmin();
  return (
    <>
      <p>
        <Link href="/admin/repairs" className="underline underline-offset-4">
          Repairs
        </Link>
      </p>
      <h1 className="text-2xl font-bold">New repair ticket</h1>
      <p className="text-ink-muted">
        A returning customer is found by their phone number. Add intake photos on the next screen.
      </p>
      <TicketForm
        action={createTicketAction}
        values={{
          preferredLocale: "en",
          intakeMethod: "drop_off",
          etaDate: dubaiDateInputValueInDays(7),
        }}
        creating
      />
    </>
  );
}
