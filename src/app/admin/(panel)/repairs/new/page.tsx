import type { Metadata } from "next";
import Link from "next/link";

import { requireAdmin } from "@/lib/auth";
import { dubaiDateInputValueInDays } from "@/lib/datetime";
import { db } from "@/lib/db/client";
import { getSubmission, repairRequestOf } from "@/lib/inbox";
import { formatPhone } from "@/lib/phone";

import { createTicketAction } from "../actions";
import { TicketForm } from "../ticket-form";

export const metadata: Metadata = { title: "New repair ticket" };

/** The online booking to convert (?from=<inbox id>), if it can still be converted. */
async function booking(from: string | string[] | undefined) {
  const id = Number(from);
  if (!Number.isSafeInteger(id) || id < 1) return null;
  const item = await getSubmission(db, id);
  const request = item && repairRequestOf(item);
  if (!item || !request || item.status === "converted") return null;
  return { item, request };
}

export default async function NewTicketPage({ searchParams }: PageProps<"/admin/repairs/new">) {
  await requireAdmin();
  const from = await booking((await searchParams).from);
  const values: Record<string, string> = {
    preferredLocale: "en",
    intakeMethod: "drop_off",
    etaDate: dubaiDateInputValueInDays(7),
  };
  if (from) {
    const { item, request } = from;
    Object.assign(values, {
      name: item.name,
      phone: formatPhone(item.phoneE164),
      preferredLocale: item.locale,
      // They agreed to WhatsApp replies on the booking form.
      whatsappConsent: "on",
      intakeMethod: request.intakeMethod,
      instrumentBrand: request.instrumentBrand ?? "",
      instrumentModel: request.instrumentModel ?? "",
      issue: request.issue,
    });
  }

  return (
    <>
      <p>
        <Link
          href={from ? `/admin/inbox/${from.item.id}` : "/admin/repairs"}
          className="underline underline-offset-4"
        >
          {from ? "Inbox item" : "Repairs"}
        </Link>
      </p>
      <h1 className="text-2xl font-bold">New repair ticket</h1>
      <p className="text-grey-600">
        {from
          ? "Filled in from the online booking. Check it against the instrument in front of you."
          : "A returning customer is found by their phone number."}{" "}
        Add intake photos on the next screen.
      </p>
      <TicketForm
        action={createTicketAction}
        values={values}
        creating
        fromInboxId={from?.item.id}
      />
    </>
  );
}
