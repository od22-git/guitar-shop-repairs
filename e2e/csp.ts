import type { Page } from "@playwright/test";

// Collects the Content-Security-Policy violations a page reports, so a test can show the
// policy (src/lib/security-headers.ts) blocks nothing the site itself needs.

declare global {
  interface Window {
    __cspViolations?: string[];
  }
}

/** Call before the first goto: records every violation on the pages that follow. */
export async function watchCsp(page: Page) {
  await page.addInitScript(() => {
    window.__cspViolations = [];
    document.addEventListener("securitypolicyviolation", (event) => {
      window.__cspViolations?.push(
        `${event.effectiveDirective} blocked ${event.blockedURI || "inline"} (${event.sourceFile}:${event.lineNumber})`,
      );
    });
  });
}

/** The violations reported on the current page so far. */
export const cspViolations = (page: Page) => page.evaluate(() => window.__cspViolations ?? []);
