import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { requireAdmin } from "@/lib/auth";
import { formatDateTime } from "@/lib/datetime";
import { db } from "@/lib/db/client";
import { getSubmission, repairRequestOf, sellOfferOf } from "@/lib/inbox";
import { formatMoney } from "@/lib/money";
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
  const offer = sellOfferOf(item);
  // The grades as the English shop names them.
  const tCondition = await getTranslations({ locale: "en", namespace: "Condition" });
  const guitar = offer ? [offer.brand, offer.model].filter(Boolean).join(" ") : undefined;

  const details: [string, string | undefined][] = offer
    ? [
        ["Brand", offer.brand],
        ["Model", offer.model],
        ["Year", offer.year?.toString()],
        ["Serial number", offer.serial],
        ["Condition (their grade)", tCondition(offer.condition)],
        [
          "Asking price",
          offer.askingPriceFils === undefined
            ? "Not given"
            : formatMoney(offer.askingPriceFils, "en"),
        ],
        ["About it", offer.description],
      ]
    : request
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
          {offer && " · confirmed they own it"}
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

      {item.photoKeys.length > 0 && (
        <section aria-labelledby="photos-heading" className="rounded-lg bg-paper p-4 sm:p-6">
          <h2 id="photos-heading" className="mb-3 text-lg font-bold">
            Photos
          </h2>
          <p className="mb-3 text-sm text-ink-muted">Private: only you can see them.</p>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {item.photoKeys.map((key, index) => (
              <li key={key}>
                <a href={`/api/inbox-photos/${key}-1920.webp`} target="_blank" className="block">
                  {/* Private files, for the signed-in admin: next/image can't fetch them. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/inbox-photos/${key}-640.webp`}
                    alt={`Photo ${index + 1} of ${item.photoKeys.length}`}
                    className="aspect-[4/3] w-full rounded-sm object-cover"
                  />
                </a>
              </li>
            ))}
          </ul>
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
          replyHref={inboxReplyUrl(item, guitar)}
          convertHref={
            request && item.status !== "converted" ? `/admin/repairs/new?from=${item.id}` : null
          }
        />
      </section>
    </>
  );
}
