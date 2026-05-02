#!/usr/bin/env bash
# Article i18n completeness check.
#
# Forces every article under content/articles/en/**/*.mdx to have a sibling
# at content/articles/<locale>/<topic>/<slug>.mdx for every non-English
# locale declared in src/i18n/config.ts.
#
# Used as:
#   - pre-commit hook: blocks commits with missing translations
#   - Claude Code Stop hook: nudges the agent to fan out before ending turn
#   - manual: bash .claude/scripts/article-i18n-completeness.sh
#
# Exit codes:
#   0  — all EN articles have siblings in every other locale
#   1  — at least one EN article is missing one or more locale siblings
#   2  — config error (locales unreadable, no en/ folder, etc.)
#
# Output: human-readable list of missing files on stderr when failing,
#         pointing to the article-translate skill.

set -e

# Resolve repo root regardless of where the script is invoked from.
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

CONFIG="src/i18n/config.ts"
EN_DIR="content/articles/en"

if [ ! -f "$CONFIG" ]; then
  echo "[i18n-completeness] ERROR: $CONFIG not found." >&2
  exit 2
fi
if [ ! -d "$EN_DIR" ]; then
  # No English articles yet — nothing to check.
  exit 0
fi

# Parse the locale list from src/i18n/config.ts. Expected line:
#   export const locales = ['en', 'fr', 'es', 'pt', 'zh', 'ar'] as const;
locales_line="$(grep -E "export const locales" "$CONFIG" || true)"
if [ -z "$locales_line" ]; then
  echo "[i18n-completeness] ERROR: could not find 'export const locales' in $CONFIG." >&2
  exit 2
fi

# Extract codes between single or double quotes.
locales="$(echo "$locales_line" | grep -oE "['\"][a-z]{2,3}['\"]" | tr -d "'\"")"
if [ -z "$locales" ]; then
  echo "[i18n-completeness] ERROR: no locale codes parsed from $CONFIG." >&2
  exit 2
fi

# Non-English target locales.
targets="$(echo "$locales" | grep -v '^en$' || true)"
if [ -z "$targets" ]; then
  # Single-locale app — nothing to mirror.
  exit 0
fi

# Find every English MDX article (recurse, follow topic-folder structure).
en_articles="$(find "$EN_DIR" -type f -name '*.mdx' | sort)"
if [ -z "$en_articles" ]; then
  exit 0
fi

missing_count=0
missing_report=""

while IFS= read -r en_path; do
  # Strip the leading "content/articles/en/" to get "<topic>/<slug>.mdx".
  rel="${en_path#content/articles/en/}"
  for loc in $targets; do
    sibling="content/articles/$loc/$rel"
    if [ ! -f "$sibling" ]; then
      missing_count=$((missing_count + 1))
      missing_report="${missing_report}  - $sibling  (mirror of $en_path)\n"
    fi
  done
done <<< "$en_articles"

if [ "$missing_count" -gt 0 ]; then
  {
    echo ""
    echo "✗ i18n completeness check FAILED — $missing_count missing translation(s):"
    echo ""
    printf "%b" "$missing_report"
    echo ""
    echo "Every article under content/articles/en/ must exist in all locales declared"
    echo "in src/i18n/config.ts. Run the article-translate skill to fan out:"
    echo "  .claude/skills/article-translate/SKILL.md"
    echo ""
    echo "If this is intentional WIP that you do not want to translate yet, move the"
    echo "EN file out of content/articles/en/ until it is ready."
    echo ""
  } >&2
  exit 1
fi

# Silent on success — pre-commit and Stop hooks should be quiet when clean.
exit 0
