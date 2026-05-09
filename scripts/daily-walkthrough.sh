#!/bin/bash
# Daily Playwright walkthrough — runs the 6-locale e2e suite against
# https://myflowcheck.com and updates ~/.claude/projects/.../walkthrough_findings.md.
#
# Triggered by:
#   - launchd (~/Library/LaunchAgents/com.myflowcheck.daily-walkthrough.plist)
#   - or manually:  npm run e2e:walkthrough
#
# Idempotent: re-running on the same day overwrites that day's entry in the
# Last 7 runs block.

set -euo pipefail

REPO_DIR="/Users/zhen/bladderdiary-patient"
LOG_DIR="$REPO_DIR/test-results/walkthrough/logs"
mkdir -p "$LOG_DIR"

TODAY="$(date +%Y-%m-%d)"
LOG_FILE="$LOG_DIR/$TODAY.log"

cd "$REPO_DIR"

# Ensure node + npx are on PATH when launchd invokes this with a minimal env.
# Common locations: nvm, Homebrew, system. Add the user's shell-sourced PATH.
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$HOME/.nvm/versions/node/$(ls -1 "$HOME/.nvm/versions/node" 2>/dev/null | tail -1)/bin:$PATH"

{
  echo "=== Daily walkthrough run: $(date) ==="
  echo "Node: $(command -v node || echo MISSING)"
  echo "Node version: $(node --version 2>/dev/null || echo unknown)"
  echo

  # 1. Quick reachability check — if the site is down, write a skip entry and exit cleanly.
  if ! curl -fsS --max-time 15 -o /dev/null https://myflowcheck.com/en; then
    echo "Site unreachable — writing skip entry."
    node "$REPO_DIR/scripts/update-walkthrough-findings.mjs" skip "site unreachable"
    exit 0
  fi

  # 2. Clean prior per-locale findings so stale results don't bleed forward.
  rm -rf "$REPO_DIR/test-results/walkthrough/findings"
  mkdir -p "$REPO_DIR/test-results/walkthrough/findings"

  # 3. Run Playwright. Don't bail on non-zero (the spec is intentionally lenient
  #    so per-phase failures still produce JSON for the reporter).
  set +e
  npx playwright test --config=playwright.config.ts
  PW_EXIT=$?
  set -e
  echo "Playwright exit code: $PW_EXIT"

  # 4. Merge per-locale JSON into walkthrough_findings.md.
  node "$REPO_DIR/scripts/update-walkthrough-findings.mjs"

  echo "=== Done: $(date) ==="
} >> "$LOG_FILE" 2>&1

# Keep last 14 logs only.
ls -1t "$LOG_DIR"/*.log 2>/dev/null | tail -n +15 | xargs rm -f 2>/dev/null || true
