import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { assertKey, type Bucket, type Storage } from "./types";

/** Files in a local folder, one subfolder per bucket. For development and tests. */
export function createFsStorage(root: string): Storage {
  const fileOf = (bucket: Bucket, key: string) => {
    assertKey(key);
    return path.join(root, bucket, ...key.split("/"));
  };

  return {
    async put(bucket, key, body) {
      const file = fileOf(bucket, key);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, body);
    },
    async get(bucket, key) {
      try {
        return await readFile(fileOf(bucket, key));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw error;
      }
    },
    async delete(bucket, keys) {
      await Promise.all(keys.map((key) => rm(fileOf(bucket, key), { force: true })));
    },
  };
}
