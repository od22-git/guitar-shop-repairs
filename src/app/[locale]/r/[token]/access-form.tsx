"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";

import { fieldProps, FormField, inputClass, submitClass } from "@/components/form-parts";

import { checkAccessAction, type AccessState } from "./actions";

/**
 * The phone check in front of a ticket. The count of wrong tries is kept on the server
 * (per ticket), so reloading the page doesn't reset it; its messages come from there.
 */
export function AccessForm({
  token,
  locale,
  labels,
}: {
  token: string;
  locale: "en" | "ar";
  labels: { digits: string; show: string; checking: string };
}) {
  const [state, formAction, pending] = useActionState<AccessState, FormData>(
    checkAccessAction.bind(null, token),
    { status: "idle" },
  );
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (state.status !== "idle") input.current?.focus();
  }, [state]);
  const error = state.status === "idle" ? undefined : state.message;

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        startTransition(() => formAction(form));
      }}
    >
      <input type="hidden" name="locale" value={locale} />
      <FormField label={labels.digits} name="digits" error={error}>
        <input
          {...fieldProps("digits", error)}
          ref={input}
          inputMode="numeric"
          autoComplete="off"
          maxLength={4}
          dir="ltr"
          className={`${inputClass} max-w-40 text-center text-xl tabular-nums`}
        />
      </FormField>
      <button type="submit" disabled={pending} className={`${submitClass} self-start`}>
        {pending ? labels.checking : labels.show}
      </button>
    </form>
  );
}
