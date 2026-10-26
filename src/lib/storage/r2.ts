import { AwsClient } from "aws4fetch";

import { assertKey, type Bucket, type Storage } from "./types";

export type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  buckets: Record<Bucket, string>;
};

/** Cloudflare R2 through its S3 API, with signed requests (no AWS SDK). */
export function createR2Storage(config: R2Config): Storage {
  const client = new AwsClient({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    service: "s3",
    region: "auto",
  });
  const endpoint = `https://${config.accountId}.r2.cloudflarestorage.com`;
  const urlOf = (bucket: Bucket, key: string) => {
    assertKey(key);
    return `${endpoint}/${config.buckets[bucket]}/${key}`;
  };

  async function send(url: string, init: RequestInit, allow404 = false) {
    const response = await client.fetch(url, init);
    if (response.ok || (allow404 && response.status === 404)) return response;
    throw new Error(`R2 ${init.method ?? "GET"} failed: ${response.status} ${response.statusText}`);
  }

  return {
    async put(bucket, key, body, contentType) {
      await send(urlOf(bucket, key), {
        method: "PUT",
        body: new Uint8Array(body),
        headers: {
          "content-type": contentType,
          // Keys are never reused, so a stored file never changes.
          "cache-control": "public, max-age=31536000, immutable",
        },
      });
    },
    async get(bucket, key) {
      const response = await send(urlOf(bucket, key), { method: "GET" }, true);
      return response.status === 404 ? null : Buffer.from(await response.arrayBuffer());
    },
    async delete(bucket, keys) {
      await Promise.all(keys.map((key) => send(urlOf(bucket, key), { method: "DELETE" }, true)));
    },
  };
}
