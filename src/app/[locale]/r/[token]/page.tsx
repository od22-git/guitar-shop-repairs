import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { Bdi, Ltr } from "@/components/bdi";
import { Container } from "@/components/ui/layout";
import { Heading, Label, Lead } from "@/components/ui/text";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import { brand } from "@/config/brand";
import { policyNumbers } from "@/config/policies";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { endOfDubaiDay, formatDate } from "@/lib/datetime";
import { db } from "@/lib/db/client";
import type { RepairStatus } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { formatMoney } from "@/lib/money";
import { toPublicTicket, type PublicRepairEvent, type PublicTicket } from "@/lib/public-dto";
import type { TicketBalance } from "@/lib/repairs/balance";
import { accessCookieName, hasAccess, ticketIdByToken } from "@/lib/repairs/access";
import { signedPhotoUrl } from "@/lib/repairs/photo-links";
import { loadTicket } from "@/lib/repairs/tickets";
import { shopWhatsAppUrl } from "@/lib/whatsapp/shop-link";

import { AccessForm } from "./access-form";
import { QuoteDecision, type DecisionLabels } from "./quote-decision";

// A customer's repair ticket, from the private link in their WhatsApp messages. The link
// alone shows only the phone check; the ticket appears once the last 4 digits of their
// number match (src/lib/repairs/access.ts). An unknown or rotated token is a real 404.
// Never cached or indexed, no referrer (next.config.ts), and no third-party scripts.

// Rendered per request without streaming, so a bad token gets its 404 status before any
// of the page is sent.
export const instant = false;

// Link previews (WhatsApp) show only the brand and "Repair ticket": nothing personal.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Ticket");
  return {
    title: t("title"),
    robots: { index: false, follow: false },
    referrer: "no-referrer",
  };
}

const sectionHeading =
  "text-title font-extrabold tracking-[-0.01em] font-stretch-semi-expanded rtl:leading-[1.4] rtl:tracking-normal";

const progress: RepairStatus[] = ["received", "diagnosed", "in_repair", "ready", "closed"];

const day = (value: string | null, locale: Locale) => {
  const date = value ? endOfDubaiDay(value) : null;
  return date ? formatDate(date, locale) : null;
};

