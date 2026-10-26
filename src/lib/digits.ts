// Arabic keyboards type Arabic-Indic digits (٠١٢…), Persian/Urdu ones Extended
// Arabic-Indic (۰۱۲…). Inputs that hold numbers (phones, prices) accept both and
// store Western digits.
const ARABIC_INDIC_ZERO = 0x0660;
const EXTENDED_ARABIC_INDIC_ZERO = 0x06f0;

/** Replaces Arabic-Indic and Extended Arabic-Indic digits with 0–9; leaves the rest. */
export function toWesternDigits(input: string): string {
  return input.replace(/[\u0660-\u0669\u06f0-\u06f9]/g, (digit) => {
    const code = digit.charCodeAt(0);
    const zero =
      code >= EXTENDED_ARABIC_INDIC_ZERO ? EXTENDED_ARABIC_INDIC_ZERO : ARABIC_INDIC_ZERO;
    return String(code - zero);
  });
}
