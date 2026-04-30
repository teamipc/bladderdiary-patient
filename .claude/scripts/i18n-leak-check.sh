#!/usr/bin/env bash
# PostToolUse hook: detect likely hardcoded user-visible English in TSX/lib edits
# and remind Claude to route through messages/en.json + t().
#
# Reads the hook input JSON from stdin (Claude Code hook contract).
# Emits a hookSpecificOutput object on stdout if a leak signal is detected.
# Otherwise emits nothing (no-op).

set -e

input=$(cat)

# Extract file_path and the diff body (new_string for Edit, content for Write)
file_path=$(echo "$input" | jq -r '.tool_input.file_path // ""')
body=$(echo "$input" | jq -r '(.tool_input.new_string // "") + (.tool_input.content // "")')

# Only consider edits to src/ TSX/TS source (not tests, not messages)
case "$file_path" in
  */src/lib/*.ts|*/src/lib/*.tsx|*/src/components/*.tsx|*/src/components/*.ts|*/src/app/*.tsx|*/src/app/*.ts) ;;
  *) exit 0 ;;
esac
case "$file_path" in
  *__tests__*|*messages/*|*.test.ts|*.test.tsx) exit 0 ;;
esac

# Heuristic patterns that commonly indicate hardcoded English UI strings.
# Each pattern targets a specific leak surface (see i18n-sync skill "Common leak sites").
patterns=(
  $'aria-label=\\{`[A-Z]'                      # JSX aria-label={`Step …`}
  $'aria-label=`[A-Z]'                         # bare backtick (rare)
  $'aria-label="[A-Z][a-z]'                    # aria-label="Foo"
  $'aria-label=\'[A-Z][a-z]'                   # aria-label='Foo'
  $'alert\\(["\x60\x27][A-Z]'                  # alert("Foo") / alert('Foo') / alert(`Foo`)
  $'\\?\\? ["\x60\x27][A-Z][a-z]+["\x60\x27]'  # ?? "Foo" fallback
  $'label: ["\x60\x27][A-Z][a-z]'              # label: "Foo" in lib constants
  $'description: ["\x60\x27][A-Z][a-z]'        # description: "Foo" in lib constants
  $'title: ["\x60\x27][A-Z][a-z]'              # title: "Foo" in lib constants
  $'placeholder="[A-Z][a-z]'                   # placeholder="Foo"
  $'placeholder=\'[A-Z][a-z]'                  # placeholder='Foo'
)

leak_found=0
for pat in "${patterns[@]}"; do
  if echo "$body" | grep -E "$pat" > /dev/null 2>&1; then
    leak_found=1
    break
  fi
done

if [ "$leak_found" -eq 0 ]; then
  exit 0
fi

# Emit the reminder
cat <<'EOF'
{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"This edit looks like it may contain a hardcoded user-visible English string (aria-label / alert / ?? fallback / lib constant label/description/title / placeholder). If so, do NOT ship it as English literal — add the string to messages/en.json under an appropriate namespace and replace the literal with t('namespace.key', { params }). The i18n-sync skill (.claude/skills/i18n-sync/SKILL.md) will mirror it into fr/es/pt/zh/ar. See the skill's 'Common leak sites' section for the full pattern catalog. Brand names (My Flow Check, IPC, Integrated Pelvic Care) and dev-only console.error are exempt."}}
EOF
