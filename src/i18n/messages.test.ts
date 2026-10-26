import { describe, expect, it } from "vitest";

import ar from "../../messages/ar.json";
import en from "../../messages/en.json";

function keys(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    keys(child, prefix ? `${prefix}.${key}` : key),
  );
}

function leaf(messages: unknown, path: string): string {
  return path
    .split(".")
    .reduce((node, key) => (node as Record<string, unknown>)[key], messages) as string;
}

const placeholders = (message: string) => [...message.matchAll(/\{(\w+)/g)].map((m) => m[1]).sort();

describe("messages", () => {
  it("Arabic has exactly the English keys", () => {
    expect(keys(ar).sort()).toEqual(keys(en).sort());
  });

  it("no message is empty", () => {
    for (const path of keys(en)) {
      expect(leaf(en, path).trim(), `en ${path}`).not.toBe("");
      expect(leaf(ar, path).trim(), `ar ${path}`).not.toBe("");
    }
  });

  it("Arabic uses the same placeholders as English", () => {
    for (const path of keys(en)) {
      expect(placeholders(leaf(ar, path)), path).toEqual(placeholders(leaf(en, path)));
    }
  });
});
