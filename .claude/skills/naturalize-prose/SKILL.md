---
name: naturalize-prose
description: Send a native-speaker editor subagent into foreign-locale MDX articles (fr/es/pt/zh/ar) to directly edit and update them — rewriting stiff or calque-flavored sentences into fluent day-to-day prose, AND catching mistakes, mistranslations, or omissions the first-pass `article-translate` may have missed or skipped. One expert per locale: French expert for fr, Spanish for es, European Portuguese for pt, Simplified-Chinese for zh, Modern-Standard-Arabic for ar. Each agent reads the locale file (and the EN source as ground truth), then edits the locale file in place. Triggered when the user asks to "polish the French articles", "naturalize the Spanish prose", "make the Portuguese read more natural", "cycle through the Arabic articles", "go through all Chinese articles and improve them", "check the [locale] versions for missed paragraphs", or names a specific foreign-locale folder/path under `content/articles/{fr,es,pt,zh,ar}/`. Distinct from `article-translate` (mechanical first-pass): this is the second-pass native-voice + correctness sweep. Supports single-article passes and full-locale cycles.
---

# naturalize-prose (native-voice polish + correction sweep)

Sibling to `article-translate`. The first pass produces a mechanical, faithful translation of an EN article into the five non-English locales. This skill is the **second pass** — a native-speaker editor opens the locale file, compares it against the EN source, and **edits it in place** to:

1. **Naturalize the prose** — rewrite stiff/calque/academic-translator sentences into how a fluent native speaker actually writes day-to-day.
2. **Fix mistakes** — correct mistranslations, wrong verb tense, wrong terminology, awkward word choice, register slips.
3. **Fill omissions** — restore any paragraph, sentence, list item, or component the first pass skipped, and write it natively (not literally).

The reader should feel the article was written and edited by someone who masters the language and uses it day-to-day — not by a third party who doesn't live in it.

## Core principle: edit with full context, not sentence-by-sentence

The single biggest source of translation flavor is sentence-by-sentence rendering. Fluent native prose has connective tissue — anaphora, rhythm, varied connectives, argument that builds across sentences — that only works when the writer is holding the **whole paragraph (and ideally the whole section)** in mind.

The expert MUST:

- **Read the full article first** (both EN source and locale file) before editing any sentence.
- **When rewriting, hold the whole paragraph in mind** — not just the sentence on the current line. A sentence that reads fine alone can still feel translated if it doesn't bridge to its neighbors the way a native speaker would write.
- **Adjust beyond the sentence boundary when needed.** If naturalizing sentence 3 requires also tweaking the end of sentence 2 or the start of sentence 4 so they flow together, do that. Cohesion lives between sentences.
- **Match the section's argument arc.** A section that builds a chain of reasoning in EN should build the same chain in the locale — same logical moves, but with the connectives, hedges, and rhythm a native speaker would use to make that argument.
- **Never translate one sentence at a time in isolation.** That's the failure mode this entire skill exists to fix.

## When to use

- "Make the French sound natural", "polish the Spanish version", "rewrite the Portuguese to flow better", "naturalize the Arabic prose", "go through all Chinese articles".
- "Check the [locale] versions for missed paragraphs" / "the first translation pass missed some sections".
- A specific path under `content/articles/{fr,es,pt,zh,ar}/` named by the user.
- Periodic refresh of an entire locale's catalog after a batch of EN→locale translations.

Do NOT use this skill for:
- First-pass translation of new EN articles → that's `article-translate`.
- UI string translation → that's `i18n-sync`.

## The five language-expert subagents

Each is a native-quality editor for one locale. They are dispatched via the `Agent` tool with `subagent_type: general-purpose` and have **direct Edit/Write authority** on the locale file. They read the EN source for ground truth and the locale file as the working surface.

