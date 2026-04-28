---
name: i18n-sync
description: Smart-sync UI string translations across the patient app's locale files. Triggers automatically (via PostToolUse hook in `.claude/settings.json`) every time `messages/en.json` is edited, and also when the user asks to "translate UI strings", "mirror keys to fr/es", "sync i18n", "fix the French translations", or names any of `messages/en.json` / `fr.json` / `es.json`. Mirrors new or changed keys from `messages/en.json` into `messages/fr.json` and `messages/es.json` with idiomatic, locale-natural phrasing — never literal LLM dumps. Enforces register rules: French uses `vous` (warm but respectful), Spanish uses `tú` (peer-direct, informal). Preserves JSON structure exactly, including ICU placeholders like `{name}` and HTML tags like `<strong>`.
---

# i18n sync (UI strings — patient app)

The "translation agent" for the patient app's UI copy. Runs automatically whenever `messages/en.json` changes (PostToolUse hook in `.claude/settings.json`), keeping `messages/fr.json` and `messages/es.json` in idiomatic sync.

This skill is for **UI strings only** — header labels, button copy, error messages, onboarding flow, and so on. It is NOT for translating long-form articles or MDX content.

## Trigger

- **Auto** (primary): the `PostToolUse` hook in `.claude/settings.json` fires after any `Edit` or `Write` whose path ends with `messages/en.json`. Claude sees an injected reminder pointing here, then runs the workflow below in the same turn.
- **Manual**: when the user asks to translate UI strings, mirror keys, sync i18n, or fix specific keys in fr/es.

## Files

| Locale | Path | Authority |
|---|---|---|
| English (source of truth) | `messages/en.json` | The user's edits land here first. Treat as canonical. |
| French | `messages/fr.json` | Mirror structure exactly. Translate values. |
| Spanish | `messages/es.json` | Mirror structure exactly. Translate values. |

These are loaded by `src/i18n/request.ts` based on the request locale. The shape of all three files must match key-for-key — a missing key in fr/es throws at runtime.

## Workflow (follow in order)

### Step 1: Diff the source

Compare `messages/en.json` with `messages/fr.json` and `messages/es.json` to find:

- **New keys** present in en.json but missing in fr.json or es.json
- **Removed keys** present in fr/es but no longer in en.json (delete from fr/es)
- **Changed values** where the en.json value's meaning has shifted (heuristic: same key, materially different English) — flag for re-translation
- **Renamed keys** (rare — tricky to detect). If the user renamed a key, treat as remove + add.

A quick way to enumerate keys at any depth (if jq is available):

```bash
jq -r 'paths(scalars) | join(".")' messages/en.json | sort > /tmp/en.keys
jq -r 'paths(scalars) | join(".")' messages/fr.json | sort > /tmp/fr.keys
diff /tmp/en.keys /tmp/fr.keys
```

If `jq` is missing, read both files and reason about the diff directly. Don't try to install tools.

### Step 2: Re-read voice precedents

Before translating, re-read the existing `messages/fr.json` and `messages/es.json` to anchor on the established voice. The existing translations are the live authority on register, idiom, and house style. Pattern-match new strings to that voice.

### Step 3: Translate the diff

For each new or changed key, produce idiomatic translations using the rules below.

### Step 4: Write fr.json and es.json

Edit only the affected keys. Preserve the file's JSON structure (existing whitespace, ordering, indentation). When adding new keys, place them next to their English siblings in the same nested location.

### Step 5: Validate

```bash
node -e "JSON.parse(require('fs').readFileSync('messages/fr.json','utf8'))"
node -e "JSON.parse(require('fs').readFileSync('messages/es.json','utf8'))"
```

Both must exit 0. A broken JSON file kills the whole site for that locale.

Then key-parity check:

```bash
diff <(jq -r 'paths(scalars) | join(".")' messages/en.json | sort) \
     <(jq -r 'paths(scalars) | join(".")' messages/fr.json | sort)
```

Should be empty (modulo any keys you intentionally left untranslated — call those out in the report).

### Step 6: Report

Tell the user, in 2-4 lines: how many keys synced into each locale, anything that needed judgment (a key whose meaning was ambiguous, or a calque you avoided and what you used instead).

## Translation register — BINDING

Re-derive these from the live `messages/fr.json` / `messages/es.json` if the established voice has shifted. As of 2026-04-28:

| Locale | Address form | Examples from existing files |
|---|---|---|
| **French** (`fr`) | **vous** — warm but respectful, never `tu` | "Comprendre son corps", "Revenez bientôt", "Lectures en langage clair", "Suivez votre vessie en 3 jours" |
| **Spanish** (`es`) | **tú** — peer-direct, informal, never `usted` | "Conocer **tu** cuerpo", "Vuelve pronto", "Lleva el control de **tu** vejiga", "Empezar el diario" |

