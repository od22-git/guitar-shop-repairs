import { readFile, writeFile } from "node:fs/promises";

import { samplePhotos } from "../src/lib/db/seed";
import { makeOgImage } from "../src/lib/og-image";

// Writes the link-preview JPEG for each sample photo, from its largest stored width.
// Run after adding a sample photo: `pnpm tsx scripts/sample-og-images.mts`.
const dir = new URL("../public/images/samples/", import.meta.url);

for (const name of Object.keys(samplePhotos)) {
  const photo = await readFile(new URL(`${name}-1920.webp`, dir));
  await writeFile(new URL(`${name}-og.jpg`, dir), await makeOgImage(photo));
  console.log(`${name}-og.jpg`);
}
