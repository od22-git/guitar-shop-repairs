// Unicode bidi isolates for plain strings (option labels, WhatsApp messages), where
// <bdi> isn't available. In Arabic text, a Latin code next to punctuation ("SS:") or a
// SKU with hyphens and digits can reorder its neighbours; isolating keeps the run whole.
// The characters are invisible.

const LRI = "⁦"; // left-to-right isolate
const FSI = "⁨"; // first strong isolate: direction from the text itself
const PDI = "⁩"; // pop directional isolate

/** Codes, SKUs, numbers: always left to right. */
export const isolateLtr = (text: string) => `${LRI}${text}${PDI}`;

/** Names and titles in either script. */
export const isolate = (text: string) => `${FSI}${text}${PDI}`;
