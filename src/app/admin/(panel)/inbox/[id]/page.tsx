import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAdmin } from "@/lib/auth";
import { formatDateTime } from "@/lib/datetime";
import { db } from "@/lib/db/client";
import { getSubmission, repairRequestOf } from "@/lib/inbox";
import { formatPhone } from "@/lib/phone";
import { inboxReplyUrl } from "@/lib/whatsapp/inbox-message";

import { emirateLabels, inboxStatusLabels, intakeLabels, kindLabels } from "../labels";

import { ItemActions } from "./item-actions";

export const metadata: Metadata = { title: "Inbox item" };

export default async function InboxItemPage({ params }: PageProps<"/admin/inbox/[id]">) {
  await requireAdmin();
  const id = Number((await params).id);
  const item = Number.isSafeInteger(id) && id >= 1 ? await getSubmission(db, id) : null;
  if (!item) notFound();
  const request = repairRequestOf(item);

  const details: [string, string | undefined][] = request
    ? [
        ["Brand", request.instrumentBrand],
        ["Model", request.instrumentModel],
        ["What needs doing", request.issue],
        [
          "Getting it to you",
          request.intakeMethod === "courier" && request.emirate
            ? `${intakeLabels.courier}, ${emirateLabels[request.emirate]}`
            : intakeLabels[request.intakeMethod],
        ],
      ]
    : [];

  return (
    <>
      <p>
        <Link href="/admin/inbox" className="underline underline-offset-4">
          Inbox
        </Link>
      </p>
      <div>
        <h1 className="text-2xl font-bold">
          {kindLabels[item.kind]} · {item.name}
        </h1>
        <p className="text-ink-muted">
          {inboxStatusLabels[item.status]} · sent {formatDateTime(item.createdAt, "en")} · in{" "}
          {item.locale === "ar" ? "Arabic" : "English"}
        </p>
        <p className="mt-1">
          <span dir="ltr">{formatPhone(item.phoneE164)}</span> · agreed to replies on WhatsApp
        </p>
      </div>

      {details.length > 0 && (
        <section aria-labelledby="details-heading" className="rounded-lg bg-paper p-4 sm:p-6">
          <h2 id="details-heading" className="mb-3 text-lg font-bold">
            Details
          </h2>
          <dl className="flex flex-col gap-3">
            {details
              .filter((entry): entry is [string, string] => Boolean(entry[1]))
              .map(([label, value]) => (
                <div key={label}>
                  <dt className="text-sm text-ink-muted">{label}</dt>
                  <dd dir="auto" className="whitespace-pre-line">
                    {value}
                  </dd>
                </div>
              ))}
          </dl>
        </section>
      )}

      {item.convertedTicketId && (
        <p className="rounded-lg bg-paper p-4">
          <Link
            href={`/admin/repairs/${item.convertedTicketId}`}
            className="font-semibold underline underline-offset-4"
          >
            Open its repair ticket
          </Link>
        </p>
      )}

      <section aria-labelledby="actions-heading" className="rounded-lg bg-paper p-4 sm:p-6">
        <h2 id="actions-heading" className="mb-3 text-lg font-bold">
          Next step
        </h2>
        <ItemActions
          id={item.id}
          status={item.status}
          replyHref={inboxReplyUrl(item)}
          convertHref={
            request && item.status !== "converted" ? `/admin/repairs/new?from=${item.id}` : null
          }
        />
      </section>
    </>
  );
}
