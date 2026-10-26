"use client";

import { startTransition } from "react";

import { ActionForm } from "../../../_components/action-form";
import { primaryButton, secondaryButton } from "../../../_components/form";
import { markNotifiedAction } from "../actions";

type Message = { id: number; label: string; at: string; text: string; href: string };

// The ticket's unsent WhatsApp updates. "Send on WhatsApp" opens WhatsApp with the
// message and takes it off the list; "Mark as sent" is for news given another way.
export function MessagesPanel({ messages }: { messages: Message[] }) {
  if (messages.length === 0) return null;
  return (
    <section
      aria-labelledby="messages-heading"
      className="flex flex-col gap-4 rounded-lg border-2 border-fiesta bg-paper p-4 sm:p-6"
    >
      <h2 id="messages-heading" className="text-lg font-bold">
        {messages.length === 1
          ? "1 WhatsApp update to send"
          : `${messages.length} WhatsApp updates to send`}
      </h2>
      <ol className="flex flex-col gap-4">
        {messages.map((message) => (
          <li key={message.id} className="flex flex-col gap-2 border-b border-mist pb-4">
            <p className="font-medium">
              {message.label}{" "}
              <span className="text-sm font-normal text-ink-muted">· {message.at}</span>
            </p>
            <p
              dir="auto"
              className="rounded-md bg-mist p-3 [overflow-wrap:anywhere] whitespace-pre-line"
              data-testid="message-text"
            >
              {message.text}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <a
                href={message.href}
                target="_blank"
                rel="noopener"
                className={primaryButton}
                onClick={() => startTransition(() => void markNotifiedAction(message.id))}
              >
                Send on WhatsApp
              </a>
              <ActionForm
                action={markNotifiedAction.bind(null, message.id)}
                className="flex flex-wrap items-center gap-3"
              >
                {(pending) => (
                  <button type="submit" disabled={pending} className={secondaryButton}>
                    Mark as sent
                  </button>
                )}
              </ActionForm>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
