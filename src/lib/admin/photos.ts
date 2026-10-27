import { randomBytes } from "node:crypto";

import { and, asc, eq, max } from "drizzle-orm";

import type { Database } from "../db/connect";
import { productImages, products, type ProductImage } from "../db/schema";
import { photoFileKeys, processPhoto } from "../images";
import { isBundledPhoto } from "../product-images";
import type { Storage } from "../storage/types";

import { ProductError } from "./products";

// A product's photos: added through the upload route (src/app/api/upload), ordered,
// captioned and removed in the admin. Each photo is stored in the public bucket under
// a random key, one file per width plus a link preview. Callers revalidate the catalog.

export type PhotoProblem = "not_found" | "last_photo";

export class PhotoError extends Error {
  override name = "PhotoError";
  constructor(readonly problem: PhotoProblem) {
    super(problem);
  }
}

/** Random, unguessable and never reused, so stored files can be cached forever. */
function newKey(productId: number): string {
  return `products/${productId}/${randomBytes(10).toString("hex")}`;
}

/** Cleans and stores an uploaded photo (see src/lib/images.ts), last in the gallery. */
export async function addProductPhoto(
  db: Database,
  storage: Storage,
  productId: number,
  upload: Buffer,
): Promise<ProductImage> {
  const [product] = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.id, productId));
  if (!product) throw new ProductError("not_found");

  const photo = await processPhoto(upload);
  const key = newKey(productId);
  await Promise.all(
    photo.files.map((file) =>
      storage.put("public", `${key}${file.suffix}`, file.body, file.contentType),
    ),
  );

  try {
    const [{ last }] = await db
      .select({ last: max(productImages.sort) })
      .from(productImages)
      .where(eq(productImages.productId, productId));
    const [row] = await db
      .insert(productImages)
      .values({
        productId,
        key,
        width: photo.width,
        height: photo.height,
        sort: (last ?? -1) + 1,
      })
      .returning();
    return row;
  } catch (error) {
    await storage.delete("public", photoFileKeys(key));
    throw error;
  }
}

async function getPhoto(db: Database, imageId: number) {
  const [row] = await db
    .select({ image: productImages, status: products.status })
    .from(productImages)
    .innerJoin(products, eq(products.id, productImages.productId))
    .where(eq(productImages.id, imageId));
  if (!row) throw new PhotoError("not_found");
  return row;
}

/** Removes a photo. A listed product keeps at least one. Returns its product id. */
export async function deleteProductPhoto(
  db: Database,
  storage: Storage,
  imageId: number,
): Promise<number> {
  const { image, status } = await getPhoto(db, imageId);
  if (status === "available" || status === "reserved" || status === "sold") {
    const siblings = await db
      .select({ id: productImages.id })
      .from(productImages)
      .where(eq(productImages.productId, image.productId));
    if (siblings.length <= 1) throw new PhotoError("last_photo");
  }
  await db.delete(productImages).where(eq(productImages.id, imageId));
  if (!isBundledPhoto(image.key)) await storage.delete("public", photoFileKeys(image.key));
  return image.productId;
}

/** Moves a photo one place earlier (-1) or later (+1); the first is the main photo. */
export async function moveProductPhoto(
  db: Database,
  imageId: number,
  direction: -1 | 1,
): Promise<number> {
  const { image } = await getPhoto(db, imageId);
  await db.transaction(async (tx) => {
    const ordered = await tx
      .select({ id: productImages.id })
      .from(productImages)
      .where(eq(productImages.productId, image.productId))
      .orderBy(asc(productImages.sort), asc(productImages.id));
    const ids = ordered.map((row) => row.id);
    const from = ids.indexOf(imageId);
    const to = from + direction;
    if (to < 0 || to >= ids.length) return;
    [ids[from], ids[to]] = [ids[to], ids[from]];
    // Renumber all of them, which also tidies gaps left by deleted photos.
    for (const [sort, id] of ids.entries()) {
      await tx
        .update(productImages)
        .set({ sort })
        .where(and(eq(productImages.id, id), eq(productImages.productId, image.productId)));
    }
  });
  return image.productId;
}

/** Sets a photo's description for screen readers, in each language. */
export async function updatePhotoAlt(
  db: Database,
  imageId: number,
  alt: { altEn: string | null; altAr: string | null },
): Promise<number> {
  const { image } = await getPhoto(db, imageId);
  await db.update(productImages).set(alt).where(eq(productImages.id, imageId));
  return image.productId;
}
