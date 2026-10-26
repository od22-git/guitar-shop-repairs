"use client";

import { useRef, useState } from "react";

import { useRouter } from "next/navigation";

import { secondaryButton } from "../../../_components/form";

// The browser half of the photo pipeline: each photo is scaled down to at most 2400 px
// and saved as a JPEG of about 1 MB before upload, so big phone photos upload quickly.
// Redrawing it also drops its EXIF/GPS data, which the server removes again anyway
// (src/lib/images.ts). iPhones turn HEIC into JPEG when a page asks for JPEG.

const MAX_SIDE = 2400;
const MAX_BYTES = 2 * 1024 * 1024;

async function shrink(file: File): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file; // Not decodable here: let the server decide.
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = new OffscreenCanvas(
    Math.round(bitmap.width * scale),
    Math.round(bitmap.height * scale),
  );
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  for (const quality of [0.86, 0.75, 0.6]) {
    const blob = await canvas.convertToBlob({ type: "image/jpeg", quality });
    if (blob.size <= MAX_BYTES) return blob;
  }
  return canvas.convertToBlob({ type: "image/jpeg", quality: 0.5 });
}

const problems: Record<string, string> = {
  unsupported_format: "isn't a JPEG, PNG or WebP photo",
  not_an_image: "isn't a photo the server can read",
  too_large: "is too large",
};

export function PhotoUpload({ productId }: { productId: number }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function upload(files: FileList) {
    setBusy(true);
    const failed: string[] = [];
    let done = 0;
    for (const file of Array.from(files)) {
      setStatus(`Uploading ${done + 1} of ${files.length}…`);
      const body = new FormData();
      body.set("productId", String(productId));
      body.set("file", await shrink(file), file.name);
      const response = await fetch("/api/upload", { method: "POST", body }).catch(() => null);
      if (response?.ok) {
        done += 1;
      } else {
        const code = response
          ? ((await response.json().catch(() => ({}))) as { error?: string }).error
          : null;
        failed.push(
          `${file.name} ${problems[code ?? ""] ?? "didn't upload (check the connection)"}.`,
        );
      }
    }
    setBusy(false);
    setStatus(
      [done > 0 && `Added ${done === 1 ? "1 photo" : `${done} photos`}.`, ...failed]
        .filter(Boolean)
        .join(" "),
    );
    if (input.current) input.current.value = "";
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="photo-files" className={`${secondaryButton} cursor-pointer self-start`}>
        {busy ? "Uploading…" : "Add photos"}
      </label>
      <input
        ref={input}
        id="photo-files"
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        disabled={busy}
        className="sr-only"
        onChange={(event) => event.target.files?.length && upload(event.target.files)}
      />
      <p role="status" className="text-ink-muted">
        {status}
      </p>
    </div>
  );
}
