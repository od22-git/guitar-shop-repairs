import { getAdmin } from "@/lib/auth";
import { isInboxPhotoFile } from "@/lib/inbox/sell-photos";
import { storage } from "@/lib/storage";

// Photos sent with the /sell form, for the admin only, from the private bucket. Like all
// of /api, the response is never cached (next.config.ts).
export async function GET(
  request: Request,
  { params }: RouteContext<"/api/inbox-photos/[...path]">,
) {
  if (!(await getAdmin(request.headers))) return new Response("Unauthorized", { status: 401 });
  const key = (await params).path.join("/");
  if (!isInboxPhotoFile(key)) return new Response("Not found", { status: 404 });

  const file = await storage.get("private", key);
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(file), {
    headers: { "content-type": "image/webp", "x-content-type-options": "nosniff" },
  });
}
