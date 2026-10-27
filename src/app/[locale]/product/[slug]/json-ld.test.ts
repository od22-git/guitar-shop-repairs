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

describe("productJsonLd with variants", () => {
  const variant = (id: number, nameEn: string, priceFils: number) => ({
    id,
    nameEn,
    nameAr: null,
    priceFils,
    compareAtFils: null,
    customToneSlots: 0,
    includesPack: false,
    featured: false,
  });

  it("gives an AggregateOffer from the lowest to the highest bundle, one availability for all", () => {
    const product = publicProduct({
      kind: "device",
      condition: null,
      status: "available",
      priceFils: 20_000,
      variants: [
        variant(1, "Device only", 20_000),
        variant(2, "Starter Bundle", 29_900),
        variant(3, "Custom Tone Bundle", 34_900),
      ],
    });
    const data = JSON.parse(
      productJsonLd(product, { ...page, variantNames: new Map([[2, "باقة البداية"]]) }),
    );
    expect(data.offers).toMatchObject({
      "@type": "AggregateOffer",
      lowPrice: "200.00",
      highPrice: "349.00",
      offerCount: 3,
      priceCurrency: "AED",
      availability: "https://schema.org/InStock",
    });
    expect(
      data.offers.offers.map((o: { name: string; price: string; availability: string }) => [
        o.name,
        o.price,
        o.availability,
      ]),
    ).toEqual([
      ["Device only", "200.00", "https://schema.org/InStock"],
      ["باقة البداية", "299.00", "https://schema.org/InStock"],
      ["Custom Tone Bundle", "349.00", "https://schema.org/InStock"],
    ]);
    expect(data.itemCondition).toBe("https://schema.org/NewCondition");
  });

  it("marks every bundle sold out together", () => {
    const product = publicProduct({
      status: "sold",
      variants: [variant(1, "A", 100), variant(2, "B", 200)],
    });
    const data = JSON.parse(productJsonLd(product, page));
    expect(data.offers.availability).toBe("https://schema.org/SoldOut");
    for (const offer of data.offers.offers) {
      expect(offer.availability).toBe("https://schema.org/SoldOut");
    }
  });
});
