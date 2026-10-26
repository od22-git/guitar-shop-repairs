import { revalidateTag } from "next/cache";

import { addProductPhoto } from "@/lib/admin/photos";
import { ProductError } from "@/lib/admin/products";
import { getAdmin } from "@/lib/auth";
import { CATALOG_TAG } from "@/lib/catalog";
import { db } from "@/lib/db/client";
import { env } from "@/lib/env";
import { ImageError, MAX_UPLOAD_BYTES } from "@/lib/images";
import { storage } from "@/lib/storage";

// Product photo uploads from the admin (photo-upload.tsx). The photo is re-encoded,
// without its EXIF/GPS data, before anything is stored (src/lib/images.ts).

const error = (status: number, code: string) => Response.json({ error: code }, { status });

export async function POST(request: Request) {
  // Only the admin's own pages may post here.
  if (request.headers.get("origin") !== new URL(env.SITE_URL).origin) {
    return error(403, "cross_origin");
  }
  if (!(await getAdmin(request.headers))) return error(401, "unauthorized");
  if (Number(request.headers.get("content-length") ?? 0) > MAX_UPLOAD_BYTES + 64 * 1024) {
    return error(413, "too_large");
  }

  const form = await request.formData().catch(() => null);
  const productId = Number(form?.get("productId"));
  const file = form?.get("file");
  if (!Number.isSafeInteger(productId) || productId < 1 || !(file instanceof File)) {
    return error(400, "bad_request");
  }

  try {
    const photo = await addProductPhoto(
      db,
      storage,
      productId,
      Buffer.from(await file.arrayBuffer()),
    );
    // Listed products show the new photo at once; drafts aren't cached anyway.
    revalidateTag(CATALOG_TAG, { expire: 0 });
    return Response.json({ id: photo.id }, { status: 201 });
  } catch (cause) {
    if (cause instanceof ImageError)
      return error(cause.problem === "too_large" ? 413 : 422, cause.problem);
    if (cause instanceof ProductError) return error(404, cause.problem);
    throw cause;
  }
}
