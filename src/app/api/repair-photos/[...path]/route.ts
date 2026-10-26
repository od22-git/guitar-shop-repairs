import { getAdmin } from "@/lib/auth";
import { isRepairPhotoFile } from "@/lib/repairs/photos";
import { storage } from "@/lib/storage";

// Repair photos for the admin, from the private bucket. Customers see the ones marked
// visible through short-lived signed URLs instead (M6). Like all of /api, the response
// is never cached (next.config.ts).
export async function GET(
  request: Request,
  { params }: RouteContext<"/api/repair-photos/[...path]">,
) {
  if (!(await getAdmin(request.headers))) return new Response("Unauthorized", { status: 401 });
  const key = (await params).path.join("/");
  if (!isRepairPhotoFile(key)) return new Response("Not found", { status: 404 });

  const file = await storage.get("private", key);
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(file), {
    headers: { "content-type": "image/webp", "x-content-type-options": "nosniff" },
  });
}
