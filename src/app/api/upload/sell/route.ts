import { db } from "@/lib/db/client";
import { env } from "@/lib/env";
import { ImageError, MAX_UPLOAD_BYTES } from "@/lib/images";
import { storePendingSellPhoto } from "@/lib/inbox/sell-photos";
import { hitRateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { hashIp } from "@/lib/signing";
import { storage } from "@/lib/storage";

// Photos for the public /sell form, one per request, as soon as the visitor picks them.
// Public, so: only from this site's own pages, at most PHOTOS_PER_HOUR from one IP
// address, and every photo is re-encoded without its EXIF/GPS data (src/lib/images.ts)
// into the private bucket. The response is a signed token the form sends back; nothing
// reaches the inbox until the form itself passes its checks (Turnstile included).

const PHOTOS_PER_HOUR = 30;

const error = (status: number, code: string) => Response.json({ error: code }, { status });

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(env.SITE_URL).origin) {
    return error(403, "cross_origin");
  }
  if (Number(request.headers.get("content-length") ?? 0) > MAX_UPLOAD_BYTES + 64 * 1024) {
    return error(413, "too_large");
  }
  const ip = clientIp(request.headers);
  const who = ip ? hashIp(env.BETTER_AUTH_SECRET, ip) : "unknown";
  if (!(await hitRateLimit(db, `sell-photo:${who}`, PHOTOS_PER_HOUR, 60 * 60))) {
    return error(429, "rate_limited");
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return error(400, "bad_request");
  try {
    const token = await storePendingSellPhoto(
      storage,
      env.BETTER_AUTH_SECRET,
      Buffer.from(await file.arrayBuffer()),
    );
    return Response.json({ token }, { status: 201 });
  } catch (cause) {
    if (cause instanceof ImageError) {
      return error(cause.problem === "too_large" ? 413 : 422, cause.problem);
    }
    throw cause;
  }
}
