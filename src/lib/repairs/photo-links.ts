import { safeEqual, sign } from "../signing";

// Short-lived signed links to the repair photos a customer may see (those marked
// visible), served from the private bucket by /api/ticket-photos. A link names one file
// and stops working after PHOTO_LINK_MINUTES; the route also checks that the photo is
// still marked visible.

export const PHOTO_LINK_MINUTES = 30;

/** A signed link to one stored file, e.g. "repairs/3/ab12…-640.webp". */
export function signedPhotoUrl(secret: string, file: string, now = new Date()): string {
  const expires = Math.floor(now.getTime() / 1000) + PHOTO_LINK_MINUTES * 60;
  const signature = sign(secret, "repair-photo", `${file}.${expires}`);
  return `/api/ticket-photos/${file}?e=${expires}&s=${signature}`;
}

/** Whether a link's expiry and signature are valid for `file` now. */
export function isValidPhotoLink(
  secret: string,
  file: string,
  expires: string | null,
  signature: string | null,
  now = new Date(),
): boolean {
  if (!expires || !signature || !/^\d+$/.test(expires)) return false;
  if (Number(expires) * 1000 <= now.getTime()) return false;
  return safeEqual(signature, sign(secret, "repair-photo", `${file}.${expires}`));
}
