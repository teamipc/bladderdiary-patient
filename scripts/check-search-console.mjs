#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Search Console Indexing Report — standalone Node script
 *
 * Not part of the app bundle. Uses the `googleapis` Node SDK to OAuth into
 * the developer's Google account and fetch indexing status for every URL in
 * the live sitemap. Output is JSON to stdout (or a human-readable summary
 * with `--pretty`). Refresh token cached locally so re-runs don't require
 * the consent flow each time.
 *
 * ─── One-time Google Cloud Console setup ─────────────────────────────────
 * 1. Open https://console.cloud.google.com/ and create (or pick) a project.
 * 2. APIs & Services → Library → search for "Search Console API" → Enable.
 * 3. APIs & Services → Credentials → Create credentials → OAuth client ID
 *    - Application type: Desktop app (simpler than Web app for CLI tools)
 *    - Name: "MyFlowCheck SC Local CLI" (or whatever)
 *    - Click Create.
 *    - DOWNLOAD the JSON. Save it as:
 *        scripts/.gcp-oauth-credentials.json
 * 4. (Only if you used "Web app" instead of "Desktop app":) also add
 *    `http://localhost:8765/oauth2callback` to Authorized redirect URIs.
 * 5. If your OAuth consent screen is in "Testing" mode, add your own Google
 *    email as a Test user (OAuth consent screen → Test users → ADD USERS).
 * 6. Run:        node scripts/check-search-console.mjs auth
 *    A browser tab opens, you consent, the script saves the refresh token
 *    to scripts/.gcp-token.json. After that, subsequent runs skip the
 *    consent flow.
 *
 * ─── Subcommands ─────────────────────────────────────────────────────────
 *   setup                       — Print the one-time GCP setup steps above
 *   auth                        — Run OAuth + cache the refresh token
 *   properties                  — List verified Search Console properties
 *   sitemaps [property]         — List submitted sitemaps for a property
 *   inspect <property> <url>    — URL-inspect one URL
 *   report [property] [--limit N] [--pretty]
 *                               — URL-inspect every URL in the live sitemap,
 *                                 aggregate by verdict + coverageState,
 *                                 dump JSON (or pretty summary).
 *
 * If `property` is omitted, defaults to `sc-domain:myflowcheck.com`
 * (the canonical property registered in Search Console).
 *
 * ─── Quota ───────────────────────────────────────────────────────────────
 * URL Inspection API: 2000 queries/day per property. Sitemap has ~216 URLs,
 * so one full report is ~10% of daily quota. Don't run it in a tight loop.
 *
 * ─── Files (all gitignored) ──────────────────────────────────────────────
 *   scripts/.gcp-oauth-credentials.json  — you provide (from GCP Console)
 *   scripts/.gcp-token.json              — script writes after consent
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import { exec } from 'node:child_process';
import { google } from 'googleapis';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CREDS_PATH = resolve(__dirname, '.gcp-oauth-credentials.json');
const TOKEN_PATH = resolve(__dirname, '.gcp-token.json');
const DEFAULT_PROPERTY = 'sc-domain:myflowcheck.com';
const SCOPES = ['https://www.googleapis.com/auth/webmasters.readonly'];
const SITEMAP_URL = 'https://myflowcheck.com/sitemap.xml';
const OAUTH_PORT = 8765;
const OAUTH_REDIRECT = `http://localhost:${OAUTH_PORT}/oauth2callback`;

// ─── Helpers ──────────────────────────────────────────────────────────────

function loadCredentials() {
  if (!existsSync(CREDS_PATH)) {
    console.error(`\nMissing ${CREDS_PATH}`);
    console.error(`Run \`node scripts/check-search-console.mjs setup\` for one-time setup steps.\n`);
    process.exit(1);
  }
  const raw = JSON.parse(readFileSync(CREDS_PATH, 'utf8'));
  // Desktop app credentials are nested under `installed`, web app under `web`.
  const creds = raw.installed || raw.web;
  if (!creds) {
    console.error(`\n${CREDS_PATH} is malformed — expected "installed" or "web" key.`);
    process.exit(1);
  }
  return creds;
}

function buildOAuthClient() {
  const { client_id, client_secret } = loadCredentials();
  return new google.auth.OAuth2(client_id, client_secret, OAUTH_REDIRECT);
}

function loadToken() {
  if (!existsSync(TOKEN_PATH)) return null;
  return JSON.parse(readFileSync(TOKEN_PATH, 'utf8'));
}

function saveToken(token) {
  writeFileSync(TOKEN_PATH, JSON.stringify(token, null, 2), { mode: 0o600 });
}

