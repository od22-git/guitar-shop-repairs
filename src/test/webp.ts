import { expect } from "vitest";

/** Pixel size from a WebP file header (lossy VP8, lossless VP8L or extended VP8X). */
export function webpSize(file: Buffer): { width: number; height: number } {
  expect(file.toString("ascii", 0, 4)).toBe("RIFF");
  expect(file.toString("ascii", 8, 12)).toBe("WEBP");
  const chunk = file.toString("ascii", 12, 16);
  if (chunk === "VP8X") {
    return { width: file.readUIntLE(24, 3) + 1, height: file.readUIntLE(27, 3) + 1 };
  }
  if (chunk === "VP8L") {
    const bits = file.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  expect(chunk).toBe("VP8 ");
  return { width: file.readUInt16LE(26) & 0x3fff, height: file.readUInt16LE(28) & 0x3fff };
}
