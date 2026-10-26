// The browser half of the photo pipeline, for every upload (admin photos and the /sell
// form): each photo is scaled down to at most 2400 px and saved as a JPEG of about 1 MB
// before upload, so big phone photos upload quickly.
// Redrawing it also drops its EXIF/GPS data, which the server removes again anyway
// (src/lib/images.ts). iPhones turn HEIC into JPEG when a page asks for JPEG.

const MAX_SIDE = 2400;
const MAX_BYTES = 2 * 1024 * 1024;

/** The photo, shrunk for upload; the file itself if this browser can't decode it. */
export async function shrinkPhoto(file: File): Promise<Blob> {
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
