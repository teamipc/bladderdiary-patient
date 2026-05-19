// Post-build step: copy out/en.html -> out/index.html.
//
// Why this exists: Next.js 16 + next-intl with localePrefix: 'as-needed'
// emits out/en.html for the EN locale homepage, but emits a separate
// out/index.html from src/app/page.tsx which is just a JS-only LocaleRedirect
// shell (no <title>, no body content). Googlebot reads soft content at
// https://myflowcheck.com/.
//
// Documented in:
//   - .planning/audits/2026-05-18-comprehensive-audit/SEO-REVIEW.md T-2
//   - .planning/phases/12-seo-config-technical/12-CONTEXT.md SEO-M3-02
//
// Strategy: overwrite out/index.html with a byte-for-byte copy of out/en.html
// after `next build` completes. The canonical inside the copy already points
// to https://myflowcheck.com/en, so Google consolidates apex into /en signal
// without a Vercel routing change.
//
// Wired in package.json: "build": "next build && node scripts/post-build-copy-en-root.mjs"
//
// Idempotent. Re-running on an unchanged out/ produces identical output.

import fs from 'node:fs';
import path from 'node:path';

const OUT_DIR = path.resolve(process.cwd(), 'out');
const SOURCE = path.join(OUT_DIR, 'en.html');
const DEST = path.join(OUT_DIR, 'index.html');
const MIN_BYTES = 50_000; // sanity floor; out/en.html is ~80KB

if (!fs.existsSync(SOURCE)) {
  console.error(
    `[post-build-copy-en-root] FAIL: ${SOURCE} does not exist. Did next build complete?`,
  );
  process.exit(1);
}

const sourceStat = fs.statSync(SOURCE);
if (sourceStat.size < MIN_BYTES) {
  console.error(
    `[post-build-copy-en-root] FAIL: ${SOURCE} is ${sourceStat.size} bytes, ` +
      `below the ${MIN_BYTES}-byte sanity floor. The EN landing page is suspiciously small. ` +
      `Refusing to copy a broken build over out/index.html.`,
  );
  process.exit(1);
}

fs.cpSync(SOURCE, DEST);
const destStat = fs.statSync(DEST);
console.log(
  `[post-build-copy-en-root] OK: copied out/en.html (${sourceStat.size} bytes) -> ` +
    `out/index.html (${destStat.size} bytes). Bare-root SEO content restored.`,
);
