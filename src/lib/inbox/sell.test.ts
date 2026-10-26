import sharp from "sharp";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createPgliteDatabase, type TestDatabase } from "@/test/db";

import type { Database } from "../db/connect";
import type { Bucket, Storage } from "../storage/types";
import { inboxReplyUrl } from "../whatsapp/inbox-message";

import { createSellOffer, getSubmission, parseSellForm, sellOfferOf } from ".";
import {
  claimSellPhotos,
  isInboxPhotoFile,
  MAX_SELL_PHOTOS,
  sellPhotoId,
  storePendingSellPhoto,
} from "./sell-photos";

// Guitars offered on /sell (M7b): the form, its photos (uploaded first, claimed by
// signed token when the form is sent, private throughout) and the inbox item.

let test: TestDatabase;
let db: Database;

beforeAll(async () => {
  test = await createPgliteDatabase();
  db = test.db;
}, 30_000);
afterAll(() => test?.close());
beforeEach(() => test.reset());

const SECRET = "a-test-secret-that-is-long-enough-000";

/** Storage in memory, by bucket and key. */
function memoryStorage() {
  const files = new Map<string, Buffer>();
  const path = (bucket: Bucket, key: string) => `${bucket}:${key}`;
  const storage: Storage = {
    async put(bucket, key, body) {
      files.set(path(bucket, key), body);
    },
    async get(bucket, key) {
      return files.get(path(bucket, key)) ?? null;
    },
    async delete(bucket, keys) {
      for (const key of keys) files.delete(path(bucket, key));
    },
  };
  return { storage, files };
}

const form = (fields: Record<string, string>, photos: string[] = ["token"]) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  for (const photo of photos) data.append("photo", photo);
  return data;
};

const offer = {
  name: " Huda ",
  phone: "050 123 4567",
  brand: "Fender",
  model: "Stratocaster",
  year: "١٩٩٨",
  serial: "N8123456",
  condition: "very_good",
  askingPrice: "٢٬٥٠٠",
  description: "Original pickups, new frets in 2022. Hard case.",
  ownership: "on",
  whatsappConsent: "on",
};

/** A photo straight off a phone: with EXIF, including GPS coordinates. */
const phonePhoto = () =>
  sharp({ create: { width: 1600, height: 1200, channels: 3, background: "#7a4b2a" } })
    .jpeg()
    .withExif({ IFD3: { GPSLatitudeRef: "N", GPSLatitude: "25/1 47/1 0/1" } })
    .toBuffer();

describe("the sell form", () => {
  it("accepts an offer, with Arabic-Indic digits in the year and price", () => {
    const parsed = parseSellForm(form(offer, ["a", "b"]), MAX_SELL_PHOTOS);
    expect(parsed).toEqual({
      ok: true,
      data: {
        name: "Huda",
        phone: "+971501234567",
        photoTokens: ["a", "b"],
        brand: "Fender",
        model: "Stratocaster",
        year: 1998,
        serial: "N8123456",
        condition: "very_good",
        askingPriceFils: 250_000,
        description: "Original pickups, new frets in 2022. Hard case.",
      },
    });
  });

  it("needs a brand, a grade, a description, a photo and both ticks", () => {
    const parsed = parseSellForm(
      form({ name: "Huda", phone: "123", year: "98", askingPrice: "lots" }, []),
      MAX_SELL_PHOTOS,
    );
    expect(parsed).toEqual({
      ok: false,
      errors: {
        phone: "phone",
        brand: "required",
        year: "year",
        condition: "required",
        askingPrice: "amount",
        description: "required",
        ownership: "ownership",
        whatsappConsent: "consent",
        photos: "photos",
      },
    });
  });

  it("refuses more photos than allowed, and a year from the future", () => {
    const tokens = Array.from({ length: MAX_SELL_PHOTOS + 1 }, (_, i) => `t${i}`);
    const parsed = parseSellForm(
      form({ ...offer, year: String(new Date().getFullYear() + 2) }, tokens),
      MAX_SELL_PHOTOS,
    );
    expect(parsed.ok || parsed.errors).toEqual({ year: "year", photos: "photos" });
  });
});

