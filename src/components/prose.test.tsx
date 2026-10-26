import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Prose } from "./prose";

describe("Prose", () => {
  it("makes paragraphs from blank-line blocks and lists from dash lines", () => {
    const html = renderToStaticMarkup(
      <Prose text={"First line\ncontinues.\n\n- one\n- two\n\nLast."} />,
    );
    expect(html).toContain("<p>First line continues.</p>");
    expect(html).toContain("<li>one</li><li>two</li>");
    expect(html).toContain("<p>Last.</p>");
  });

  it("keeps a paragraph that only starts with a dash line as a paragraph", () => {
    const html = renderToStaticMarkup(<Prose text={"- not a list\nbecause of this"} />);
    expect(html).toContain("<p>- not a list because of this</p>");
  });
});
