---
name: i18n-sync
description: Smart-sync UI string translations across the patient app's locale files. Triggers automatically (via PostToolUse hook in `.claude/settings.json`) every time `messages/en.json` is edited, and also when the user asks to "translate UI strings", "mirror keys to other locales", "sync i18n", "fix the French/Spanish/Portuguese/Chinese/Arabic translations", or names any of `messages/{en,fr,es,pt,zh,ar}.json`. Mirrors new or changed keys from `messages/en.json` into `messages/{fr,es,pt,zh,ar}.json` with idiomatic, locale-natural phrasing — never literal LLM dumps. Enforces register rules per locale (FR=vous, ES=tú, PT=tu/você, ZH=Mandarin Simplified peer-direct, AR=Modern Standard, RTL-aware). Preserves JSON structure exactly, including ICU placeholders like `{name}` and HTML tags like `<strong>`.
---

# i18n sync (UI strings — patient app)

The "translation agent" for the patient app's UI copy. Runs automatically whenever `messages/en.json` changes (PostToolUse hook in `.claude/settings.json`), keeping the five target locale files in idiomatic sync.

This skill is for **UI strings only** — header labels, button copy, error messages, onboarding flow, and so on. It is NOT for translating long-form articles or MDX content (use the sibling `article-translate` skill for that).

## Trigger

- **Auto** (primary): the `PostToolUse` hook in `.claude/settings.json` fires after any `Edit` or `Write` whose path ends with `messages/en.json`. Claude sees an injected reminder pointing here, then runs the workflow below in the same turn.
- **Manual**: when the user asks to translate UI strings, mirror keys, sync i18n, or fix specific keys in any locale.

## Files

| Locale | Code | Path | Authority |
|---|---|---|---|
| English (source of truth) | `en` | `messages/en.json` | The user's edits land here first. Treat as canonical. |
| French | `fr` | `messages/fr.json` | Mirror structure exactly. Translate values. |
| Spanish | `es` | `messages/es.json` | Mirror structure exactly. Translate values. |
| Portuguese | `pt` | `messages/pt.json` | Mirror structure exactly. Translate values. |
| Mandarin Chinese (Simplified) | `zh` | `messages/zh.json` | Mirror structure exactly. Translate values. |
| Arabic (Modern Standard) | `ar` | `messages/ar.json` | Mirror structure exactly. Translate values. RTL — see RTL section. |

These are loaded by `src/i18n/request.ts` based on the request locale. The shape of all six files must match key-for-key — a missing key in any locale throws at runtime.

## Workflow (follow in order)

### Step 1: Diff the source

Compare `messages/en.json` with each target locale (`fr`, `es`, `pt`, `zh`, `ar`) to find:

- **New keys** present in en.json but missing in the target
- **Removed keys** present in target but no longer in en.json (delete from target)
- **Changed values** where the en.json value's meaning has shifted (heuristic: same key, materially different English) — flag for re-translation
- **Renamed keys** (rare — tricky to detect). If the user renamed a key, treat as remove + add.

A quick way to enumerate keys at any depth (if jq is available):

```bash
jq -r 'paths(scalars) | join(".")' messages/en.json | sort > /tmp/en.keys
for L in fr es pt zh ar; do
  jq -r 'paths(scalars) | join(".")' "messages/$L.json" | sort > "/tmp/$L.keys"
  echo "=== $L ==="; diff /tmp/en.keys "/tmp/$L.keys"
done
```

If `jq` is missing, read both files and reason about the diff directly. Don't try to install tools.

### Step 2: Re-read voice precedents

Before translating, re-read the existing target file to anchor on the established voice. The existing translations are the live authority on register, idiom, and house style. Pattern-match new strings to that voice.

### Step 3: Translate the diff

For each new or changed key, produce idiomatic translations using the rules below.

### Step 4: Write the locale files

Edit only the affected keys. Preserve the file's JSON structure (existing whitespace, ordering, indentation). When adding new keys, place them next to their English siblings in the same nested location.

### Step 5: Validate

```bash
for L in fr es pt zh ar; do
  node -e "JSON.parse(require('fs').readFileSync('messages/$L.json','utf8'))" && echo "$L: ok"
done
```

All must exit 0. A broken JSON file kills the whole site for that locale.

Then key-parity check:

```bash
for L in fr es pt zh ar; do
  echo "=== $L ==="
  diff <(jq -r 'paths(scalars) | join(".")' messages/en.json | sort) \
       <(jq -r 'paths(scalars) | join(".")' "messages/$L.json" | sort)
done
```

