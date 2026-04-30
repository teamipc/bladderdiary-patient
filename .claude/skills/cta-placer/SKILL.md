---
name: cta-placer
description: Place a "Start the bladder diary" CTA card at the right spot inside Site B (patient app, myflowcheck.com) articles. Identifies the article's natural CTA moments (right after a protocol / drill / elimination test / measurement section that the diary actually supports) and inserts a `<DiaryCta>` card with a button linking back to the homepage diary tracker. Site B only — Site A clinician articles drive to bladderdiaries.com via a different pattern. Run between /polish and /seo-finalizer for new drafts, or as a refresh pass on any published Site B article that lacks inline CTAs.
---

# CTA placer (Site B / myflowcheck.com)

The patient app's whole purpose is to drive 3-day bladder-diary completions. Every article has a global bottom-of-page CTA injected by the article-route template (`src/app/[locale]/learn/[topic]/[slug]/page.tsx`). That bottom CTA fires once a reader has finished the article — but most readers don't finish. Inline CTAs catch the reader at the moment a tracked diary becomes obviously useful: right after the article tells them to do an elimination test, run a drill, or measure their voids.

This skill is the agent that picks **where** that inline CTA should go and writes a context-tailored card for that spot.

## Site scope

| Site | Behavior |
|---|---|
| **Site B** — `/Users/zhen/bladderdiary-patient` | This skill applies. CTA links to `/` (homepage = the diary tracker on myflowcheck.com itself). |
| **Site A** — `/Users/zhen/bladderdiary` | This skill does **not** apply. Clinician articles drive to bladderdiaries.com (calculator) via a different pattern — see memory `feedback_calculator_cta_both_paths`. |

If you're invoked on a Site A article, refuse and point at the calculator-CTA pattern instead.

## Prerequisites (already wired)

- Component: `src/components/learn/DiaryCta.tsx` — renders a card with gradient + button (`/`)
- Registration: `src/lib/mdx.tsx` registers `DiaryCta` in the `components` map so MDX articles can use it
- i18n keys: `learn.article.ctaTitle`, `learn.article.ctaDescription`, `learn.article.ctaStartDiary` already exist in en/fr/es

The component takes `title?: string` and `body?: string` props. When omitted, it falls back to the i18n strings (the same generic "Track your bladder in 3 days" copy as the bottom CTA). For inline placements, **always pass article-specific copy** — the inline CTA's job is to feel like the article itself is making the offer at the right moment, not a generic banner.

## What the agent does

Walk the article body top to bottom and:

1. Detect candidate CTA moments (the rules below).
2. Score them and pick **1 or 2 placements** per article (never more — diminishing returns and reader fatigue).
3. Replace any soft pseudo-CTAs (`> **Track this in a bladder diary...`) with the proper `<DiaryCta>` component.
4. Write context-tailored `title` and `body` that reference the section the CTA is placed after.
5. Show the user a diff. Apply on approval.

## Where to place the card (GOOD spots)

Prefer placements where the diary becomes the obvious next action. These are the high-value moments:

### 1. Right after a protocol or self-test that needs measurement

The article tells the reader "do X for 14 days, log Y, look for Z." The CTA is where the reader's hand reaches for the tool. Examples:

- After "Days 4 to 17. Eliminate one suspect."
- After "Start with three days of a bladder diary."
- After a numbered step list that ends with "log every drink, every void, every leak."

**Why this works:** the reader has just read instructions; the friction is "now what." The card is "now this."

Title pattern: refer to the protocol — *"Track this elimination test in a bladder diary"*, *"Run the 14-day test in your diary"*.
Body pattern: name what the diary captures that the protocol depends on — *"Two weeks of measured input, voids, and symptoms tells you which trigger is yours."*

### 2. Right after the "key numbers from your diary" section

If the article tells the reader "look for these four numbers in your diary" or "the diary will tell you which type of bladder you have," the CTA is the natural sequel. The reader has just learned what to extract; the card hands them the instrument.

### 3. Right before a "when to talk to a clinician" / "what to bring to the visit" pivot

The article shifts from self-help to clinic. The diary is the artifact the reader brings to that conversation. The card belongs at this transition.

Title pattern: *"Bring real data to your next visit"*, *"Three days. Bring it to the clinic."*
Body pattern: explicitly mention what the data lets the clinician do.

### 4. (Pillar pages only) Once mid-body

Pillar pages are rendered through `[locale]/learn/[topic]/page.tsx`, which currently does **not** inject a global bottom CTA the way the slug template does. So pillar pages should always have at least **one** inline `<DiaryCta>` placement — the rest of the article doesn't have a backstop. Place it after the first or second top-level protocol/drill section, plus optionally one more before the FAQ.

## Where NOT to place the card (BAD spots)

- **Above the first H2.** The intro / TLDR / Key takeaways block is for orientation; a CTA there pushes too early before the reader trusts the article.
- **Between H3 subsections of the same H2.** Interrupting a list of "8 trigger foods" with a card breaks the flow.
- **Right after the FAQ.** The page-template's global bottom CTA fires there. Two CTAs back-to-back read as desperate.
- **In the references / citations section.** Self-evident.
- **Inside or right after a Warning / red-flag section.** "See a clinician for blood in urine. Also: track your bladder!" reads as tone-deaf.
- **Pillar pages don't get a bottom-of-body CTA either** — leave the last paragraph clean as the page tail. Place inline only.

## Cardinality rules

