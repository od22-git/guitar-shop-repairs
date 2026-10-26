"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

// Cloudflare Turnstile, the spam check on public forms. Rendered explicitly, so it also
// appears after a client-side navigation (when the script is already loaded). It adds
// a hidden `cf-turnstile-response` field to the surrounding form; `resetKey` changes
// after each submit, since a token works only once.

type TurnstileApi = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export function Turnstile({
  siteKey,
  locale,
  resetKey,
}: {
  siteKey: string;
  locale: "en" | "ar";
  resetKey: number;
}) {
  const container = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const api = window.turnstile;
    if (!api || !container.current || widget.current) return;
    widget.current = api.render(container.current, {
      sitekey: siteKey,
      language: locale === "ar" ? "ar-eg" : "en",
      theme: "light",
    });
    return () => {
      if (widget.current) api.remove(widget.current);
      widget.current = null;
    };
  }, [loaded, siteKey, locale]);

  useEffect(() => {
    if (resetKey && widget.current) window.turnstile?.reset(widget.current);
  }, [resetKey]);

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={() => setLoaded(true)}
      />
      <div ref={container} className="min-h-[65px]" />
    </>
  );
}