Each block should be empty (modulo any keys you intentionally left untranslated — call those out in the report).

### Step 6: Report

Tell the user, in 3–6 lines: how many keys synced into each locale, anything that needed judgment (a key whose meaning was ambiguous, or a calque you avoided and what you used instead).

## Translation register — BINDING

Re-derive these from the live target files if the established voice has shifted.

| Locale | Address form | Notes |
|---|---|---|
| **French** (`fr`) | **vous** — warm but respectful, never `tu` | French health/medical writing for a general patient audience defaults to `vous` (it reads as respectful, not distant). |
| **Spanish** (`es`) | **tú** — peer-direct, informal, never `usted` | Patient-direct content in this app's voice uses `tú` (collaborative, peer-to-peer — closer to the "we all have a body" frame). |
| **Portuguese** (`pt`) | **tu** in imperatives where natural; **você** in declaratives — European Portuguese baseline (Portugal). Prefer the form that reads natural to a Lisbon-educated reader. Don't use Brazilian-only constructions (e.g. avoid "a gente"). | Use European spelling: "utilizador" not "usuário", "ecrã" not "tela", "ficheiro" not "arquivo". Date format `DD/MM/AAAA`. |
| **Mandarin Chinese** (`zh`) | **你** (peer-direct), never **您** (over-formal for this voice) | Use Simplified script (`zh-Hans` / mainland convention). Sentences end without trailing periods on UI labels. Avoid Taiwanese-specific lexicon. Numerals stay Arabic ("3 天" not "三天" in UI counters). |
| **Arabic** (`ar`) | Modern Standard Arabic (MSA) — neutral, accessible. Use 2nd person masculine singular by default unless the EN string uses a gendered form. | RTL script — see RTL section below. Use Eastern Arabic numerals only if you confirm the existing file uses them; otherwise keep Western Arabic numerals (0-9) which is the patient app's default. |

**Why the asymmetry**: each locale's pelvic-health/patient-education register has its own conventions. The above are calibrated for warmth-without-clinical-distance.

If the user explicitly overrides this for a specific key (e.g. "use `usted` for this Spanish string because it's an elderly-care-facing label"), update this table — don't silently change voice.

## Tone rules — apply to all locales

These extend `feedback_collaborative_tone.md` and `feedback_no_em_dashes.md` from the user's auto-memory.

1. **No literal calques.** "Track your bladder" doesn't word-for-word translate to "Suivez votre vessie" or "Sigue tu vejiga" if the locale would naturally say something else. Find the natural phrasing first; if there isn't one, calque is acceptable as a fallback.
2. **No em-dashes** (`—` or `–`) in any locale. Use commas, periods, colons, semicolons, or parentheses. Hard project rule across all six locales. For Arabic and Chinese, avoid the locale-typical "—" too (use 、 or 。 in Chinese, comma/period in Arabic).
3. **Peer voice, not authority voice.** Avoid "il est recommandé de…" / "se recomienda…" / "建议…" (when it reads bureaucratic) / "يُنصح بـ…" passive-authority constructions. Prefer direct active voice.
4. **Lay term first, clinical term parenthetically only when needed for clarity.** Don't dump medical jargon into UI strings.
5. **Match length.** UI strings often live in tight layouts (buttons, chips, banner labels). If the EN value is short and punchy, keep the translation roughly the same word count — don't expand into a flowery sentence. Chinese is typically 50-70% the character count of English; Arabic is roughly the same length; Portuguese tends to be ~10% longer.
6. **Numbers and units stay numerals.** "3 days" → "3 jours" / "3 días" / "3 dias" / "3 天" / "٣ أيام" (use Western Arabic if existing file does). Date format mirrors the existing locale conventions in `messages/*.json`.

## Arabic / RTL specifics

- The app already wires `<html dir="rtl">` for `ar` via `src/i18n/seo.ts → LOCALE_DIR`. **Don't add directional control characters** (LRM/RLM) to translated strings unless absolutely needed for a mixed-direction string (e.g. an English brand name embedded in Arabic).
- **Brand names stay LTR**: "My Flow Check" stays as the Latin-script brand. Do not transliterate "ماي فلو تشيك". The browser renders Latin text LTR inside an RTL container correctly.
- **Numbers**: keep Western Arabic numerals (0-9) by default — the existing app uses them in clinical contexts. Switch to Eastern Arabic (٠-٩) only if the existing `ar.json` already does.
- **Punctuation**: use Arabic comma (`،`) and semicolon (`؛`) where it would appear in normal Arabic prose; for UI labels, regular `.` and `:` are fine.
- **Diacritics**: don't add tashkeel (vowel marks) — patient-facing UI doesn't use them.
- **Quotation marks**: use `«»` or `""` consistently with what the existing file uses.

