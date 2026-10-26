import { randomBytes } from "node:crypto";

import { stockPhotoWidths } from "../../config/stock-photos";
import { photoFileKeys, processPhoto } from "../images";
import { safeEqual, sign } from "../signing";
import type { Storage } from "../storage/types";

// Photos sent with the /sell form. Each one is uploaded on its own as soon as it's picked
// (src/app/api/upload/sell), cleaned like every photo (no EXIF/GPS) and kept in the
// private bucket under inbox-pending/. The browser gets back a signed token naming it;
// submitting the form claims the photos by their tokens, which moves them to inbox/,
// where only the admin can see them (src/app/api/inbox-photos). Photos picked but never
// sent stay under inbox-pending/, for a bucket lifecycle rule to delete (M9).

export const MAX_SELL_PHOTOS = 8;

const PENDING = "inbox-pending";
const CLAIMED = "inbox";
const noPreview = { preview: false } as const;
const idPattern = /^[a-f0-9]{20}$/;

const signature = (secret: string, id: string) => sign(secret, "sell-photo", id);

/** Cleans and stores one uploaded photo; returns the token the form sends back. */
export async function storePendingSellPhoto(
  storage: Storage,
  secret: string,
  upload: Buffer,
): Promise<string> {
  const photo = await processPhoto(upload, noPreview);
  const id = randomBytes(10).toString("hex");
  await Promise.all(
    photo.files.map((file) =>
      storage.put("private", `${PENDING}/${id}${file.suffix}`, file.body, file.contentType),
    ),
  );
  return `${id}.${signature(secret, id)}`;
}

/** The photo a token names, if this server signed it. */
export function sellPhotoId(secret: string, token: string): string | null {
  const [id, signed, ...rest] = token.split(".");
  if (rest.length > 0 || !id || !signed || !idPattern.test(id)) return null;
  return safeEqual(signed, signature(secret, id)) ? id : null;
}

/**
 * Moves the photos named by `tokens` to the inbox and returns their keys, in order. Null
 * if any token is forged, repeated or already used, or its files are gone, in which case
 * nothing is moved.
 */
export async function claimSellPhotos(
  storage: Storage,
  secret: string,
  tokens: readonly string[],
): Promise<string[] | null> {
  const ids = tokens.map((token) => sellPhotoId(secret, token));
  if (ids.length > MAX_SELL_PHOTOS || new Set(ids).size !== ids.length) return null;
  if (ids.some((id) => id === null)) return null;

  const files = await Promise.all(
    (ids as string[]).flatMap((id) =>
      stockPhotoWidths.map(async (width) => {
        const suffix = `${id}-${width}.webp`;
        return { suffix, body: await storage.get("private", `${PENDING}/${suffix}`) };
      }),
    ),
  );
  if (files.some((file) => file.body === null)) return null;

  await Promise.all(
    files.map((file) =>
      storage.put("private", `${CLAIMED}/${file.suffix}`, file.body as Buffer, "image/webp"),
    ),
  );
  await storage.delete(
    "private",
    files.map((file) => `${PENDING}/${file.suffix}`),
  );
  return (ids as string[]).map((id) => `${CLAIMED}/${id}`);
}

/** Deletes claimed photos, e.g. when saving the submission failed. */
export async function deleteSellPhotos(storage: Storage, keys: readonly string[]): Promise<void> {
  await storage.delete(
    "private",
    keys.flatMap((key) => photoFileKeys(key, noPreview)),
  );
}

/** A stored file of a claimed sell photo, e.g. "inbox/ab12…-640.webp". */
export const isInboxPhotoFile = (key: string) => /^inbox\/[a-f0-9]{20}-\d+\.webp$/.test(key);