| Locale | Expert persona | Register & style cues |
|---|---|---|
| `fr` | Native French editor (FR-FR, standard register) | `vous` form, no calque, varied connectives (not just "De plus" / "En effet" every paragraph), drop redundant subject reprises, prefer the verb the native speaker actually uses |
| `es` | Native Spanish editor (cross-regional neutral, slight peninsular) | `tú` form, peer voice, active verbs over passive nominalizations, idiomatic `que`/`donde`/`cuando` flow |
| `pt` | Native European Portuguese editor (PT-PT, post-1990 orthography) | mixed `tu`/`você` as natural, no Brazilianisms, PT-PT lexicon (`utilizador`, `casa de banho`, `ecrã`, `telemóvel`), avoid `a gente` for "we" |
| `zh` | Native Mandarin editor (Simplified, mainland-neutral) | `你` (not `您`), conversational rhythm, prune translator-y `的` over-use, use 4-character set phrases (成语) where they read naturally, no spaces between CJK chars and punctuation |
| `ar` | Native Modern-Standard-Arabic editor | MSA throughout (not dialectal), idiomatic connectors (`و`، `ف`، `ثم`، `حيث`، `إذ`), natural rhetorical flow, no stiff Anglo-Arabic, Western Arabic numerals (0–9), Latin-script brand names, RTL-aware |

## Workflow

### Single-article pass

1. **Identify the target**: `content/articles/<locale>/<topic>/<slug>.mdx` and its EN source `content/articles/en/<topic>/<slug>.mdx`.
2. **Dispatch the matching expert subagent** with both paths. Give the agent Read + Edit + Write authority. The agent reads both files, identifies the three concerns (naturalize / fix / fill), and edits the locale file in place.
3. **Receive the report** — the subagent reports what it changed and why (in 4–8 lines): which passages were naturalized, which mistakes it found, which omissions it filled.
4. **Spot-check** — read a couple of changed passages in the locale file to sanity-check the agent's work. Watch for: did it accidentally touch frontmatter shape, MDX components, citations, slugs, or medical claims.
5. **Render check** if the change might shift layout (long-translation locales: `pt`, `ar`).

### Full-locale cycle

When the user asks to "cycle through all French articles" (or any locale):

1. **Enumerate**: `find content/articles/<locale> -name "*.mdx" | sort` — report total count to the user.
2. **Order**: pillars first (`_pillar.mdx` in each topic), then cluster articles within each topic. Pillars set the voice; clusters should match.
3. **Per-article dispatch**: spawn the expert subagent for one article (or 2-3 in parallel if you can hold the diffs/reports in context). Don't fan out the whole locale at once — you need to review each result.
4. **Use `TodoWrite`** for any cycle of 3+ articles: one todo per article path, marked completed as each diff is verified.
5. **Commit cadence**: commit after each topic folder is done (one commit for `fr/bph/*`, one for `fr/voiding/*`, etc.). Lets the user audit incrementally and revert any topic cleanly.
6. **Progress report**: after each batch, tell the user what changed and what's left.
7. **Locale switch**: finish one locale fully before moving to the next when "do this for all locales".

### Dispatch prompt template

Use this when calling the `Agent` tool. Fill in `[LANGUAGE]`, `[LOCALE]`, the register cues, and the two file paths.

