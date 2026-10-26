import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { asc, eq } from "drizzle-orm";

import { getProductRow, ProductError, publishProblems } from "@/lib/admin/products";
import { requireAdmin } from "@/lib/auth";
import { dubaiDateInputValueInDays, formatDate } from "@/lib/datetime";
import { db } from "@/lib/db/client";
import { productImages } from "@/lib/db/schema";
import { productImageSrc } from "@/lib/product-images";

import { updateProductAction } from "../actions";
import { productFormOptions, productFormValues } from "../form-options";
import { ProductForm } from "../product-form";
import { statusLabels } from "../status";

import { PhotosPanel } from "./photos-panel";
import { StatusPanel } from "./status-panel";

export const metadata: Metadata = { title: "Edit product" };

async function load(idParam: string) {
  const id = Number(idParam);
  if (!Number.isSafeInteger(id) || id < 1) notFound();
  try {
    return await getProductRow(db, id);
  } catch (error) {
    if (error instanceof ProductError) notFound();
    throw error;
  }
}

export default async function EditProductPage({
  params,
  searchParams,
}: PageProps<"/admin/products/[id]">) {
  await requireAdmin();
  const [{ id }, { created }] = await Promise.all([params, searchParams]);
  const product = await load(id);
  const [photos, options] = await Promise.all([
    db
      .select()
      .from(productImages)
      .where(eq(productImages.productId, product.id))
      .orderBy(asc(productImages.sort), asc(productImages.id)),
    productFormOptions(),
  ]);
  const listed = ["available", "reserved", "sold"].includes(product.status);

  return (
    <>
      <p>
        <Link href="/admin/products" className="underline underline-offset-4">
          Products
        </Link>
      </p>
      <div>
        <h1 className="text-2xl font-bold">{product.titleEn}</h1>
        <p className="text-ink-muted">
          {statusLabels[product.status]}
          {product.publishedAt && ` · published ${formatDate(product.publishedAt, "en")}`}
        </p>
        {listed && (
          <p className="mt-1 flex gap-4">
            <a
              href={`/en/product/${product.slug}`}
              target="_blank"
              className="underline underline-offset-4"
            >
              View in shop
            </a>
            <a
              href={`/ar/product/${product.slug}`}
              target="_blank"
              className="underline underline-offset-4"
            >
              Arabic page
            </a>
          </p>
        )}
      </div>
      {created && <p role="status">Draft created. Add photos, then publish it.</p>}

      <StatusPanel
        product={{
          id: product.id,
          kind: product.kind,
          status: product.status,
          quantity: product.quantity,
          everPublished: product.publishedAt !== null,
          reservedNote: product.reservedNote,
          reservedUntil: product.reservedUntil ? formatDate(product.reservedUntil, "en") : null,
          defaultHoldUntil: dubaiDateInputValueInDays(7),
        }}
        publishProblems={publishProblems(product, photos.length)}
      />

      <PhotosPanel
        productId={product.id}
        photos={photos.map((photo) => ({
          id: photo.id,
          src: productImageSrc(photo.key),
          width: photo.width,
          height: photo.height,
          altEn: photo.altEn ?? "",
          altAr: photo.altAr ?? "",
        }))}
      />

      <h2 className="text-xl font-bold">Details</h2>
      <ProductForm
        action={updateProductAction.bind(null, product.id)}
        options={options}
        values={productFormValues(product)}
        creating={false}
        slugLocked={product.publishedAt !== null}
      />
    </>
  );
}
