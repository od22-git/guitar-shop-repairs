import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

// Tailwind utilities with a physical direction. The site is RTL in Arabic, so use the
// logical ones instead: ms-/me-, ps-/pe-, start-/end-, text-start/end, rounded-s/e, border-s/e.
const physicalTailwind =
  "(^|[\\s:!])-?((scroll-)?[mp][lr]|left|right|border-[lr]|rounded-[lr]|rounded-[tb][lr])-|(^|[\\s:!])(text|float|clear)-(left|right)\\b|(^|[\\s:!])(border|rounded)-[lr]\\b";
const physicalMessage =
  "Use logical Tailwind classes (ms-/me-, ps-/pe-, start-/end-, text-start/end, rounded-s/e, border-s/e), not left/right ones.";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        { selector: `Literal[value=/${physicalTailwind}/]`, message: physicalMessage },
        { selector: `TemplateElement[value.raw=/${physicalTailwind}/]`, message: physicalMessage },
      ],
      // Read configuration through the validated `env` from "@/lib/env".
      "no-restricted-properties": [
        "error",
        { object: "process", property: "env", message: 'Import { env } from "@/lib/env" instead.' },
      ],
    },
  },
  {
    files: ["src/lib/env.ts", "src/lib/env-schema.ts"],
    rules: { "no-restricted-properties": "off" },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