describe("sell photos", () => {
  it("are stored cleaned and private, then claimed into the inbox by their tokens", async () => {
    const { storage, files } = memoryStorage();
    const token = await storePendingSellPhoto(storage, SECRET, await phonePhoto());
    const id = sellPhotoId(SECRET, token);
    expect(id).toMatch(/^[a-f0-9]{20}$/);
    expect([...files.keys()].sort()).toEqual([
      `private:inbox-pending/${id}-1280.webp`,
      `private:inbox-pending/${id}-1920.webp`,
      `private:inbox-pending/${id}-640.webp`,
    ]);
    // Re-encoded from pixels: no EXIF, so no GPS.
    const stored = await sharp(files.get(`private:inbox-pending/${id}-1920.webp`)).metadata();
    expect(stored.exif).toBeUndefined();

    const keys = await claimSellPhotos(storage, SECRET, [token]);
    expect(keys).toEqual([`inbox/${id}`]);
    expect([...files.keys()].every((key) => key.startsWith(`private:inbox/${id}-`))).toBe(true);
    expect(isInboxPhotoFile(`inbox/${id}-640.webp`)).toBe(true);
    expect(isInboxPhotoFile(`inbox-pending/${id}-640.webp`)).toBe(false);
    expect(isInboxPhotoFile(`inbox/../repairs/1/${id}-640.webp`)).toBe(false);

    // Each photo goes with one offer only.
    expect(await claimSellPhotos(storage, SECRET, [token])).toBeNull();
  });

  it("refuse forged, repeated or unknown tokens, and move nothing then", async () => {
    const { storage, files } = memoryStorage();
    const token = await storePendingSellPhoto(storage, SECRET, await phonePhoto());
    const id = sellPhotoId(SECRET, token) ?? "";
    expect(sellPhotoId("another-secret-that-is-long-enough-00", token)).toBeNull();
    expect(sellPhotoId(SECRET, `${"0".repeat(20)}.${token.split(".")[1]}`)).toBeNull();
    expect(sellPhotoId(SECRET, `${token}.x`)).toBeNull();

    expect(await claimSellPhotos(storage, SECRET, [token, token])).toBeNull();
    expect(await claimSellPhotos(storage, SECRET, [token, "forged.token"])).toBeNull();
    await storage.delete("private", [`inbox-pending/${id}-640.webp`]);
    expect(await claimSellPhotos(storage, SECRET, [token])).toBeNull();
    expect([...files.keys()].some((key) => key.startsWith("private:inbox/"))).toBe(false);
  });
});

describe("an offer in the inbox", () => {
  it("keeps the details and photos, and the reply names the guitar", async () => {
    const parsed = parseSellForm(form(offer), MAX_SELL_PHOTOS);
    if (!parsed.ok) throw new Error("invalid");
    const id = await createSellOffer(db, parsed.data, ["inbox/aaaaaaaaaaaaaaaaaaaa"], "ar");
    const item = await getSubmission(db, id);
    expect(item).toMatchObject({
      kind: "sell",
      name: "Huda",
      phoneE164: "+971501234567",
      locale: "ar",
      status: "new",
      photoKeys: ["inbox/aaaaaaaaaaaaaaaaaaaa"],
      payload: { ownershipConfirmed: true, whatsappConsent: true },
    });
    expect(item?.payload).not.toHaveProperty("photoTokens");
    expect(sellOfferOf(item!)).toEqual({
      brand: "Fender",
      model: "Stratocaster",
      year: 1998,
      serial: "N8123456",
      condition: "very_good",
      askingPriceFils: 250_000,
      description: "Original pickups, new frets in 2022. Hard case.",
    });

    const reply = new URL(inboxReplyUrl(item!, "Fender Stratocaster"));
    expect(reply.pathname).toBe("/971501234567");
    expect(reply.searchParams.get("text")).toMatch(
      /^مرحباً ⁨Huda⁩، شكراً لعرضك جيتار ⁨Fender Stratocaster⁩ على /,
    );
  });
});
