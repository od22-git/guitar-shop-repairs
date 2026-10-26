"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { renderSVG } from "uqr";

import { authClient, authError, onSubmit } from "../../_components/auth-client";
import { inputClass, primaryButton } from "../../_components/form";

type Enrolment = { uri: string; secret: string; backupCodes: string[] };

export function TwoFactorSetup() {
  const router = useRouter();
  const [enrolment, setEnrolment] = useState<Enrolment | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function start(form: FormData) {
    setPending(true);
    setError("");
    const { data, error } = await authClient.twoFactor.enable({
      password: String(form.get("password")),
    });
    setPending(false);
    if (error || !data || data.method !== "totp") {
      return setError(authError(error, "That password didn't work."));
    }
    const secret = new URL(data.totpURI).searchParams.get("secret") ?? "";
    setEnrolment({ uri: data.totpURI, secret, backupCodes: data.backupCodes });
  }

  async function confirm(form: FormData) {
    setPending(true);
    setError("");
    const { error } = await authClient.twoFactor.verifyTotp({
      code: String(form.get("code")).replace(/\s/g, ""),
    });
    setPending(false);
    if (error) return setError(authError(error, "That code didn't work. Try the next one."));
    router.replace("/admin");
  }

  const errorText = error && (
    <p role="alert" className="font-medium text-fiesta-deep">
      {error}
    </p>
  );

  if (!enrolment) {
    return (
      <form onSubmit={onSubmit(start)} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="font-medium">
            Confirm your password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className={inputClass}
          />
        </div>
        {errorText}
        <button type="submit" disabled={pending} className={primaryButton}>
          Continue
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={onSubmit(confirm)} className="flex flex-col gap-5">
      <ol className="flex list-decimal flex-col gap-5 ps-5">
        <li>
          <p>Scan this with the authenticator app.</p>
          <div
            className="mt-3 w-48 rounded-md bg-white p-2"
            role="img"
            aria-label="QR code for the authenticator app"
            // Generated here from the otpauth URI; no outside content.
            dangerouslySetInnerHTML={{ __html: renderSVG(enrolment.uri) }}
          />
          <p className="mt-3 text-sm text-ink-muted">Or type this key into the app:</p>
          <code data-testid="totp-secret" className="font-semibold break-all" dir="ltr">
            {enrolment.secret}
          </code>
        </li>
        <li>
          <p>
            Save these backup codes somewhere safe, away from your phone. Each one signs you in once
            if the phone is lost.
          </p>
          <ul className="mt-3 grid grid-cols-2 gap-1 font-semibold tabular-nums" dir="ltr">
            {enrolment.backupCodes.map((code) => (
              <li key={code}>{code}</li>
            ))}
          </ul>
        </li>
        <li className="flex flex-col gap-1">
          <label htmlFor="code" className="font-medium">
            Enter the 6-digit code the app shows
          </label>
          <input
            id="code"
            name="code"
            required
            autoComplete="one-time-code"
            inputMode="numeric"
            pattern="[0-9 ]{6,7}"
            className={inputClass}
          />
        </li>
      </ol>
      {errorText}
      <button type="submit" disabled={pending} className={primaryButton}>
        Turn on 2FA
      </button>
    </form>
  );
}
