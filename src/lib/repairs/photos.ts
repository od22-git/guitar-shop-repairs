import { randomBytes } from "node:crypto";

import { eq } from "drizzle-orm";

import type { Database } from "../db/connect";
import { repairPhotos, repairTickets, type RepairPhoto, type RepairPhotoStage } from "../db/schema";
import { photoFileKeys, processPhoto } from "../images";
import type { Storage } from "../storage/types";

import { RepairError } from "./errors";

// Photos of a customer's instrument: at intake (the record if there's a damage dispute),
// during the work and when it's done. They go in the private bucket, cleaned like product
// photos (no EXIF/GPS). The admin sees them through /api/repair-photos; the customer
// sees the ones marked visible through short-lived signed URLs (M6).

const noPreview = { preview: false } as const;

export async function addRepairPhoto(
  db: Database,
  storage: Storage,
  ticketId: number,
  stage: RepairPhotoStage,
  upload: Buffer,
): Promise<RepairPhoto> {
  const [ticket] = await db
    .select({ id: repairTickets.id })
    .from(repairTickets)
    .where(eq(repairTickets.id, ticketId));
  if (!ticket) throw new RepairError("not_found");

  const photo = await processPhoto(upload, noPreview);
  const key = `repairs/${ticketId}/${randomBytes(10).toString("hex")}`;
  await Promise.all(
    photo.files.map((file) =>
      storage.put("private", `${key}${file.suffix}`, file.body, file.contentType),
    ),
  );
  try {
    const [row] = await db
      .insert(repairPhotos)
      .values({ ticketId, key, width: photo.width, height: photo.height, stage })
      .returning();
    return row;
  } catch (error) {
    await storage.delete("private", photoFileKeys(key, noPreview));
    throw error;
  }
}

export async function setRepairPhotoVisible(
  db: Database,
  photoId: number,
  customerVisible: boolean,
): Promise<number> {
  const [row] = await db
    .update(repairPhotos)
    .set({ customerVisible })
    .where(eq(repairPhotos.id, photoId))
    .returning({ ticketId: repairPhotos.ticketId });
  if (!row) throw new RepairError("not_found");
  return row.ticketId;
}

export async function deleteRepairPhoto(
  db: Database,
  storage: Storage,
  photoId: number,
): Promise<number> {
  const [row] = await db
    .delete(repairPhotos)
    .where(eq(repairPhotos.id, photoId))
    .returning({ ticketId: repairPhotos.ticketId, key: repairPhotos.key });
  if (!row) throw new RepairError("not_found");
  await storage.delete("private", photoFileKeys(row.key, noPreview));
  return row.ticketId;
}

/** A stored file of a repair photo, by its storage path, e.g. "repairs/3/ab12-640.webp". */
export const isRepairPhotoFile = (key: string) =>
  /^repairs\/\d+\/[a-f0-9]{20}-\d+\.webp$/.test(key);
