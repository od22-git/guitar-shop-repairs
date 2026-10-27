"use client";

import { useRef, useState } from "react";

import { useRouter } from "next/navigation";

import { shrinkPhoto } from "@/lib/photo-shrink";

import { secondaryButton } from "./form";

// Product and repair photos, shrunk in the browser before upload (src/lib/photo-shrink.ts).

const problems: Record<string, string> = {
  unsupported_format: "isn't a JPEG, PNG or WebP photo",
  not_an_image: "isn't a photo the server can read",
  too_large: "is too large",
};

/** Uploads to /api/upload with `fields` (productId, or ticketId and stage). */
export function PhotoUpload({ fields }: { fields: Record<string, string> }) {
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
      for (const [name, value] of Object.entries(fields)) body.set(name, value);
      body.set("file", await shrinkPhoto(file), file.name);
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
      <p role="status" className="text-grey-600">
        {status}
      </p>
    </div>
  );
}
