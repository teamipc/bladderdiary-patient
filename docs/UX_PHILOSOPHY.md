# UX Philosophy

This document explains the design principles and trade-offs that shape the
patient-facing UI. Read it before making visual, layout, or copy changes —
most decisions here were made for a specific reason.

## Who we are designing for

The primary user is a **patient referred by a clinician** for a 3-day bladder
diary. In practice this skews:

- **50+ years old**, often male (men's pelvic health is the focus)
- **Not tech-savvy** — may use the browser default font size, wear reading
  glasses, hold the phone close, tap slowly
- **Anxious about the task** — they are tracking a medical symptom, not
  gamifying a habit. Every confusing moment can push them to abandon.
- **One-shot engagement** — they use the app for 3 days, then share results
  with their clinician. There is no onboarding curve to amortize.
- **Often on older iPhones** (iPhone SE 2/3, 8, mini) — 375×667 is a realistic
  minimum target viewport. iPhone SE 1 (320×568) is a rare-but-possible edge.

Secondary user: the **referring clinician** ([Singapore-based, UTC+8, testing
before recommending](../.claude/projects/-Users-zhen-bladderdiary-patient/memory/user_clinician.md)).
Their trust depends on the app feeling professional and clinically correct.

## Core principles

### 1. The primary CTA on every screen is above the fold on iPhone SE

If a user has to scroll to discover the "next" button, we have lost them. We
don't rely on scroll hints, floating indicators, or sticky bars — we make the
content fit. 375×667 (minus header, minus safe-area) is the design budget.
Everything above it (larger iPhones, Android) inherits the fix for free.

Concrete expression: onboarding step 3 was re-compacted until `Confirm & Start`
sat at y=499 instead of y=637 on SE. That is the standard this project holds
itself to.

### 2. Words beat symbols for older users

Three progress dots (`● ○ ○`) do not read as "step 1 of 3" to a 55-year-old.
Neither does an 8 px `D1` / `N1` label on a breadcrumb. Whenever we use an
abstract visual indicator, we pair it with a plain-English label of at least
10 px.

All progress dots in the app (onboarding, void/drink/leak forms) are
accompanied by `STEP X OF N` using the shared `common.stepOf` translation key.

### 3. Buttons must look like buttons

Text-only links ("Change", "Learn more") force a user to infer tappability
from color. Older users rely on visual affordance — borders, pills, filled
backgrounds. The timezone `Change` action on onboarding step 3 is a pill
button (rounded, bordered, subtle background) precisely because the original
text link read as a static label.

When a tap target is important, give it border + padding + color.

### 4. Remove chrome that isn't helping

The BottomNav shows three tabs: Home / Track / Diary. On the landing and
onboarding screens, Track is disabled and Diary shows a lock icon. None of
the three tabs help the user do the task they are there to do, and the
"locked" Diary actively raises anxiety ("why can't I access my diary?").

So we hide the BottomNav entirely when `!diaryStarted && pathname === '/'`.
The 60 px we reclaim is a side benefit — the real win is cognitive clarity.

Rule of thumb: if a UI element exists but isn't actionable in the current
state, prefer hiding over disabling, unless disabling teaches the user
something they need to learn.

### 5. Wall-of-text subtitles are worse than short subtitles

A 24-word explanation feels authoritative but causes older users to skim,
skip, or disengage. We write subtitles in ≤16 words and split ideas across
sentences (never across em-dashes — see the codebase's `no em-dashes` rule).
If an idea needs more words, demote it to a `?` help affordance, not the
subtitle.

### 6. Clinical correctness is non-negotiable

This is a medical diagnostic tool. A simpler UI that makes the clinical
meaning ambiguous is worse than a slightly more complex UI that keeps the
meaning exact. Examples of what we do **not** simplify away:

- The 5-step journey (D1 → N1 → D2 → N2 → D3) separates day and night
  phases because overnight nocturia is clinically distinct from daytime
  voids. Collapsing it to "Day 1 / Day 2 / Day 3" would hide that.
- "First morning void" (FMV), "double void", "sensation" labels are medical
  terminology the clinician reads. We do not replace them with softer
  everyday language in the data model.
- Volume calculations follow [IPC methodology](../.claude/projects/-Users-zhen-bladderdiary-patient/memory/ipc-calculations.md)
  exactly. UI presentation can simplify; the math cannot.

What we **do** simplify: the surrounding presentation — icons for
day/night, sun/moon semantics, plain-English step labels, above-the-fold CTAs.

## Rules of thumb when making changes

- **Minimum tap target**: 44×44 px (Apple HIG). Use `min-h-[44px]` on buttons.
- **Minimum body text**: 12 px (`text-xs`). Labels on decorative indicators
  can go to 10 px but never smaller.
- **Check iPhone SE (375×667) first**, not desktop.
- **One primary CTA per screen.** Secondary actions get less visual weight
  (text link, ghost button, smaller size).
- **Verify in browser, not by inference.** The preview tooling exists for
  this exact reason — before reporting a layout fix, measure the element's
  actual `getBoundingClientRect().top` against `window.innerHeight`.
- **Internationalize everything.** No hardcoded English strings. All three
  locales (en, fr, es) must ship together. No em-dashes in any locale.

## Decisions log

A dated record of meaningful design choices so future sessions can understand
the reasoning behind seemingly-small details.

### 2026-04-21 — Onboarding fold fix and older-user clarity pass

**Problem.** On iPhone SE (375×667), the `Confirm & Start` button on
onboarding step 3 sat 30 px below the fold with no scroll hint. Multiple
small issues compounded: 3-dot progress had no plain-English anchor,
`Change` timezone looked like a static label, 24-word subtitle wrapped
to 3 lines, 3-day preview card was 222 px, and a locked-Diary tab in the
BottomNav added anxiety.

**Commit.** [`4152ea4`](https://github.com/teamipc/bladderdiary-patient/commit/4152ea4).

**Changes.**

| Area | Before | After | Principle |
|---|---|---|---|
| `BottomNav` | Always visible | Hidden on landing/onboarding | §4 (remove unhelpful chrome) |
| Onboarding step 3 | `Confirm & Start` at y=637 (below fold) | At y=499 (above fold with Back visible) | §1 (CTA above fold) |
| Onboarding padding | `pt-12 pb-12` | `pt-6 pb-10` | §1 |
| Progress dots | Bare `● ○ ○` | Dots + "STEP X OF 3" label | §2 (words beat symbols) |
| Timezone "Change" | Text-only link | Outlined pill button | §3 (buttons look like buttons) |
| `dateSubtitle` | 24 words, 3 lines | 16 words, 2 lines | §5 (no wall of text) |
| 3-day preview | `p-4` / `py-2.5` per row | `px-3 py-2.5` / `py-1.5` per row | §1 (fit the budget) |
| Log forms (void/drink/leak) | Colored dots only | Dots + themed "STEP X OF N" | §2 |
| Journey tracker | 20 px circles with `D1`/`N1` text, 8 px labels | 24 px circles with ☀/🌙/✓ icons, 10 px labels | §2, §6 |
| Shared translation | `onboarding.stepOf` | `common.stepOf` | DRY |

**What we did not change.**

- The 5-step D1→N1→D2→N2→D3 model itself — it encodes clinical meaning (§6).
- Timeline inline `+` buttons between events — intentionally small; for power
  users who need to backfill a missed entry, not the primary log path.
- Day 1 celebration overlay and night-view hero — already follow the
  "big friendly button" pattern.
- Summary/export page — already had a clear back arrow, H1, labeled Help.

## When to revisit this document

Add a new entry to the decisions log whenever a change:

- Touches the landing, onboarding, or a log form
- Changes a primary CTA's position, size, label, or visibility
- Adds or removes chrome (nav, banners, FABs)
- Changes copy that a non-tech-savvy 50-year-old will read
- Makes a deliberate trade-off between clinical precision and ease of use

Small visual polish (color tweaks, spacing nudges, icon swaps) does not
warrant a log entry. Use judgment — the log should explain *why*, not
catalog every commit.
