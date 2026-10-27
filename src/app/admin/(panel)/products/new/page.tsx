import type { Metadata } from "next";
import Link from "next/link";

import { requireAdmin } from "@/lib/auth";

import { createProductAction } from "../actions";
import { productFormOptions } from "../form-options";
import { ProductForm } from "../product-form";

export const metadata: Metadata = { title: "New product" };

export default async function NewProductPage() {
  await requireAdmin();
  const options = await productFormOptions();
  return (
    <>
      <p>
        <Link href="/admin/products" className="underline underline-offset-4">
          Products
        </Link>
      </p>
      <h1 className="text-2xl font-bold">New product</h1>
      <p className="text-grey-600">
        It starts as a draft. Add photos on the next screen, then publish it.
      </p>
      <ProductForm
        action={createProductAction}
        options={options}
        values={{ kind: "guitar", quantity: "1" }}
        creating
        slugLocked={false}
      />
    </>
  );
}
