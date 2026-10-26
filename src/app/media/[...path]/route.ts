import { notFound } from "next/navigation";

import { env } from "@/lib/env";
import { storage } from "@/lib/storage";
import { assertKey, contentTypeOf } from "@/lib/storage/types";

// Serves the public bucket when photos are stored in a local folder (STORAGE_DRIVER=fs).
// With R2, next.config.ts rewrites /media to the bucket's public URL before this runs.
export async function GET(_request: Request, { params }: RouteContext<"/media/[...path]">) {
  if (env.STORAGE_DRIVER !== "fs") notFound();
  const key = (await params).path.join("/");

  try {
    assertKey(key);
  } catch {
    notFound();
  }

  const file = await storage.get("public", key);
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(file), {
    headers: {
      "content-type": contentTypeOf(key),
      // Keys are never reused, so a stored file never changes.
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
    },
  });
}