async function getAuthenticatedClient() {
  const client = buildOAuthClient();
  const token = loadToken();
  if (!token) {
    console.error('\nNo cached token. Run: node scripts/check-search-console.mjs auth\n');
    process.exit(1);
  }
  client.setCredentials(token);
  // Re-save if access_token rotated during request lifecycle
  client.on('tokens', (newTokens) => {
    const merged = { ...token, ...newTokens };
    saveToken(merged);
  });
  return client;
}

// ─── OAuth flow ───────────────────────────────────────────────────────────

async function runAuthFlow() {
  const client = buildOAuthClient();
  const authUrl = client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', // force refresh_token issuance
    scope: SCOPES,
  });

  console.log('\nOpening browser for consent...');
  console.log(`If the browser does not open, paste this URL manually:\n\n${authUrl}\n`);

  return new Promise((resolveFn, rejectFn) => {
    const server = http.createServer(async (req, res) => {
      try {
        const url = new URL(req.url, `http://localhost:${OAUTH_PORT}`);
        if (url.pathname !== '/oauth2callback') {
          res.writeHead(404).end('Not found');
          return;
        }
        const code = url.searchParams.get('code');
        if (!code) {
          res.writeHead(400).end('Missing code');
          return;
        }
        const { tokens } = await client.getToken(code);
        saveToken(tokens);
        res.writeHead(200, { 'Content-Type': 'text/html' }).end(
          '<!doctype html><html><body style="font-family: system-ui; padding: 2rem"><h1>Authorized ✓</h1><p>You can close this tab.</p></body></html>',
        );
        server.close();
        console.log(`\nToken saved to ${TOKEN_PATH}`);
        resolveFn();
      } catch (err) {
        res.writeHead(500).end(`Error: ${err.message}`);
        rejectFn(err);
      }
    });
    server.listen(OAUTH_PORT, () => {
      const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
      exec(`${opener} "${authUrl}"`);
    });
  });
}

// ─── Search Console API wrappers ──────────────────────────────────────────

async function listProperties(auth) {
  const sc = google.searchconsole({ version: 'v1', auth });
  const { data } = await sc.sites.list();
  return data.siteEntry || [];
}

async function listSitemaps(auth, property) {
  const sc = google.searchconsole({ version: 'v1', auth });
  const { data } = await sc.sitemaps.list({ siteUrl: property });
  return data.sitemap || [];
}

async function inspectUrl(auth, property, url) {
  const sc = google.searchconsole({ version: 'v1', auth });
  const { data } = await sc.urlInspection.index.inspect({
    requestBody: { inspectionUrl: url, siteUrl: property },
  });
  return data.inspectionResult;
}

// ─── Sitemap parsing (no XML lib — small regex is fine for our shape) ─────

async function fetchSitemapUrls(sitemapUrl) {
  const res = await fetch(sitemapUrl);
  if (!res.ok) throw new Error(`Sitemap fetch failed: ${res.status}`);
  const xml = await res.text();
  const matches = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)];
  return matches.map((m) => m[1].trim());
}

// ─── Report command ───────────────────────────────────────────────────────

