import "server-only";

import path from "node:path";

import { env } from "@/lib/env";

import { createFsStorage } from "./fs";
import { createR2Storage } from "./r2";
import type { Storage } from "./types";

export type { Bucket, Storage } from "./types";

function fromEnv(): Storage {
  if (env.STORAGE_DRIVER === "fs") {
    return createFsStorage(path.resolve(env.STORAGE_DIR ?? ".data/storage"));
  }
  // The env schema requires all of these when the driver is r2.
  const required = (value: string | undefined) => value ?? "";
  return createR2Storage({
    accountId: required(env.R2_ACCOUNT_ID),
    accessKeyId: required(env.R2_ACCESS_KEY_ID),
    secretAccessKey: required(env.R2_SECRET_ACCESS_KEY),
    buckets: { public: required(env.R2_PUBLIC_BUCKET), private: required(env.R2_PRIVATE_BUCKET) },
  });
}

/** The app's file storage, chosen by STORAGE_DRIVER. */
export const storage = fromEnv();
