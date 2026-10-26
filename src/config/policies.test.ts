import { describe, expect, it } from "vitest";

import en from "../../messages/en.json";

import { policies, policyNumbers } from "./policies";

// The policy and FAQ pages read their sections from the messages, so these check the
// shape the pages expect and that every placeholder is one the pages fill in.

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)/g)].map((m) => m[1]);
const policyValues = ["brand", "location", ...Object.keys(policyNumbers)];
const faqValues = ["location", ...Object.keys(policyNumbers)];

describe("policy messages", () => {
  it.each(policies)("%s has a title, description, intro and sections", (policy) => {
    const messages = en.Policies[policy];
    expect(messages.title).toBeTruthy();
    expect(placeholders(messages.description)).toEqual([]);
    const sections = Object.values(messages.sections) as { heading: string; body: string }[];
    expect(sections.length).toBeGreaterThan(0);
    for (const text of [messages.intro, ...sections.flatMap((s) => [s.heading, s.body])]) {
      expect(text).toBeTruthy();
      for (const name of placeholders(text)) expect(policyValues).toContain(name);
    }
  });

  it("the delivery policy has the fees section its zone table follows", () => {
    expect(en.Policies.delivery.sections).toHaveProperty("fees");
  });

  it("FAQ answers use only the values the page passes", () => {
    for (const group of Object.values(en.Faq.groups)) {
      for (const { q, a } of Object.values(group.questions) as { q: string; a: string }[]) {
        expect(placeholders(q)).toEqual([]);
        for (const name of placeholders(a)) expect(faqValues).toContain(name);
      }
    }
  });
});
