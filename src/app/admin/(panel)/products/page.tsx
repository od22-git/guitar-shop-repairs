import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { asc, desc, eq, inArray } from "drizzle-orm";

import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { productImages, products, productStatus, type ProductStatus } from "@/lib/db/schema";
import { formatMoney } from "@/lib/money";
import { productImageSrc } from "@/lib/product-images";

import { statusLabels } from "./status";

export const metadata: Metadata = { title: "Products" };

const isStatus = (value: unknown): value is ProductStatus =>
  typeof value === "string" && (productStatus.enumValues as readonly string[]).includes(value);

export default async function ProductsPage({ searchParams }: PageProps<"/admin/products">) {
  await requireAdmin();
  const { status, deleted } = await searchParams;
  const filter = isStatus(status) ? status : null;

  const rows = await db
    .select()
    .from(products)
    .where(filter ? eq(products.status, filter) : undefined)
    .orderBy(desc(products.updatedAt), desc(products.id));
  const images =
    rows.length === 0
      ? []
      : await db
          .select()
          .from(productImages)
          .where(
            inArray(
              productImages.productId,
              rows.map((row) => row.id),
            ),
          )
          .orderBy(asc(productImages.sort), asc(productImages.id));
  const mainPhoto = new Map<number, (typeof images)[number]>();
  for (const image of images)
    if (!mainPhoto.has(image.productId)) mainPhoto.set(image.productId, image);

  const filters: { value: ProductStatus | null; label: string }[] = [
    { value: null, label: "All" },
    ...productStatus.enumValues.map((value) => ({ value, label: statusLabels[value] })),
  ];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Products</h1>
        <Link
          href="/admin/products/new"
          className="inline-flex min-h-11 items-center rounded-md bg-black px-5 font-semibold text-white hover:bg-grey-800"
        >
          Add a product
        </Link>
      </div>
      {deleted && <p role="status">Draft deleted.</p>}

      <nav aria-label="Filter by status">
        <ul className="flex flex-wrap gap-2">
          {filters.map(({ value, label }) => (
            <li key={label}>
              <Link
                href={value ? `/admin/products?status=${value}` : "/admin/products"}
                aria-current={filter === value ? "page" : undefined}
                className="inline-flex min-h-11 items-center rounded-full border border-grey-600 px-4 aria-[current=page]:border-black aria-[current=page]:bg-black aria-[current=page]:text-white"
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {rows.length === 0 ? (
        <p className="rounded-lg bg-white p-6">
          {filter
            ? `Nothing is ${statusLabels[filter].toLowerCase()}.`
            : "No products yet. Add the first one."}
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-grey-300 overflow-hidden rounded-lg bg-white">
          {rows.map((product) => {
            const photo = mainPhoto.get(product.id);
            return (
              <li key={product.id}>
                <Link
                  href={`/admin/products/${product.id}`}
                  className="flex items-center gap-4 p-3 hover:bg-white"
                >
                  <div className="size-16 shrink-0 overflow-hidden rounded-md bg-grey-100">
                    {photo && (
                      <Image
                        src={productImageSrc(photo.key)}
                        alt=""
                        width={64}
                        height={64}
                        sizes="64px"
                        className="size-16 object-cover"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{product.titleEn}</p>
                    <p className="text-sm text-grey-600">
                      <span dir="ltr">{product.sku}</span>
                      {product.kind !== "guitar" &&
                        product.kind !== "service_addon" &&
                        ` · ${product.quantity} in stock`}
                      {product.kind === "service_addon" && " · add-on"}
                      {product.placeholderPhotos && " · stand-in photos"}
                    </p>
                  </div>
                  <div className="text-end">
                    <p className="font-medium">{statusLabels[product.status]}</p>
                    <p className="text-sm text-grey-600 tabular-nums">
                      {product.priceFils === null
                        ? "No price"
                        : formatMoney(product.priceFils, "en")}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
