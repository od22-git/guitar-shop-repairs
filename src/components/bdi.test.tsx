import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Bdi, Ltr } from "./bdi";

describe("bidi helpers", () => {
  it("Bdi isolates without forcing a direction", () => {
    expect(renderToStaticMarkup(<Bdi>Fender</Bdi>)).toBe("<bdi>Fender</bdi>");
  });

  it("Ltr forces dir=ltr for numbers and codes", () => {
    const markup = renderToStaticMarkup(<Ltr>+971 50 123 4567</Ltr>);
    expect(markup).toMatch(/^<bdi dir="ltr">/);
    expect(markup).toContain("+971 50 123 4567");
  });
});
