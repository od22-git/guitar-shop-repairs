import { Alexandria, Archivo, JetBrains_Mono } from "next/font/google";

// The type system (docs/design.md): Archivo for Latin, with its width axis so the wordmark
// and headings can be set extra wide; Alexandria for Arabic, picked by the owner as the
// closest match to Archivo's wide, heavy shapes; JetBrains Mono for small labels. Arabic
// characters fall through Archivo and JetBrains Mono to Alexandria.
//
// No metric-matched local fallbacks: on Windows that fallback is Arial, which has Arabic
// glyphs and would catch Arabic text before it reaches Alexandria.

export const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
  adjustFontFallback: false,
  fallback: [],
});

export const alexandria = Alexandria({
  subsets: ["arabic"],
  variable: "--font-alexandria",
  display: "swap",
  adjustFontFallback: false,
  fallback: [],
});

export const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: "500",
  variable: "--font-jetbrains-mono",
  display: "swap",
  adjustFontFallback: false,
  fallback: [],
});

/** The three families' CSS variables, for the <html> element of each root layout. */
export const fontVariables = `${archivo.variable} ${alexandria.variable} ${jetbrainsMono.variable}`;