async function runReport({ property, limit, pretty }) {
  const auth = await getAuthenticatedClient();

  console.error(`Fetching sitemap from ${SITEMAP_URL}...`);
  let urls = await fetchSitemapUrls(SITEMAP_URL);
  console.error(`Sitemap has ${urls.length} URLs.`);
  if (limit && urls.length > limit) {
    urls = urls.slice(0, limit);
    console.error(`Limiting to first ${limit}.`);
  }

  const results = [];
  let processed = 0;
  for (const url of urls) {
    processed++;
    process.stderr.write(`\r[${processed}/${urls.length}] ${url.slice(0, 70)}${' '.repeat(20)}`);
    try {
      const inspection = await inspectUrl(auth, property, url);
      results.push({
        url,
        verdict: inspection?.indexStatusResult?.verdict ?? 'UNKNOWN',
        coverageState: inspection?.indexStatusResult?.coverageState ?? null,
        crawledAs: inspection?.indexStatusResult?.crawledAs ?? null,
        lastCrawlTime: inspection?.indexStatusResult?.lastCrawlTime ?? null,
        googleCanonical: inspection?.indexStatusResult?.googleCanonical ?? null,
        userCanonical: inspection?.indexStatusResult?.userCanonical ?? null,
        sitemap: inspection?.indexStatusResult?.sitemap ?? null,
        indexingState: inspection?.indexStatusResult?.indexingState ?? null,
        robotsTxtState: inspection?.indexStatusResult?.robotsTxtState ?? null,
        pageFetchState: inspection?.indexStatusResult?.pageFetchState ?? null,
      });
    } catch (err) {
      results.push({ url, error: err.message });
    }
  }
  process.stderr.write('\n');

  // Aggregate
  const byVerdict = {};
  const byCoverage = {};
  for (const r of results) {
    if (r.error) continue;
    byVerdict[r.verdict] = (byVerdict[r.verdict] || 0) + 1;
    if (r.coverageState) byCoverage[r.coverageState] = (byCoverage[r.coverageState] || 0) + 1;
  }

  const summary = {
    property,
    sitemap: SITEMAP_URL,
    totalUrls: results.length,
    errorCount: results.filter((r) => r.error).length,
    byVerdict,
    byCoverage,
    fetchedAt: new Date().toISOString(),
  };

  if (pretty) {
    console.log(`\n=== Search Console Report for ${property} ===`);
    console.log(`Sitemap URLs inspected: ${results.length}`);
    console.log(`API errors: ${summary.errorCount}\n`);

    console.log('Verdict breakdown:');
    for (const [k, v] of Object.entries(byVerdict).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${k.padEnd(20)} ${v}`);
    }
    console.log('\nCoverage state breakdown:');
    for (const [k, v] of Object.entries(byCoverage).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${k.padEnd(50)} ${v}`);
    }
    console.log('\nTop problematic URLs (verdict != PASS):');
    const problems = results.filter((r) => !r.error && r.verdict !== 'PASS');
    for (const r of problems.slice(0, 30)) {
      console.log(`  [${r.verdict}/${r.coverageState ?? '-'}] ${r.url}`);
    }
    if (problems.length > 30) {
      console.log(`  ... and ${problems.length - 30} more (see JSON output for full list)`);
    }
    console.log(`\nFull JSON: ${TOKEN_PATH.replace('token', 'last-report')}`);
  } else {
    console.log(JSON.stringify({ summary, results }, null, 2));
  }

  // Also write a stable JSON file so a follow-up can read it without re-running.
  const reportPath = resolve(__dirname, '.gcp-last-report.json');
  writeFileSync(reportPath, JSON.stringify({ summary, results }, null, 2));
  console.error(`\nReport written to ${reportPath}`);
}

// ─── CLI dispatch ─────────────────────────────────────────────────────────

const SETUP_TEXT = `
One-time Google Cloud Console setup:

1. https://console.cloud.google.com/ → create or pick a project.
2. APIs & Services → Library → "Search Console API" → Enable.
3. APIs & Services → Credentials → Create credentials → OAuth client ID
     - Application type: Desktop app
     - Name: "MyFlowCheck SC Local CLI"
     - Click Create → DOWNLOAD JSON.
4. Save the downloaded JSON as:
     scripts/.gcp-oauth-credentials.json
5. If consent screen is in Testing mode: OAuth consent screen → Test users → ADD USERS → your email.
6. Run: node scripts/check-search-console.mjs auth

After auth completes, run: node scripts/check-search-console.mjs report --pretty
`;

async function main() {
  const [cmd, ...args] = process.argv.slice(2);
  switch (cmd) {
    case 'setup':
    case '--help':
    case '-h':
    case undefined:
      console.log(SETUP_TEXT);
      return;
    case 'auth':
      await runAuthFlow();
      return;
    case 'properties': {
      const auth = await getAuthenticatedClient();
      const props = await listProperties(auth);
      console.log(JSON.stringify(props, null, 2));
      return;
    }
    case 'sitemaps': {
      const auth = await getAuthenticatedClient();
      const property = args[0] || DEFAULT_PROPERTY;
      const sm = await listSitemaps(auth, property);
      console.log(JSON.stringify(sm, null, 2));
      return;
    }
    case 'inspect': {
      const property = args[0];
      const url = args[1];
      if (!property || !url) {
        console.error('Usage: inspect <property> <url>');
        process.exit(1);
      }
      const auth = await getAuthenticatedClient();
      const result = await inspectUrl(auth, property, url);
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    case 'report': {
      const positional = args.filter((a) => !a.startsWith('--'));
      const property = positional[0] || DEFAULT_PROPERTY;
      const limit = args.includes('--limit') ? Number(args[args.indexOf('--limit') + 1]) : null;
      const pretty = args.includes('--pretty');
      await runReport({ property, limit, pretty });
      return;
    }
    default:
      console.error(`Unknown command: ${cmd}`);
      console.error('Run with no args (or `setup`) to see usage.');
      process.exit(1);
  }
}

main().catch((err) => {
  console.error('\nFatal error:', err.message);
  if (err.response?.data) {
    console.error('API response:', JSON.stringify(err.response.data, null, 2));
  }
  process.exit(1);
});
