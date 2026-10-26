import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { createFsStorage } from "./fs";
import { createR2Storage } from "./r2";
import { assertKey, contentTypeOf } from "./types";

describe("storage keys", () => {
  it.each(["products/12/k3x9-640.webp", "products/12/k3x9-og.jpg", "repairs/r-0001/a1"])(
    "accepts %s",
    (key) => expect(() => assertKey(key)).not.toThrow(),
  );

  it.each(["", "/etc/passwd", "../secret", "products/../x", "products//x", "Products/A", "a\\b"])(
    "rejects %j",
    (key) => expect(() => assertKey(key)).toThrow("Invalid storage key"),
  );

  it("knows the photo content types", () => {
    expect(contentTypeOf("a/b-640.webp")).toBe("image/webp");
    expect(contentTypeOf("a/b-og.jpg")).toBe("image/jpeg");
  });
});

describe("fs storage", () => {
  let root: string;
  beforeAll(async () => {
    root = await mkdtemp(path.join(tmpdir(), "storage-"));
  });
  afterAll(() => rm(root, { recursive: true, force: true }));

  it("stores, reads and deletes, keeping buckets apart", async () => {
    const storage = createFsStorage(root);
    await storage.put("public", "products/1/a-640.webp", Buffer.from("photo"), "image/webp");
    expect((await storage.get("public", "products/1/a-640.webp"))?.toString()).toBe("photo");
    expect(await storage.get("private", "products/1/a-640.webp")).toBeNull();

    await storage.delete("public", ["products/1/a-640.webp", "products/1/missing.webp"]);
    expect(await storage.get("public", "products/1/a-640.webp")).toBeNull();
  });

  it("refuses keys that would leave its folder", async () => {
    const storage = createFsStorage(root);
    await expect(storage.get("public", "../../etc/passwd")).rejects.toThrow("Invalid storage key");
  });
});

describe("R2 storage", () => {
  const fetchMock = vi.fn<typeof fetch>();
  beforeAll(() => vi.stubGlobal("fetch", fetchMock));
  afterAll(() => vi.unstubAllGlobals());
  afterEach(() => fetchMock.mockReset());

  const storage = createR2Storage({
    accountId: "acc",
    accessKeyId: "AKID",
    secretAccessKey: "secret",
    buckets: { public: "photos", private: "private-files" },
  });

  it("sends signed requests to the bucket's S3 endpoint", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    await storage.put("public", "products/1/a-640.webp", Buffer.from("x"), "image/webp");

    const request = fetchMock.mock.calls[0][0] as Request;
    expect(request.method).toBe("PUT");
    expect(request.url).toBe("https://acc.r2.cloudflarestorage.com/photos/products/1/a-640.webp");
    expect(request.headers.get("authorization")).toMatch(/^AWS4-HMAC-SHA256 Credential=AKID\//);
    expect(request.headers.get("content-type")).toBe("image/webp");
  });

  it("uses the private bucket for private files and treats 404 as missing", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 404 }));
    expect(await storage.get("private", "repairs/1/a")).toBeNull();
    expect((fetchMock.mock.calls[0][0] as Request).url).toContain("/private-files/repairs/1/a");
  });

  it("throws on other errors", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 403, statusText: "Forbidden" }));
    await expect(storage.put("public", "a/b", Buffer.from("x"), "image/webp")).rejects.toThrow(
      "R2 PUT failed: 403",
    );
  });
});
