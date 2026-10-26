import { revalidateTag } from "next/cache";

import { addProductPhoto } from "@/lib/admin/photos";
import { ProductError } from "@/lib/admin/products";
import { getAdmin } from "@/lib/auth";
import { CATALOG_TAG } from "@/lib/catalog";
import { db } from "@/lib/db/client";
import { repairPhotoStage, type RepairPhotoStage } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { ImageError, MAX_UPLOAD_BYTES } from "@/lib/images";
import { RepairError } from "@/lib/repairs/errors";
import { addRepairPhoto } from "@/lib/repairs/photos";
import { storage } from "@/lib/storage";

// Photo uploads from the admin (photo-upload.tsx): product photos (`productId`, public
// bucket) and repair photos (`ticketId` and `stage`, private bucket). The photo is
// re-encoded, without its EXIF/GPS data, before anything is stored (src/lib/images.ts).

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
  const file = form?.get("file");
  if (!form || !(file instanceof File)) return error(400, "bad_request");
  const id = (name: string) => {
    const value = Number(form.get(name));
    return Number.isSafeInteger(value) && value >= 1 ? value : null;
  };
  const productId = id("productId");
  const ticketId = id("ticketId");
  const stage = form.get("stage");
  const isStage = (value: unknown): value is RepairPhotoStage =>
    typeof value === "string" && (repairPhotoStage.enumValues as readonly string[]).includes(value);

  try {
    const upload = Buffer.from(await file.arrayBuffer());
    if (productId) {
      const photo = await addProductPhoto(db, storage, productId, upload);
      // Listed products show the new photo at once; drafts aren't cached anyway.
      revalidateTag(CATALOG_TAG, { expire: 0 });
      return Response.json({ id: photo.id }, { status: 201 });
    }
    if (ticketId && isStage(stage)) {
      const photo = await addRepairPhoto(db, storage, ticketId, stage, upload);
      return Response.json({ id: photo.id }, { status: 201 });
    }
    return error(400, "bad_request");
  } catch (cause) {
    if (cause instanceof ImageError)
      return error(cause.problem === "too_large" ? 413 : 422, cause.problem);
    if (cause instanceof ProductError || cause instanceof RepairError) {
      return error(404, cause.problem);
    }
    throw cause;
  }
}
