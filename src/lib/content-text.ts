import "server-only";

import { getTranslations } from "next-intl/server";

/**
 * A translator for long-form content whose keys come from the messages themselves (the
 * policies' sections, the FAQ's questions), which next-intl's typed keys can't follow.
 * messages.test.ts checks both languages have the same keys and placeholders.
 */
export type ContentText = {
  (key: string, values?: Record<string, string | number>): string;
  /** The keys of the object at `key`, in the messages' order. */
  keys(key: string): string[];
};

export async function getContentText(namespace: "Faq" | "Policies"): Promise<ContentText> {
  const t = await getTranslations(namespace);
  const text = ((key: string, values?: Record<string, string | number>) =>
    t(key as never, values as never)) as ContentText;
  text.keys = (key) => Object.keys(t.raw(key as never) as Record<string, unknown>);
  return text;
}
