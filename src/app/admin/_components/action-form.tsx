"use client";

import { startTransition, useActionState, type ReactNode } from "react";

import type { ActionState } from "./action-state";

/**
 * A form posting to a server action that answers with a message, announced to screen
 * readers. Submits without React's automatic form reset, so typed values survive an
 * error.
 */
export function ActionForm({
  action,
  children,
  className,
  confirm,
  announce,
}: {
  action: (state: ActionState, form: FormData) => Promise<ActionState>;
  children: (pending: boolean, state: ActionState) => ReactNode;
  className?: string;
  /** Asks before submitting, for actions that are hard to undo. */
  confirm?: string;
  /**
   * Hands the result to the caller to show instead, for forms that disappear when the
   * action succeeds (a Publish button once published).
   */
  announce?: (state: ActionState) => void;
}) {
  const [state, formAction, pending] = useActionState(
    async (previous: ActionState, form: FormData) => {
      const result = await action(previous, form);
      announce?.(result);
      return result;
    },
    {},
  );
  return (
    <form
      className={className}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (confirm && !window.confirm(confirm)) return;
        const form = new FormData(event.currentTarget);
        startTransition(() => formAction(form));
      }}
    >
      {children(pending, state)}
      {!announce && (
        <p
          role="status"
          className={
            state.ok === false ? "basis-full font-medium text-red" : "basis-full text-grey-600"
          }
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
