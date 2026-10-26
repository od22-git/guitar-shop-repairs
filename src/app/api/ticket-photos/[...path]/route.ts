import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { repairPhotos } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { isValidPhotoLink } from "@/lib/repairs/photo-links";
import { isRepairPhotoFile } from "@/lib/repairs/photos";
import { storage } from "@/lib/storage";

// Repair photos for customers, from the private bucket, through the short-lived signed
// links on their tracking page (src/lib/repairs/photo-links.ts). Only photos still
// marked visible are served. Like all of /api, never cached (next.config.ts).
export async function GET(
  request: Request,
  { params }: RouteContext<"/api/ticket-photos/[...path]">,
) {
  const file = (await params).path.join("/");
  const url = new URL(request.url);
  if (
    !isRepairPhotoFile(file) ||
    !isValidPhotoLink(
      env.BETTER_AUTH_SECRET,
      file,
      url.searchParams.get("e"),
      url.searchParams.get("s"),
    )
  ) {
    return new Response("Not found", { status: 404 });
  }

  const key = file.replace(/-\d+\.webp$/, "");
  const [photo] = await db
    .select({ id: repairPhotos.id })
    .from(repairPhotos)
    .where(and(eq(repairPhotos.key, key), eq(repairPhotos.customerVisible, true)));
  const body = photo ? await storage.get("private", file) : null;
  if (!body) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(body), {
    headers: { "content-type": "image/webp", "x-content-type-options": "nosniff" },
  });
}