```
You are a native [LANGUAGE] writer and editor with day-to-day mastery of the language.
You spot the difference between prose a fluent native speaker would write and prose that
was mechanically translated from English (calque, over-literal connectives, stiff
nominalizations, word choices a native speaker would never make in casual writing).

You have Read, Edit, and Write authority on the locale file. You will edit it in place.

INPUTS:
- EN source (ground truth):    [content/articles/en/<topic>/<slug>.mdx]
- Locale file (you edit this): [content/articles/<locale>/<topic>/<slug>.mdx]

BEFORE EDITING ANYTHING:
- Read BOTH files in full. Do not start editing partway through a read.
- When you rewrite a sentence, hold the surrounding paragraph and section in mind.
  A sentence-by-sentence direct rewrite is exactly the failure mode you are here to
  fix. Fluent native prose has cohesion: anaphora, varied connectives, rhythm, an
  argument that builds across sentences. You can only produce that if you're
  thinking at the paragraph and section level, not the sentence level.
- If naturalizing one sentence requires also adjusting the tail of the previous
  sentence or the head of the next one so they flow, do that. Cohesion lives
  between sentences, not inside them.
- The section's argument arc in the locale must match the EN's argument arc — same
  logical moves — but with the connectives, hedges, and rhythm a native speaker
  would actually use.

YOUR THREE JOBS — in this order:

1. NATURALIZE. Rewrite stiff, calque, or academic-translator phrasings into how a
   fluent native [LANGUAGE] speaker would write. Vary connectives. Replace passive
   nominalizations with active verbs where natural. Replace literal calques with the
   locale's actual idiom for the same meaning. Match prose density (no expansion).

2. FIX MISTAKES. Compare against the EN source. Correct any:
   - Mistranslation (the locale says something different from the EN).
   - Wrong terminology (the wrong clinical or lay term in this language).
   - Wrong verb tense, register slip, broken agreement, typo.
   - Awkward word choice that misses the EN nuance.

3. FILL OMISSIONS. If the first-pass translator skipped a paragraph, sentence, list
   item, callout body, image alt, or component prop, write it natively in [LANGUAGE]
   from the EN source. Match the article's voice. Place it in the same position as
   the EN.

CONSTRAINTS — preserve verbatim, do NOT modify:
- Frontmatter shape and field names. You MAY refine `description`, `heroAlt`, and
  `keywords` strings if they read awkwardly, but keep field count and types intact.
  Never change `slug`, `topic`, `locale`, `author`, `medicallyReviewedBy`,
  `publishedAt`, `updatedAt`, `lastReviewedAt`, `hero` (path), `readingTimeMin`,
  `relatedSlugs`, `citations` (array), `noindex`, `glossaryFirstOccurrences`.
- All MDX component tags: <DiaryCta>, <Callout>, <Image>, <RefList>, <dots>, etc.
  Translate text props (title=, description=, buttonLabel=) where they hold prose,
  but never the tag names or non-text attributes.
- Markdown link URLs.
- Inline citation markers like [1], [^2].
- Code blocks.
- Numerical values, units, dates, brand names ("My Flow Check", "IPC",
  "Integrated Pelvic Care").
- Heading structure: same count, same levels, same anchor positions.
- Slugs (in frontmatter or internal /learn/... links).
- All medical claims, dosages, thresholds — preserve every factual statement.
- The citations array — do NOT translate medical citations.

REGISTER for [LOCALE]:
[insert register & style cues from the table for this locale]

UNIVERSAL RULES:
- No em-dashes (— or –). Use commas, periods, colons, semicolons, parentheses.
- Peer voice, never authority voice. The reader is a curious adult, not a patient
  being instructed by a doctor.
- Don't invent claims not present in the EN source. Don't soften medical claims.
- Don't expand or summarize. Approximate word count parity (±15%) with EN.
- Avoid the common translator's tics: redundant "as mentioned above" filler,
  unnecessary nominalizations, calqued idioms, the same connective twice in a row.

OUTPUT:
1. Edit the locale file in place using the Edit/Write tools. Multiple Edits are fine.
2. Reply with a short report (4–8 lines) listing:
   - Passages naturalized (a brief flavor, not the full diff).
   - Mistakes you found and fixed (with the EN ground truth quoted briefly).
   - Omissions you filled (which section, how much).
   - Anything you DIDN'T touch and why (e.g. "Section 4 already read naturally").
```

### What the expert is allowed to change

- Sentence structure (split long calques, join choppy translated sentences).
- Word choice (stiff direct-translation noun → the word the native speaker uses).
- Connectives, voice, idiom, register tightening.
- Frontmatter prose strings: `description`, `heroAlt`, `keywords` if awkward.
- **Fix** mistranslations and broken grammar.
- **Fill** omissions (missing paragraphs, sentences, list items, props, alt text).

### What stays untouched

See CONSTRAINTS in the prompt. Frontmatter structural fields, MDX component tags, structure, citations array, brand names, medical claims, numerical values, slugs.

## Validation after each pass

- Run `bash .claude/scripts/article-i18n-completeness.sh` to confirm no locale sibling went missing (sanity check — the expert should never delete a file, but verify).
- Quick MDX parse check: open the file, scan for unmatched component tags or broken frontmatter (the agent's edits should not break the parser, but trust-but-verify).
- If the article is published, render `/learn/<topic>/<slug>` in the target locale and skim for layout regressions — especially `pt` (expansion) and `ar` (RTL).
- The `visual-qa` skill is the heavier render check — run it after a full-locale cycle, or if the user requests visual confirmation.

## Tracking progress on a full cycle

Use `TodoWrite` for any cycle of 3+ articles. One todo per article path, marked completed as each expert's pass is verified. Lets the user see progress and lets you resume cleanly if interrupted.

## Reference

- `article-translate/SKILL.md` — first-pass translation; many invariants are shared (citations, slugs, brand names, no em-dashes).
- `i18n-sync/SKILL.md` — UI strings; same per-locale register rules.
- `visual-qa/SKILL.md` — visual/render verification across locales (incl. RTL).
- `content/SKILL.md` and `content/README.md` — full article schema.
- Memory: `reference_language_experts.md` — index of the available expert personas.
