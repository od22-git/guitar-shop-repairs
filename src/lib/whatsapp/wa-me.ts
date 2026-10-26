const E164 = /^\+[1-9]\d{6,14}$/;

/**
 * Builds a click-to-chat link: https://wa.me/<digits>?text=<message>.
 * Takes an E.164 number ("+971501234567"); wa.me wants the digits without "+".
 */
export function waMeUrl(phoneE164: string, text?: string): string {
  if (!E164.test(phoneE164)) {
    throw new RangeError("WhatsApp number must be in E.164 format, e.g. +971501234567");
  }
  const base = `https://wa.me/${phoneE164.slice(1)}`;
  // %20 rather than URLSearchParams' "+": WhatsApp's documented encoding.
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
