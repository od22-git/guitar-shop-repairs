"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { authClient, authError, onSubmit } from "../../_components/auth-client";
import { inputClass, primaryButton } from "../../_components/form";

// Two steps: email and password, then the 6-digit code from the authenticator app (or a
// backup code). Sessions start only after the code, once 2FA is set up.
export function LoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<"password" | "code">("password");
  const [useBackup, setUseBackup] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function signIn(form: FormData) {
    setPending(true);
    setError("");
    const { data, error } = await authClient.signIn.email({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    setPending(false);
    if (error) return setError(authError(error, "Sign-in failed. Try again."));
    if (data && "twoFactorRedirect" in data && data.twoFactorRedirect) return setStep("code");
    // Signed in without 2FA: it has to be set up before anything else.
    router.replace("/admin/setup-2fa");
  }

  async function verify(form: FormData) {
    setPending(true);
    setError("");
    const code = String(form.get("code")).replace(/\s/g, "");
    const { error } = useBackup
      ? await authClient.twoFactor.verifyBackupCode({ code })
      : await authClient.twoFactor.verifyTotp({ code });
    setPending(false);
    if (error) return setError(authError(error, "That code didn't work. Try the next one."));
    router.replace("/admin");
  }

  const errorText = error && (
    <p role="alert" className="font-medium text-red">
      {error}
    </p>
  );

  if (step === "code") {
    return (
      <form onSubmit={onSubmit(verify)} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="code" className="font-medium">
            {useBackup ? "Backup code" : "Code from your authenticator app"}
          </label>
          <input
            id="code"
            name="code"
            required
            autoFocus
            autoComplete="one-time-code"
            inputMode={useBackup ? "text" : "numeric"}
            pattern={useBackup ? undefined : "[0-9 ]{6,7}"}
            className={inputClass}
          />
        </div>
        {errorText}
        <button type="submit" disabled={pending} className={primaryButton}>
          {pending ? "Checking…" : "Verify"}
        </button>
        <button
          type="button"
          onClick={() => setUseBackup(!useBackup)}
          className="self-start text-black underline underline-offset-4"
        >
          {useBackup ? "Use the authenticator app" : "Use a backup code instead"}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={onSubmit(signIn)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="username"
          className={inputClass}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="font-medium">
          Password
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
        {pending ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-sm text-grey-600">
        Forgot your password or lost your phone? Reset it from the command line: see the README.
      </p>
    </form>
  );
}
