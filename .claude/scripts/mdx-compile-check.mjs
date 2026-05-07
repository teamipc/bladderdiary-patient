#!/usr/bin/env node
// Compiles every staged .mdx file with @mdx-js/mdx and fails the commit
// if any of them have syntax errors. Catches the failure shape that
// silently broke production on 2026-05-07: JSX comments inside lists
// that next build only surfaces at prerender time, after merge.

import { compile } from '@mdx-js/mdx';
import { readFileSync } from 'fs';
import matter from 'gray-matter';
import { execSync } from 'child_process';

const staged = execSync('git diff --cached --name-only --diff-filter=ACM', {
  encoding: 'utf8',
})
  .split('\n')
  .filter((f) => f.endsWith('.mdx'));

if (staged.length === 0) process.exit(0);

let failed = false;
for (const f of staged) {
  try {
    const raw = readFileSync(f, 'utf8');
    const { content } = matter(raw);
    await compile(content);
  } catch (e) {
    failed = true;
    const firstLine = (e.message || '').split('\n')[0];
    console.error(`[mdx-check] ${f}: ${firstLine}`);
    if (e.line) console.error(`  at line ${e.line}, column ${e.column}`);
  }
}

process.exit(failed ? 1 : 0);
