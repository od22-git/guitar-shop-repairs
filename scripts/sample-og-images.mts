import { readFile, writeFile } from "node:fs/promises";

import { samplePhotos, standInPhotos } from "../src/lib/db/seed";
import { makeOgImage } from "../src/lib/og-image";

// Writes the link-preview JPEG for each sample and stand-in photo, from its largest stored
// width. Run after adding one: `pnpm tsx scripts/sample-og-images.mts`.
const folders = [
  ["samples", Object.keys(samplePhotos)],
  ["stand-ins", Object.keys(standInPhotos)],
] as const;

for (const [folder, names] of folders) {
  const dir = new URL(`../public/images/${folder}/`, import.meta.url);
  for (const name of names) {
    const photo = await readFile(new URL(`${name}-1920.webp`, dir));
    await writeFile(new URL(`${name}-og.jpg`, dir), await makeOgImage(photo));
    console.log(`${folder}/${name}-og.jpg`);
  }
}
