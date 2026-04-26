import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const svgPath = path.join(root, 'src/app/icon.svg');
const svg = fs.readFileSync(svgPath);

const sizes = [192, 512];
for (const size of sizes) {
  const out = path.join(root, `public/icon-${size}.png`);
  await sharp(svg, { density: 384 })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(out);
  console.log(`wrote ${out}`);
}