| Article type | Inline CTAs from this skill | Bottom CTA from template |
|---|---|---|
| Cluster article (`pageType: cluster` rendered through `[topic]/[slug]/page.tsx`) | 1, occasionally 2 | Yes (automatic) |
| Pillar (`pageType: pillar` rendered through `[topic]/page.tsx`) | 1 to 2 | No (template doesn't inject one) |
| Glossary entry (`pageType: glossary`) | 0 | No |

Glossary entries are short definitional pages; they don't earn a CTA. The reader who lands on a glossary term is quickly back in a parent article that already has CTAs.

## Soft-CTA replacement

Existing articles often have a blockquote pseudo-CTA shaped like:

```markdown
> **Track this in a bladder diary for two weeks.**
>
> The elimination test only works if you measure. Log every food, every drink, every void with its volume, your urgency on a 0-to-10 scale, and any leaks. The diary turns vague "my bladder is acting up" into a clear pattern with dates and numbers. Bring the visualization to your next clinic visit. Better data is the fastest path to a better treatment plan.
```

Or:

```markdown
> **Start tracking on My Flow Check today.**
>
> Two weeks of measured intake, voids, and symptoms is enough...
```

These are visually weak (blockquote → no button → no click). When you encounter one, **replace** it with a `<DiaryCta>` whose title/body distill the same idea:

```mdx
<DiaryCta
  title="Track this elimination test in a bladder diary"
  body="The 14-day protocol only works if you measure. Log every food, every drink, every void, every urge — the pattern is what tells you which trigger is yours."
/>
```

Don't keep BOTH the soft blockquote AND the new card — one or the other.

## How to write the title and body

Both fields render inside the card as plain text (no markdown).

- **Title:** 5 to 8 words, declarative or imperative. Refer to the article's specific instruction the reader just finished. Avoid generic ("Track your bladder!"). Be specific ("Run the 14-day elimination test").
- **Body:** 1 to 2 short sentences. Name what gets logged and what the data unlocks. Use plain wellness-magazine voice (memory: `feedback_patient_app_voice`). Never use "patient." Never use em-dashes (project convention).
- **Button:** always `t('article.ctaStartDiary')` (the component handles this — don't override).

### Worked examples

For a section ending "Days 4 to 17. Eliminate one suspect."

```mdx
<DiaryCta
  title="Track the elimination test in a bladder diary"
  body="Two weeks of measured drinks, voids, and urgency tells you which of the eight foods is yours. Bring the chart to your next clinic visit."
/>
```

For a section ending "Three days. Four numbers."

```mdx
<DiaryCta
  title="Three days, four numbers"
  body="Track every drink, void volume, urgency rating, and leak. The four numbers — average void, max void, daily total, nighttime share — point you to the drill that fits."
/>
```

For a section ending "Most people who try this notice change at six to eight weeks."

```mdx
<DiaryCta
  title="Start your 3-day diary today"
  body="The first three days set the baseline you'll measure progress against. Most people see clear pattern shifts by the end of week one."
/>
```

## Workflow

1. **Read the article** at `content/articles/<locale>/<topic>/<slug>.mdx` (or `_pillar.mdx` for pillar pages).
2. **Scan for trigger phrases** that mark candidate CTA moments:
   - "track ... in a bladder diary"
   - "log every"
   - "three days of"
   - "elimination test"
   - "the diary will tell you"
   - "bring (the diary | this | data) to"
   - "start with ... a bladder diary"
3. **Score each candidate** against the GOOD/BAD rules above. Prefer:
   - End of an instruction-block H2/H3 (highest score)
   - Soft pseudo-CTA blockquote currently in place (replace it)
   - Last paragraph before a clinician-visit section
4. **Pick 1 to 2** placements. Reject candidates that violate BAD rules.
5. **Draft the title + body** for each pick, referencing the specific section content.
6. **Show the user a unified diff** of the proposed edits.
7. **On approval, write the file.**
8. **Bump `updatedAt`** in the frontmatter to today's date if the article is published (changes inline body content). Don't change `lastReviewedAt` — content edit, not editorial review.
9. **Run /article-guardrail** afterwards on a published article to confirm no SEO-breaking change slipped through. Body additions are safe per its rules; an `updatedAt` bump is required.

## What's forbidden

- **Em-dashes** in any title/body string (project convention).
- **Mid-sentence placement.** The card always sits between paragraphs/sections, never inside a paragraph.
- **More than 2 inline CTAs per article.** If the article seems to deserve 3, you're over-fitting; pick the strongest 2.
- **Linking anywhere other than `/`.** The component hardcodes `href="/"`. Don't accept callers that try to override it.
- **Self-quote framing** ("As Dr. X says, track your bladder...") — see memory `feedback_no_self_quoting`.
- **Self-promotional title copy** ("The best bladder app...") — wellness register only (memory: `feedback_patient_app_voice`).

## Output

Edit the article file in place. If running on a draft (`state/drafts/`), edit there. If running on a published article (`content/articles/`), edit there and bump `updatedAt`.

Report:
- Article path
- Number of inline CTAs added (and replaced)
- Each placement: section heading it follows, title, body
- Whether `updatedAt` was bumped (and from/to)

## Reference

- Component: `src/components/learn/DiaryCta.tsx`
- Component registration: `src/lib/mdx.tsx`
- Bottom-of-page CTA template: `src/app/[locale]/learn/[topic]/[slug]/page.tsx` (lines around the "Diary CTA — primary conversion" comment)
- Pillar template (no built-in CTA): `src/app/[locale]/learn/[topic]/page.tsx`
- Sister styling skill: `.claude/skills/learn-styling/SKILL.md`
- Memories that inform tone: `feedback_patient_app_voice`, `feedback_calculator_cta_both_paths`, `feedback_allied_care_framing`
