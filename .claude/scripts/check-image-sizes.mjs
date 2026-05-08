#!/usr/bin/env node
// Hero image size guardrail.
//
// Flags any hero image (`*-hero.jpg`) over the threshold from content/README.md.
// Static export means Next.js cannot optimize images at request time — sources
// must be pre-compressed. Run via `npm run check:images` or as part of CI.
//
// To fix oversized images: re-encode at JPEG q80 with mozjpeg, e.g.
//   node -e "require('sharp')(<path>).jpeg({quality:80,progressive:true,mozjpeg:true}).toFile(<tmp>).then(()=>require('fs').renameSync(<tmp>,<path>))"

import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'public';
const THRESHOLD_KB = 400;

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.isFile()) yield full;
  }
}

const issues = [];
for (const file of walk(ROOT)) {
  if (!file.endsWith('-hero.jpg')) continue;
  const sizeKb = Math.round(statSync(file).size / 1024);
  if (sizeKb > THRESHOLD_KB) {
    issues.push({ file, sizeKb });
  }
}

if (issues.length === 0) {
  console.log(`All hero images under ${THRESHOLD_KB} KB.`);
  process.exit(0);
}

console.error(`${issues.length} hero image(s) over ${THRESHOLD_KB} KB:`);
for (const { file, sizeKb } of issues) {
  console.error(`  ${sizeKb} KB  ${file}`);
}
console.error('\nRecompress with sharp at JPEG q80 mozjpeg (see script header for command).');
process.exit(1);
