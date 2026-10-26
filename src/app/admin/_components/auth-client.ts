import type { FormEvent } from "react";

import { twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

/** Better Auth from the browser: sign-in, 2FA, sign-out. Same origin, so no base URL. */
export const authClient = createAuthClient({ plugins: [twoFactorClient()] });

/** Better Auth's message for a failed call, or a fallback. */
export function authError(error: { message?: string } | null, fallback: string): string {
  return error?.message || fallback;
}

/** A submit handler passing the form's data to `handle`, without React's form reset, so
 * a retry keeps what was typed. */
export function onSubmit(handle: (form: FormData) => Promise<unknown>) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void handle(new FormData(event.currentTarget));
  };
}
