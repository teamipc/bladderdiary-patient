import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import {
  mkdtempSync,
  writeFileSync,
  readFileSync,
  statSync,
  existsSync,
  rmSync,
  mkdirSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

// Exercises scripts/post-build-copy-en-root.mjs (SEO-M3-02). The script copies
// out/en.html -> out/index.html post-build so the bare apex serves substantive
// HTML instead of the JS-only LocaleRedirect shell. The script resolves the
// out/ directory relative to process.cwd(), so each test spawns `node` with
// cwd pointed at a freshly-created tmpdir that hosts a synthetic out/ fixture.
// Catches: silent failures, wrong-source copies, size-guard regressions, and
// the explicit JS-only-shell signature returning.

describe('post-build-copy-en-root script (SEO-M3-02)', () => {
  let workDir: string;
  let outDir: string;
  const scriptPath = path.resolve(process.cwd(), 'scripts/post-build-copy-en-root.mjs');

  beforeEach(() => {
    workDir = mkdtempSync(path.join(tmpdir(), 'mfc-seo-m3-02-'));
    outDir = path.join(workDir, 'out');
    mkdirSync(outDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(workDir, { recursive: true, force: true });
  });

  it('exits 0 and copies out/en.html to out/index.html when out/en.html is >= 50KB', () => {
    const padding = 'x'.repeat(60_000 - '<title>Fake EN Landing</title>'.length);
    const fakeEn = `<!DOCTYPE html><html><head>${padding}<title>Fake EN Landing</title></head></html>`;
    // Pad/truncate to exactly 60_000 bytes for a clean size assertion.
    const exact = fakeEn.padEnd(60_000, ' ').slice(0, 60_000);
    writeFileSync(path.join(outDir, 'en.html'), exact);

    const result = spawnSync('node', [scriptPath], { cwd: workDir, encoding: 'utf8' });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('OK: copied');
    expect(existsSync(path.join(outDir, 'index.html'))).toBe(true);
    expect(readFileSync(path.join(outDir, 'index.html'), 'utf8')).toBe(exact);
    expect(statSync(path.join(outDir, 'index.html')).size).toBe(60_000);
  });

  it('exits 1 and does NOT create out/index.html when out/en.html is missing', () => {
    // No en.html written.
    const result = spawnSync('node', [scriptPath], { cwd: workDir, encoding: 'utf8' });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('does not exist');
    expect(existsSync(path.join(outDir, 'index.html'))).toBe(false);
  });

  it('exits 1 when out/en.html is below the 50KB sanity floor', () => {
    // 7_330 bytes is the exact observed size of the broken JS-only shell.
    writeFileSync(path.join(outDir, 'en.html'), 'a'.repeat(7_330));

    const result = spawnSync('node', [scriptPath], { cwd: workDir, encoding: 'utf8' });

    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/sanity floor|suspiciously small/);
    expect(existsSync(path.join(outDir, 'index.html'))).toBe(false);
  });

  it('is idempotent: running twice produces the same output', () => {
    const content = 'A'.repeat(60_000);
    writeFileSync(path.join(outDir, 'en.html'), content);

    const first = spawnSync('node', [scriptPath], { cwd: workDir, encoding: 'utf8' });
    expect(first.status).toBe(0);
    const firstOutput = readFileSync(path.join(outDir, 'index.html'), 'utf8');

    const second = spawnSync('node', [scriptPath], { cwd: workDir, encoding: 'utf8' });
    expect(second.status).toBe(0);
    const secondOutput = readFileSync(path.join(outDir, 'index.html'), 'utf8');

    expect(firstOutput).toBe(secondOutput);
    expect(statSync(path.join(outDir, 'index.html')).size).toBe(60_000);
  });

  it('produces an index.html whose content is byte-identical to en.html', () => {
    const realisticHead =
      '<!DOCTYPE html><html lang="en"><head>' +
      '<title>My Flow Check | 3-Day Bladder Diary Tracker</title>' +
      '<link rel="canonical" href="https://myflowcheck.com/en"/>' +
      '</head><body><main><h1>Track your bladder in 3 days</h1></main></body></html>';
    const padding = '<!-- pad -->'.repeat(Math.ceil((60_000 - realisticHead.length) / 12));
    const content = (realisticHead + padding).slice(0, 60_000);
    writeFileSync(path.join(outDir, 'en.html'), content);

    const result = spawnSync('node', [scriptPath], { cwd: workDir, encoding: 'utf8' });
    expect(result.status).toBe(0);

    const enBuf = readFileSync(path.join(outDir, 'en.html'));
    const indexBuf = readFileSync(path.join(outDir, 'index.html'));
    expect(enBuf.equals(indexBuf)).toBe(true);
    expect(readFileSync(path.join(outDir, 'index.html'), 'utf8')).toContain('<title>');
  });

  it('regression: out/index.html is NOT the JS-only redirect shell after running', () => {
    // The broken state's signature is the noscript meta-refresh. Fake en.html
    // doesn't contain it, so post-copy index.html shouldn't either. Guards
    // against a future change that copies the wrong source file.
    const content =
      '<!DOCTYPE html><html><head><title>Substantive Content</title></head>' +
      '<body><main>'.padEnd(60_000 - '</main></body></html>'.length, '.') +
      '</main></body></html>';
    const exact = content.slice(0, 60_000);
    writeFileSync(path.join(outDir, 'en.html'), exact);

    const result = spawnSync('node', [scriptPath], { cwd: workDir, encoding: 'utf8' });
    expect(result.status).toBe(0);

    const indexHtml = readFileSync(path.join(outDir, 'index.html'), 'utf8');
    expect(indexHtml).not.toContain('<meta http-equiv="refresh" content="0;url=/en"/>');
  });
});
