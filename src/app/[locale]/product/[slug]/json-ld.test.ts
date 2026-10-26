import { describe, expect, it } from "vitest";

import { publicProduct } from "@/test/catalog";

import { productJsonLd } from "./json-ld";

const page = {
  name: "Strat",
  description: null,
  url: "https://shop.example/en/product/strat",
  siteUrl: "https://shop.example",
};

describe("productJsonLd", () => {
  it("describes the offer with its price in AED and its availability", () => {
    const data = JSON.parse(
      productJsonLd(
        publicProduct({
          sku: "G-001",
          brand: "Fender",
          priceFils: 345_050,
          images: [
            {
              src: "/images/samples/strat",
              ogSrc: "/images/samples/strat-og.jpg",
              width: 1920,
              height: 2400,
              altEn: null,
              altAr: null,
            },
          ],
        }),
        page,
      ),
    );
    expect(data).toMatchObject({
      "@type": "Product",
      name: "Strat",
      sku: "G-001",
      brand: { "@type": "Brand", name: "Fender" },
      itemCondition: "https://schema.org/UsedCondition",
      offers: {
        price: "3450.50",
        priceCurrency: "AED",
        availability: "https://schema.org/InStock",
        url: page.url,
      },
    });
    expect(data.image).toEqual(["https://shop.example/images/samples/strat-1920.webp"]);
    expect(data).not.toHaveProperty("description");
  });

  it("marks holds as reserved, sold items as sold out, and ungraded gear as new", () => {
    const offer = (overrides: Parameters<typeof publicProduct>[0]) =>
      JSON.parse(productJsonLd(publicProduct(overrides), page));
    expect(offer({ status: "reserved" }).offers.availability).toBe("https://schema.org/Reserved");
    expect(offer({ status: "sold" }).offers.availability).toBe("https://schema.org/SoldOut");
    expect(offer({ condition: null }).itemCondition).toBe("https://schema.org/NewCondition");
  });

  it("can't be broken out of its script element", () => {
    const text = productJsonLd(publicProduct(), { ...page, name: "</script><script>alert(1)" });
    expect(text).not.toContain("<");
    expect(JSON.parse(text).name).toBe("</script><script>alert(1)");
  });
});