export default async function TicketPage({ params }: PageProps<"/[locale]/r/[token]">) {
  const { token } = await params;
  const ticketId = await ticketIdByToken(db, token);
  if (!ticketId) notFound();
  const [locale, t, jar] = await Promise.all([getLocale(), getTranslations("Ticket"), cookies()]);

  if (!hasAccess(env.BETTER_AUTH_SECRET, token, jar.get(accessCookieName(ticketId))?.value)) {
    return (
      <Container className="pt-10 pb-20 md:pt-16 md:pb-section">
        <div className="max-w-2xl">
          <Label as="p" className="text-grey-600">
            {t("title")}
          </Label>
          <Heading level="headline" as="h1" className="mt-4">
            {t("checkHeading")}
          </Heading>
          <Lead wide className="mt-6 text-grey-600">
            {t("checkIntro")}
          </Lead>
          <div className="mt-10 border-t border-black pt-8">
            <AccessForm
              token={token}
              locale={locale}
              labels={{ digits: t("digits"), show: t("show"), checking: t("checking") }}
            />
          </div>
        </div>
      </Container>
    );
  }

  const now = new Date();
  const [bundle, tStatus, helpUrl] = await Promise.all([
    loadTicket(db, ticketId),
    getTranslations("RepairStatus"),
    shopWhatsAppUrl(locale, "repairGreeting"),
  ]);
  const ticket = toPublicTicket(bundle, (file) =>
    signedPhotoUrl(env.BETTER_AUTH_SECRET, file, now),
  );
  const current = progress.indexOf(ticket.status);
  const statusName = (status: RepairStatus) =>
    status === "closed" && ticket.closeReason ? t(`closed.${ticket.closeReason}`) : tStatus(status);
  const waiting = ticket.quote?.status === "pending";
  const eta =
    ticket.status !== "ready" && ticket.status !== "closed" && day(ticket.etaDate, locale);

  return (
    <Container className="pt-10 pb-20 md:pt-16 md:pb-section">
      <div className="max-w-3xl">
        <Label as="p" className="text-grey-600">
          <span translate="no">{brand.name[locale]}</span>
        </Label>
        <h1 className="mt-4 text-headline font-black tracking-[-0.02em] text-balance font-stretch-semi-expanded rtl:leading-[1.3] rtl:tracking-normal">
          {t.rich("heading", {
            number: ticket.number,
            ltr: (chunks) => <Ltr>{chunks}</Ltr>,
          })}
        </h1>
        {ticket.instrument && (
          <p className="mt-4 text-title font-extrabold font-stretch-semi-expanded">
            <Bdi>{ticket.instrument}</Bdi>
          </p>
        )}
        <p className="mt-8 flex items-center gap-3 text-lg font-bold">
          <span aria-hidden="true" className="size-3 shrink-0 bg-blue" />
          {t("now", { status: waiting ? t("waiting") : statusName(ticket.status) })}
        </p>
        {eta && <p className="mt-1 ps-6 text-grey-600">{t("eta", { date: eta })}</p>}

        <section aria-labelledby="progress-heading" className="mt-8">
          <h2 id="progress-heading" className="sr-only">
            {t("statusHeading")}
          </h2>
          <ol className="grid grid-cols-5 gap-1">
            {progress.map((status, index) => {
              const state = index < current ? "done" : index === current ? "current" : "next";
              return (
                <li key={status} aria-current={state === "current" ? "step" : undefined}>
                  <span
                    aria-hidden="true"
                    className={`block h-1.5 ${state === "next" ? "bg-grey-300" : "bg-black"}`}
                  />
                  <span
                    className={`mt-2 block text-sm leading-snug ${state === "current" ? "font-bold" : state === "done" ? "" : "text-grey-600"}`}
                  >
                    {status === "closed" && index === current
                      ? statusName(status)
                      : tStatus(status)}
                  </span>
                </li>
              );
            })}
          </ol>
        </section>

        <section className="mt-12 border-t border-black pt-6">
          <Label as="h2" className="text-grey-600">
            {t("issueLabel")}
          </Label>
          <p className="mt-3 max-w-[60ch] text-lg whitespace-pre-line">{ticket.issue}</p>
        </section>

        {ticket.quote && (
          <QuoteSection
            ticket={ticket}
            quote={ticket.quote}
            token={token}
            locale={locale}
            labels={decisionLabels()}
          />
        )}

        {ticket.payment && <PaySection payment={ticket.payment} locale={locale} />}

        {ticket.photos.length > 0 && (
          <section aria-labelledby="photos-heading" className="mt-16">
            <h2 id="photos-heading" className={sectionHeading}>
              {t("photosHeading")}
            </h2>
            <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {ticket.photos.map((photo, index) => (
                <li key={photo.src}>
                  <a href={photo.srcLarge} target="_blank" rel="noreferrer" className="block">
                    {/* Signed, private files: next/image can't fetch them. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.src}
                      width={photo.width}
                      height={photo.height}
                      alt={t("photoAlt", {
                        stage: t(`photoStage.${photo.stage}`),
                        n: index + 1,
                      })}
                      className="aspect-[4/3] w-full bg-grey-100 object-cover"
                    />
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby="history-heading" className="mt-16">
          <h2 id="history-heading" className={sectionHeading}>
            {t("historyHeading")}
          </h2>
          <ol className="mt-6 border-s border-black">
            {ticket.events.toReversed().map((event, index) => (
              <li key={index} className="relative ps-5 pb-6 last:pb-0">
                <span
                  aria-hidden="true"
                  className="absolute -start-[5px] top-2 size-2.5 bg-black"
                />
                <p className="font-bold">{eventTitle(event)}</p>
                <p className="text-sm text-grey-600">{formatDate(event.at, locale)}</p>
                {event.note && <p className="mt-1 whitespace-pre-line">{event.note}</p>}
                {event.etaDate && event.kind === "update" && (
                  <p className="mt-1">{t("newEta", { date: day(event.etaDate, locale) ?? "" })}</p>
                )}
              </li>
            ))}
          </ol>
        </section>

        <p className="mt-16 border-t border-black pt-6">
          <a
            href={helpUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-2 font-bold underline decoration-blue decoration-2 underline-offset-[6px] hover:decoration-black"
          >
            <WhatsAppIcon className="size-5" />
            {t("help")}
          </a>
        </p>
      </div>
    </Container>
  );

  function eventTitle(event: PublicRepairEvent): string {
    switch (event.kind) {
      case "status":
        if (event.toStatus === "received") return t("event.opened");
        if (event.toStatus === "closed" && event.closeReason) {
          return t(`closed.${event.closeReason}`);
        }
        return t("event.status", { status: tStatus(event.toStatus ?? "received") });
      case "correction":
        return t("event.correction", { status: tStatus(event.toStatus ?? "received") });
      case "quote":
        return t("event.quote", { version: event.quoteVersion ?? 1 });
      case "update":
        return t("event.update");
    }
  }

  function decisionLabels(): DecisionLabels {
    const keys = [
      "approve",
      "decline",
      "declineConfirm",
      "sending",
      "acceptTerms",
      "needsTerms",
      "stale",
      "reload",
      "approvedNow",
      "declinedNow",
    ] as const;
    return Object.fromEntries(keys.map((key) => [key, t(key)])) as DecisionLabels;
  }
}

const termKeys = ["quote", "fee", "parts", "collection", "liability"] as const;

async function QuoteSection({
  ticket,
  quote,
  token,
  locale,
  labels,
}: {
  ticket: PublicTicket;
  quote: NonNullable<PublicTicket["quote"]>;
  token: string;
  locale: Locale;
  labels: DecisionLabels;
}) {
  const t = await getTranslations("Ticket");
  const money = (fils: number) => <Bdi>{formatMoney(fils, locale)}</Bdi>;
  const pending = quote.status === "pending";
  const needsTerms = pending && !ticket.termsAccepted;

  return (
    <section aria-labelledby="quote-heading" className="mt-16">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="quote-heading" className={sectionHeading}>
          {t("quoteHeading")}
        </h2>
        <Label as="p" className="text-grey-600">
          {t("quoteVersion", { version: quote.version })}
        </Label>
      </div>
      {pending && (
        <p className="mt-3 inline-block bg-blue px-2 py-1 font-bold text-white">{t("waiting")}</p>
      )}
      <table className="mt-6 w-full border-t border-black">
        <thead className="sr-only">
          <tr>
            <th scope="col">{t("item")}</th>
            <th scope="col">{t("amount")}</th>
          </tr>
        </thead>
        <tbody>
          {quote.items.map((item, index) => (
            <tr key={index} className="border-b border-grey-300">
              <td className="py-3 pe-4">
                <Bdi>{item.label}</Bdi>
              </td>
              <td className="py-3 text-end whitespace-nowrap tabular-nums">
                {money(item.amountFils)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" className="pt-4 text-start text-lg">
              {t("total")}
            </th>
            <td className="pt-4 text-end text-2xl font-black whitespace-nowrap font-stretch-semi-expanded tabular-nums">
              {money(quote.totalFils)}
            </td>
          </tr>
        </tfoot>
      </table>
      {quote.notes && <p className="mt-4 whitespace-pre-line">{quote.notes}</p>}

      {quote.decidedAt && (
        <p className="mt-6 font-bold">
          {t(quote.status === "approved" ? "approved" : "declined", {
            date: formatDate(quote.decidedAt, locale),
          })}
        </p>
      )}

      {pending && (
        <div className="mt-8 flex flex-col gap-6 bg-grey-100 p-6 md:p-8">
          {needsTerms && (
            <div>
              <h3 className="font-bold">{t("termsHeading")}</h3>
              <ul className="mt-3 list-disc space-y-1 ps-5 text-grey-600 marker:text-black">
                {termKeys.map((key) => (
                  <li key={key}>{t(`terms.${key}`, policyNumbers)}</li>
                ))}
              </ul>
              <Link
                href="/policies/repair-terms"
                target="_blank"
                className="mt-2 inline-flex min-h-11 items-center font-bold underline decoration-blue underline-offset-4 hover:decoration-black"
              >
                {t("fullTerms")}
              </Link>
            </div>
          )}
          <QuoteDecision
            token={token}
            quote={{ id: quote.id, version: quote.version }}
            needsTerms={needsTerms}
            labels={labels}
          />
        </div>
      )}
    </section>
  );
}

/**
 * What's owed: the amount due on collection, or a balance once something has been paid
 * (recorded by the shop on the ticket), or a thank-you once it's all paid.
 */
async function PaySection({ payment, locale }: { payment: TicketBalance; locale: Locale }) {
  const t = await getTranslations("Ticket");
  const money = (fils: number) => formatMoney(fils, locale);
  const bdi = (chunks: ReactNode) => <Bdi>{chunks}</Bdi>;
  const { chargeFils, paidFils, dueFils } = payment;
  const settled = chargeFils !== null && dueFils === 0;

  return (
    <section aria-labelledby="pay-heading" className="mt-12 bg-black p-6 text-white md:p-8">
      <h2
        id="pay-heading"
        className="font-mono text-label font-medium tracking-[0.08em] text-grey-400 uppercase rtl:font-grotesk rtl:text-sm rtl:tracking-normal"
      >
        {t("payHeading")}
      </h2>
      {paidFils <= 0 ? (
        <p className="mt-2 text-lg font-semibold">
          {t.rich("amountDue", { amount: money(dueFils), bdi })}
        </p>
      ) : settled ? (
        <p className="mt-2 text-lg font-semibold" data-testid="ticket-balance">
          {t.rich("paidInFull", { amount: money(paidFils), bdi })}
        </p>
      ) : (
        <dl className="mt-2 flex flex-col gap-1">
          {chargeFils !== null && (
            <div className="flex flex-wrap gap-x-2">
              <dt>{t("payTotal")}</dt>
              <dd className="font-semibold">
                <Bdi>{money(chargeFils)}</Bdi>
              </dd>
            </div>
          )}
          <div className="flex flex-wrap gap-x-2">
            <dt>{t("payPaid")}</dt>
            <dd className="font-semibold">
              <Bdi>{money(paidFils)}</Bdi>
            </dd>
          </div>
          {chargeFils !== null && (
            <div className="flex flex-wrap gap-x-2 text-lg" data-testid="ticket-balance">
              <dt className="font-semibold">{t("payBalance")}</dt>
              <dd className="font-bold">
                <Bdi>{money(dueFils)}</Bdi>
              </dd>
            </div>
          )}
        </dl>
      )}
      {!settled && <p className="mt-3 text-grey-400">{t("payNote")}</p>}
    </section>
  );
}
