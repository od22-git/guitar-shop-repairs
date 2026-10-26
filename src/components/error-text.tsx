"use client";

import { createContext, use, type ReactNode } from "react";

// The 500 page's strings. Error boundaries get no props from the page, so the locale
// layout provides them here, in the page's language.

export type ErrorText = { title: string; body: string; retry: string; home: string };

const Context = createContext<ErrorText | null>(null);

export function ErrorTextProvider({ value, children }: { value: ErrorText; children: ReactNode }) {
  return <Context value={value}>{children}</Context>;
}

export function useErrorText(): ErrorText {
  const text = use(Context);
  if (!text) throw new Error("useErrorText needs an ErrorTextProvider");
  return text;
}