**Why the asymmetry**: French health/medical writing for a general patient audience defaults to `vous` (it reads as respectful, not distant). Spanish patient-direct content in this app's voice uses `tú` (collaborative, peer-to-peer — closer to the "we all have a body" frame from `feedback_collaborative_tone.md`).

If the user explicitly overrides this for a specific key (e.g. "use tu in this French string because it's a child-facing message"), update this table — don't silently change voice.

## Tone rules — apply to all locales

These extend `feedback_collaborative_tone.md` and `feedback_no_em_dashes.md` from the user's auto-memory.

1. **No literal calques.** "Track your bladder" doesn't word-for-word translate to "Suivez votre vessie" or "Sigue tu vejiga" if the locale would naturally say something else. Find the natural phrasing first; if there isn't one, calque is acceptable as a fallback.
2. **No em-dashes** (`—` or `–`) in any locale. Use commas, periods, colons, semicolons, or parentheses. Hard project rule across en/fr/es.
3. **Peer voice, not authority voice.** Avoid "il est recommandé de…" / "se recomienda…" passive-authority constructions. Prefer direct active voice: "essayez de…" / "intenta…" / "vous pouvez…" / "puedes…".
4. **Lay term first, clinical term parenthetically only when needed for clarity.** Don't dump medical jargon into UI strings.
5. **Match length.** UI strings often live in tight layouts (buttons, chips, banner labels). If the EN value is short and punchy, keep the translation roughly the same word count — don't expand into a flowery sentence.
6. **Numbers and units stay numerals.** "3 days" → "3 jours" / "3 días", not "trois jours". Date format mirrors the existing locale conventions in messages/*.json.

## Preserve technical patterns exactly

These travel verbatim across locales — translate the surrounding human-readable text, but **don't touch** the special tokens.

| Pattern | Example | Rule |
|---|---|---|
| ICU placeholders | `"Day {number}"` | Keep `{number}` literal; translate the surrounding text. EN→FR: `"Jour {number}"`. |
| Plural forms | `"{count, plural, one {# day} other {# days}}"` | Translate the inner branches; keep the ICU syntax. |
| HTML tags in strings | `"<strong>Important:</strong> ..."` | Preserve tags; translate the text inside. |
| Component tags | `"Tap <dots></dots> to ..."` | Preserve component tags exactly. |
| Newlines | `"line1\nline2"` | Preserve `\n`. |
| Unicode escapes | `"é"` (é) | The existing es.json uses `\u00xx` escapes; fr.json uses literal accented characters. Match the file's existing convention rather than imposing a uniform style. |

## What NOT to translate

- **Keys** themselves — only translate values.
- **Brand names**: "My Flow Check", "IPC", "Integrated Pelvic Care" stay verbatim across all locales (these are brand identity, not localization targets).
- **Email addresses, URLs, file paths** in copy.
- **Date format strings** if any are template-literal (e.g. `"YYYY-MM-DD"` stays as-is).

## What NOT to do (scope guard)

- **Don't translate articles** (`content/articles/**/*.mdx`). Article translation is its own decision and lives outside this skill.
- **Don't generate new English copy.** This skill mirrors what's already in en.json, not authors new strings. If a key is missing meaning in EN, fix EN first.
- **Don't reorder keys** in fr/es to match alphabetical order or any other reorganization. Mirror the en.json structure exactly so the diff stays clean.
- **Don't run prettier or a JSON formatter** that reformats the whole file. Edit only the changed keys; leave the rest of the file's whitespace alone.
- **Don't suggest the user adopts a translation library** (i18next plugins etc). The point of this skill is the smart-translation step, not tooling.

## Hook integration

The PostToolUse hook is in `.claude/settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "jq -r 'select((.tool_input.file_path // \"\") | endswith(\"messages/en.json\")) | {hookSpecificOutput: {hookEventName: \"PostToolUse\", additionalContext: \"...\"}}'"
          }
        ]
      }
    ]
  }
}
```

The hook runs after every Edit/Write tool call. It uses `jq` to filter to only `messages/en.json` paths, then emits an `additionalContext` reminder that Claude sees in the next turn. If the path doesn't match, jq's `select` produces no output and the hook is a no-op.

If the hook ever stops firing:
1. Check `.claude/settings.json` exists and parses (`jq . .claude/settings.json`).
2. Confirm `jq` is installed (`which jq`). The hook depends on it.
3. Check `/hooks` in Claude Code to verify the hook is registered for this session — if you just added the file mid-session, the watcher may not have picked it up; restart or open `/hooks` to reload.

## Reference

- `messages/en.json` — source of truth for keys
- `messages/fr.json`, `messages/es.json` — voice authority for register, idiom, established translations
- `src/i18n/request.ts` — i18n loader
- Tone memories (in user's auto-memory dir): `feedback_collaborative_tone.md`, `feedback_no_em_dashes.md`
- `.claude/settings.json` — the auto-trigger hook
- Sibling skill: `learn-styling/SKILL.md` (design language, locale-agnostic)
