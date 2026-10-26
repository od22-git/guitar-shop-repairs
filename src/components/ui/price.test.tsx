import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { formatMoney } from "@/lib/money";

import { withPrefix } from "./price";

describe("withPrefix", () => {
  it("puts the sign before the currency in English", () => {
    // formatMoney puts a no-break space after "AED".
    expect(withPrefix(formatMoney(5_000, "en"), "+")).toBe("+AED\u00a050");
  });

  it("keeps the sign on the number, left to right, in Arabic", () => {
    const html = renderToStaticMarkup(<>{withPrefix(formatMoney(5_000, "ar"), "+")}</>);
    expect(html).toContain('<bdi dir="ltr">+50</bdi>');
    expect(html).toMatch(/<\/bdi>\sد\.إ\./);
  });

  it("leaves the amount alone without a prefix", () => {
    expect(withPrefix("AED 50", "")).toBe("AED 50");
  });
});
