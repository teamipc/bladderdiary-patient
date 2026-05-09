#!/usr/bin/env node
/**
 * Reads per-spec findings JSONs from `test-results/walkthrough/findings/`
 * and updates the project memory file at:
 *
 *   ~/.claude/projects/-Users-zhen-bladderdiary-patient/memory/walkthrough_findings.md
 *
 * Inputs:
 *   - {en,fr,es,pt,zh,ar}.json — from walkthrough.spec.ts (cross-locale)
 *   - deep-flow.json — from deep-flow.spec.ts (en, real-form deep flow)
 *   - a11y.json — from a11y.spec.ts (axe-core scans, all 6 locales)
 *
 * Writes:
 *   - "Last 7 runs" — replaced with at most 7 entries (newest first)
 *   - "Open issues" — appended (deduplicated by `[LOCALE] [PHASE] description`)
 *   - Frontmatter + "How updates to this file work" preserved verbatim
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { homedir } from 'node:os';

const FINDINGS_FILE = resolve(
  homedir(),
  '.claude/projects/-Users-zhen-bladderdiary-patient/memory/walkthrough_findings.md',
);

const FINDINGS_DIR = resolve(process.cwd(), 'test-results/walkthrough/findings');

const LOCALES = ['en', 'fr', 'es', 'pt', 'zh', 'ar'];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function loadJson(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function loadResults() {
  if (!existsSync(FINDINGS_DIR)) return { walkthrough: [], deepFlow: null, a11y: null };
  const files = readdirSync(FINDINGS_DIR).filter((f) => f.endsWith('.json'));
  const walkthrough = files
    .filter((f) => LOCALES.includes(f.replace(/\.json$/, '')))
    .map((f) => loadJson(resolve(FINDINGS_DIR, f)))
    .filter(Boolean);
  const deepFlow = files.includes('deep-flow.json')
    ? loadJson(resolve(FINDINGS_DIR, 'deep-flow.json'))
    : null;
  const a11y = files.includes('a11y.json')
    ? loadJson(resolve(FINDINGS_DIR, 'a11y.json'))
    : null;
  return { walkthrough, deepFlow, a11y };
}

function buildRunBlock({ walkthrough, deepFlow, a11y }, runtimeMin) {
  const date = todayIso();
  const byLocale = new Map(walkthrough.map((r) => [r.locale, r]));

  const rows = LOCALES.map((loc) => {
    const r = byLocale.get(loc);
    if (!r) {
      return `| ${loc.padEnd(6)} | SKIPPED    | SKIPPED  | SKIPPED | SKIPPED | not run |`;
    }
    const issuesCol =
      r.issues.length === 0
        ? 'none'
        : [...new Set(r.issues.map((i) => i.phase))].join(', ');
    return `| ${loc.padEnd(6)} | ${r.phases.onboarding.status.padEnd(10)} | ${r.phases.diaryDay1.status.padEnd(8)} | ${r.phases.summary.status.padEnd(7)} | ${r.phases.pdf.status.padEnd(3)} | ${issuesCol} |`;
  }).join('\n');

  // Deep flow row — single result, presented separately.
  let deepFlowLine = '';
  if (deepFlow) {
    const phases = Object.entries(deepFlow.phases)
      .map(([k, v]) => `${k}=${v.status}`)
      .join(' · ');
    deepFlowLine = `\n\n**Deep flow (en, real-form):** ${phases}. ${deepFlow.issues.length} issue(s).`;
  } else {
    deepFlowLine = `\n\n**Deep flow (en, real-form):** not run.`;
  }

  // A11y line — count of high/med/low violations
  let a11yLine = '';
  if (a11y) {
    const counts = { high: 0, med: 0, low: 0 };
    for (const i of a11y.issues) {
      if (i.severity in counts) counts[i.severity]++;
    }
    a11yLine = `\n\n**A11y (axe-core, 6 locales):** ${counts.high} high · ${counts.med} med · ${counts.low} low violations.`;
  } else {
    a11yLine = `\n\n**A11y (axe-core, 6 locales):** not run.`;
  }

  return `### ${date}

| Locale | Onboarding | Days 1-3 | Summary | PDF | Issues |
|--------|------------|----------|---------|-----|--------|
${rows}${deepFlowLine}${a11yLine}

Runtime: ${runtimeMin} min. Coverage: cross-locale walkthrough · deep medical flow (en) · axe-core scan (all locales).`;
}

function buildSkippedBlock(reason) {
  return `### ${todayIso()} — skipped: ${reason}`;
}

function updateLastRunsSection(md, newRunBlock) {
  const startMarker = '## Last 7 runs';
  const endMarker = '## Resolved issues';
  const startIdx = md.indexOf(startMarker);
  const endIdx = md.indexOf(endMarker);
  if (startIdx === -1 || endIdx === -1) {
    throw new Error('Could not locate Last 7 runs / Resolved issues sections');
  }

  const before = md.slice(0, startIdx);
  const after = md.slice(endIdx);
  const existing = md.slice(startIdx + startMarker.length, endIdx).trim();

  const runs = [];
  let buf = [];
  for (const line of existing.split('\n')) {
    if (/^### \d{4}-\d{2}-\d{2}/.test(line)) {
      if (buf.length) runs.push(buf.join('\n').trim());
      buf = [line];
    } else if (buf.length) {
      buf.push(line);
    }
  }
  if (buf.length) runs.push(buf.join('\n').trim());

  const today = todayIso();
  const filtered = runs.filter((r) => !r.startsWith(`### ${today}`));
  const next = [newRunBlock, ...filtered].slice(0, 7);

  return `${before}${startMarker}\n\n${next.join('\n\n')}\n\n${after}`;
}

function appendOpenIssues(md, allIssues) {
  const startMarker = '## Open issues';
  const endMarker = '## Last 7 runs';
  const startIdx = md.indexOf(startMarker);
  const endIdx = md.indexOf(endMarker);
  if (startIdx === -1 || endIdx === -1) {
    throw new Error('Could not locate Open issues / Last 7 runs sections');
  }

  const before = md.slice(0, startIdx + startMarker.length);
  const existing = md.slice(startIdx + startMarker.length, endIdx).trim();
  const after = md.slice(endIdx);

  const today = todayIso();
  const newLines = [];
  for (const { tag, phase, severity, description } of allIssues) {
    const line = `- [${today}] [${tag}] [${phase}] ${description} (severity: ${severity})`;
    const dedupKey = `[${tag}] [${phase}] ${description}`;
    if (!existing.includes(dedupKey)) newLines.push(line);
  }

  // Strip any "no issues" placeholders so they don't accumulate alongside
  // real findings.
  const placeholderPatterns = [
    /^_\(none yet — first run pending\)_$/m,
    /^_\(none currently\)_$/m,
  ];
  let cleanedExisting = existing;
  for (const pat of placeholderPatterns) {
    cleanedExisting = cleanedExisting.replace(pat, '').trim();
  }

  let body;
  if (newLines.length === 0 && !cleanedExisting) {
    body = '\n\n_(none currently)_\n\n';
  } else if (newLines.length === 0) {
    body = `\n\n${cleanedExisting}\n\n`;
  } else if (!cleanedExisting) {
    body = `\n\n${newLines.join('\n')}\n\n`;
  } else {
    body = `\n\n${cleanedExisting}\n${newLines.join('\n')}\n\n`;
  }

  return `${before}${body}${after}`;
}

function flatIssues({ walkthrough, deepFlow, a11y }) {
  const out = [];
  for (const r of walkthrough) {
    for (const i of r.issues) {
      out.push({ tag: r.locale, phase: i.phase, severity: i.severity, description: i.description });
    }
  }
  if (deepFlow) {
    for (const i of deepFlow.issues) {
      out.push({ tag: 'deep-flow', phase: i.phase, severity: i.severity, description: i.description });
    }
  }
  if (a11y) {
    for (const i of a11y.issues) {
      // a11y phase already encodes locale: "a11y/<locale>/<page>"
      out.push({ tag: 'a11y', phase: i.phase, severity: i.severity, description: i.description });
    }
  }
  return out;
}

function main() {
  const mode = process.argv[2] ?? 'normal';
  const skipReason = process.argv.slice(3).join(' ') || 'unknown';

  if (!existsSync(FINDINGS_FILE)) {
    console.error(`Findings file not found: ${FINDINGS_FILE}`);
    process.exit(1);
  }

  let md = readFileSync(FINDINGS_FILE, 'utf8');

  if (mode === 'skip') {
    md = updateLastRunsSection(md, buildSkippedBlock(skipReason));
    writeFileSync(FINDINGS_FILE, md);
    console.log(`Wrote skip entry: ${skipReason}`);
    return;
  }

  const all = loadResults();
  if (all.walkthrough.length === 0 && !all.deepFlow && !all.a11y) {
    md = updateLastRunsSection(md, buildSkippedBlock('no per-spec results found'));
    writeFileSync(FINDINGS_FILE, md);
    console.error('No per-spec results — wrote skip entry');
    process.exit(2);
  }

  // Compute runtime
  const allTimings = [
    ...all.walkthrough.flatMap((r) => [r.startedAt, r.finishedAt]),
    ...(all.deepFlow ? [all.deepFlow.startedAt, all.deepFlow.finishedAt] : []),
    ...(all.a11y ? [all.a11y.startedAt, all.a11y.finishedAt] : []),
  ]
    .map((t) => new Date(t).getTime())
    .filter((n) => !isNaN(n));
  const runtimeMin =
    allTimings.length > 1
      ? Math.max(1, Math.round((Math.max(...allTimings) - Math.min(...allTimings)) / 60_000))
      : 0;

  md = updateLastRunsSection(md, buildRunBlock(all, runtimeMin));
  md = appendOpenIssues(md, flatIssues(all));
  writeFileSync(FINDINGS_FILE, md);

  const totalIssues =
    all.walkthrough.reduce((s, r) => s + r.issues.length, 0) +
    (all.deepFlow?.issues.length ?? 0) +
    (all.a11y?.issues.length ?? 0);
  console.log(
    `Updated findings.md — ${totalIssues} total issue(s) [walkthrough=${all.walkthrough.reduce(
      (s, r) => s + r.issues.length,
      0,
    )}, deep-flow=${all.deepFlow?.issues.length ?? 0}, a11y=${all.a11y?.issues.length ?? 0}].`,
  );
}

main();
