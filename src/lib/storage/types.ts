// Where uploaded files live. Product photos go in the public bucket, served at /media
// (src/app/media and the rewrite in next.config.ts). Customers' photos (repairs, the
// sell form) go in the private bucket and are only shown through short-lived signed
// URLs (M6).

export type Bucket = "public" | "private";

export interface Storage {
  put(bucket: Bucket, key: string, body: Buffer, contentType: string): Promise<void>;
  /** The file, or null if there's none. */
  get(bucket: Bucket, key: string): Promise<Buffer | null>;
  /** Removes the files; missing ones are ignored. */
  delete(bucket: Bucket, keys: readonly string[]): Promise<void>;
}

/** Keys are lower-case paths like "products/12/k3x9-640.webp": no "..", no leading "/". */
const keyPattern = /^[a-z0-9][a-z0-9_-]*(\/[a-z0-9][a-z0-9_.-]*)*$/;

export function assertKey(key: string): void {
  if (!keyPattern.test(key) || key.includes("..")) {
    throw new Error(`Invalid storage key: ${JSON.stringify(key)}`);
  }
}

const contentTypes: Record<string, string> = {
  webp: "image/webp",
  jpg: "image/jpeg",
  png: "image/png",
};

export function contentTypeOf(key: string): string {
  return contentTypes[key.split(".").pop() ?? ""] ?? "application/octet-stream";
}
