import "server-only";

import { asc } from "drizzle-orm";
import { getTranslations } from "next-intl/server";

import { db } from "@/lib/db/client";
import { categories, productCondition, type Product } from "@/lib/db/schema";
import { filsToDecimalString } from "@/lib/money";
import { bodyStyles, pickupLayouts } from "@/lib/product-specs";
import { specFields } from "@/lib/admin/products";

import type { ProductFormOptions } from "./product-form";

/** Choices for the product form, labelled as the English shop labels them. */
export async function productFormOptions(): Promise<ProductFormOptions> {
  const [rows, condition, bodyStyle, pickupLayout] = await Promise.all([
    db.select().from(categories).orderBy(asc(categories.sort), asc(categories.id)),
    getTranslations({ locale: "en", namespace: "Condition" }),
    getTranslations({ locale: "en", namespace: "BodyStyle" }),
    getTranslations({ locale: "en", namespace: "PickupLayout" }),
  ]);
  return {
    categories: rows.map((c) => ({ id: c.id, name: c.nameEn })),
    conditions: productCondition.enumValues.map((value) => ({ value, label: condition(value) })),
    bodyStyles: bodyStyles.map((value) => ({ value, label: bodyStyle(value) })),
    pickupLayouts: pickupLayouts.map((value) => ({
      value,
      label: pickupLayout(value, { code: value }),
    })),
  };
}

/** A product as the form's string values. */
export function productFormValues(product: Product): Record<string, string> {
  const money = (fils: number | null) => (fils === null ? "" : filsToDecimalString(fils));
  const values: Record<string, string> = {
    kind: product.kind,
    categoryId: product.categoryId === null ? "" : String(product.categoryId),
    slug: product.slug,
    sku: product.sku,
    brand: product.brand ?? "",
    model: product.model ?? "",
    year: product.year === null ? "" : String(product.year),
    titleEn: product.titleEn,
    titleAr: product.titleAr ?? "",
    descriptionEn: product.descriptionEn ?? "",
    descriptionAr: product.descriptionAr ?? "",
    techNotesEn: product.techNotesEn ?? "",
    techNotesAr: product.techNotesAr ?? "",
    inTheBoxEn: product.inTheBoxEn ?? "",
    inTheBoxAr: product.inTheBoxAr ?? "",
    placeholderPhotos: String(product.placeholderPhotos),
    condition: product.condition ?? "",
    priceFils: money(product.priceFils),
    compareAtFils: money(product.compareAtFils),
    costFils: money(product.costFils),
  };
  for (const field of specFields) {
    const value = product.specs[field];
    values[`spec.${field}`] = value === undefined ? "" : String(value);
  }
  return values;
}