## Mandarin / Chinese specifics

- **Script**: Simplified Chinese (`zh-Hans`) — the `zh` locale code maps to mainland convention.
- **No spaces between Chinese characters and punctuation.** "确认操作" not "确 认 操 作".
- **Brand names**: keep "My Flow Check" in Latin script. Do not coin a Chinese transliteration.
- **Period**: use full-stop `。` in long-form UI prose, no period on short labels/buttons.
- **Numbers**: Arabic numerals, not 一二三, in counters and quantities.

## Portuguese specifics

- **Variant**: European Portuguese (Portugal) — `pt-PT` baseline. Use Portugal spelling and lexicon.
- **Examples**: "utilizador" (not Brazilian "usuário"), "ecrã" (not "tela"), "ficheiro" (not "arquivo"), "telemóvel" (not "celular").
- **Date format**: `DD/MM/AAAA`. Decimal separator `,` (1.234,56 — but in UI volumes the app uses `.` for clarity, so match the existing file).

## Preserve technical patterns exactly

These travel verbatim across locales — translate the surrounding human-readable text, but **don't touch** the special tokens.

| Pattern | Example | Rule |
|---|---|---|
| ICU placeholders | `"Day {number}"` | Keep `{number}` literal; translate the surrounding text. EN→FR: `"Jour {number}"`. |
| Plural forms | `"{count, plural, one {# day} other {# days}}"` | Translate the inner branches; keep the ICU syntax. |
| HTML tags in strings | `"<strong>Important:</strong> ..."` | Preserve tags; translate the text inside. |
| Component tags | `"Tap <dots></dots> to ..."` | Preserve component tags exactly. |
| Newlines | `"line1\nline2"` | Preserve `\n`. |
| Unicode escapes | `"é"` (é) | Match each file's existing convention rather than imposing a uniform style. |

## What NOT to translate

- **Keys** themselves — only translate values.
- **Brand names**: "My Flow Check", "IPC", "Integrated Pelvic Care" stay verbatim across all locales (these are brand identity, not localization targets).
- **Email addresses, URLs, file paths** in copy.
- **Date format strings** if any are template-literal (e.g. `"YYYY-MM-DD"` stays as-is).

## What NOT to do (scope guard)

- **Don't translate articles** (`content/articles/**/*.mdx`). Article translation is the `article-translate` skill's job.
- **Don't generate new English copy.** This skill mirrors what's already in en.json, not authors new strings. If a key is missing meaning in EN, fix EN first.
- **Don't reorder keys** in target locales. Mirror the en.json structure exactly so the diff stays clean.
- **Don't run prettier or a JSON formatter** that reformats the whole file. Edit only the changed keys; leave the rest of the file's whitespace alone.

## Hook integration

The PostToolUse hook is in `.claude/settings.json`. It runs after every Edit/Write tool call. It uses `jq` to filter to only `messages/en.json` paths, then emits an `additionalContext` reminder that Claude sees in the next turn. If the path doesn't match, jq's `select` produces no output and the hook is a no-op.

If the hook ever stops firing:
1. Check `.claude/settings.json` exists and parses (`jq . .claude/settings.json`).
2. Confirm `jq` is installed (`which jq`). The hook depends on it.
3. Check `/hooks` in Claude Code to verify the hook is registered for this session.

## Reference

- `messages/en.json` — source of truth for keys
- `messages/{fr,es,pt,zh,ar}.json` — voice authority for register, idiom, established translations
- `src/i18n/request.ts` — i18n loader
- `src/i18n/config.ts` — locale list
- `src/i18n/seo.ts` — `LOCALE_DIR`, `OG_LOCALE`, `HREFLANG`, `LOCALE_LABEL` maps; `buildHreflangMap` / `buildArticleHreflangMap` for SEO alternates
- Tone memories (in user's auto-memory dir): `feedback_collaborative_tone.md`, `feedback_no_em_dashes.md`
- `.claude/settings.json` — the auto-trigger hook
- Sibling skill: `article-translate/SKILL.md` (long-form MDX article translation)
- Sibling skill: `learn-styling/SKILL.md` (design language, locale-agnostic)
