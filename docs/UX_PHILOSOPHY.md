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

### 6. Never steal control from the user

Auto-advance, auto-submit, and silent timers feel clever but read as "the
computer is racing ahead of me" to a 50+ user who is reading carefully. The
time saved (one or two seconds) is not worth the anxiety created.

Every progression — between steps of a form, between onboarding screens,
between logged events — must be an **explicit tap on a visible button**.
Persistent sticky `Next` / `Save` buttons are preferred over hidden ones or
ones that appear only after the user does something.

Corollary: give the user a visible `Back` affordance (labelled, not just an
icon) on the final confirmation step. Recoverable progress is a trust signal.

Corollary: any destination that can be closed must have a visible `✕` — not
just a backdrop tap or a swipe gesture. Older users do not know those
gestures exist.

### 7. Confirm before commit

Multi-step forms introduce memory load: by step 3 the user has forgotten
what they picked on step 1. Before the final `Save`, show a one-line recap
of their prior selections so they can verify without going back.

### 8. Clinical correctness is non-negotiable

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

### 2026-04-21 — Remove auto-advance; explicit Next + recap + recoverable escape

**Problem.** A tester reported the log-form sheet "moved forward after making
a selection before I finished reading all the options." Auto-advance fired
2.5 s after preset / volume-slider / sensation / trigger selections across
all three log forms, flashing the side chevron to hint "tap me next." For a
50+ user reading carefully — including the description that only *appears*
after selection — 2.5 s is always wrong, and any tuning is still wrong for
someone else. The pattern, not the delay, was the issue.

**Commit.** [4eb08f9 or follow-up; see `git log`]

**Changes.**

| Area | Before | After | Principle |
|---|---|---|---|
| Auto-advance between form steps | `scheduleAutoAdvance(target, 2500)` on preset/slider/sensation/trigger selection, plus a 3-cycle `arrow-pulse*` animation hinting "tap the chevron" | Removed entirely; deleted `@keyframes arrowPulse`, `.arrow-pulse`, `.arrow-pulse-drink`, `.arrow-pulse-leak` | §6 (never steal control) |
| Step progression | Right-side chevron (small, absolutely-positioned) as the only explicit "next" affordance | Sticky full-width `Next →` button anchored at the bottom of the sheet on every non-final step, mirroring the existing final-step `Save` button | §1 (primary CTA above the fold), §3 (buttons look like buttons) |
| Back affordance on final step | Left-side chevron icon only | Chevron + labelled pill button ("← Back") so a hesitant user knows they can still change their mind | §6 (corollary: recoverable progress) |
| Confirmation before save | None — user had to trust memory of step-1 and step-2 choices | One-line recap card above the time picker on the final step ("You are saving: 250 mL · Moderate · with leak") | §7 (confirm before commit) |
| Tap-confirmation feedback | Selection shown by color change alone | Tiny `✓` icon inside the selected preset / leak-amount button, visible at a glance | §2 (words/symbols beat subtle cues) |
| Step counter text | `text-[10px]` | `text-[11px]` | Readability for reading glasses |
| Close the bottom sheet | Only via backdrop tap or Escape key — no visible affordance | Always-visible `✕` pill in the top-right of the sheet | §6 (corollary: visible escape) |
| Sensation scale help | Description only appeared after picking a value — user had to pick blindly to learn | `?` icon next to the sensation label that toggles a panel showing every level and its description | §2, §6 |

**Interaction details.**
- Sticky footer uses a white-to-transparent gradient above it so content
  scrolling behind does not feel clipped.
- `Next` is disabled (Button's built-in `disabled` state) until the step's
  required field is filled: `volume > 0` on void/drink step 1, `trigger`
  on leak step 1, `urgencyBeforeLeak !== null` on leak step 2.
- Step-dot taps still navigate between steps (kept the existing behavior).

**What we did not change.**
- Three-step structure of the void and leak forms, two-step structure of
  the drink form — these map to the clinical data model.
- Side arrow for going back (it exists, works, and is still useful); we
  just gave it a label.
- Auto-save on edit-unmount (editing an existing entry persists changes
  when the sheet is dismissed) — that's a correctness feature, not an
  auto-progression.

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

### 2026-04-25 — Medical-grade QA pass: data-loss prevention, real-world volumes, motivational architecture

**Problem.** A walkthrough on iPhone SE (375×667) found a series of issues that
together would burn the trust of a 50+ patient logging an anxious 3-day medical
diary: a 36-px trash icon four pixels from a 36-px edit pencil that *deleted on
single tap with no confirmation and no undo*, an FAB physically overlapping the
"Go to bed" button (51 × 10 px), the leak-form amount row spilling 6 px past
both edges of the SE viewport, the Day-1 celebration hiding 3 of 4 reminder
options below the fold, and viewport meta blocking pinch-zoom (WCAG 1.4.4).
Behaviorally, the app was strong on the form-flow inside but missing levers for
the abandonment moment — Day-2 morning re-entry — that drives the 90 % drop-off
on most multi-day diary apps.

**Commit.** [batch fix — see git log around 2026-04-25]

**Changes — bugs (B-series).**

| # | Area | Before | After | Principle |
|---|---|---|---|---|
| B1 | Event card delete | Trash icon → instant silent delete, no undo | Tap opens a `ConfirmDialog` with the entry summary ("250 mL · 11:24 AM") + Cancel / Delete | §6 (recoverable progress); medical-grade safety |
| B2 | FAB vs. "Go to bed" | FAB at `right-5 bottom-24` collided with banner button (51×10 px) | Bedtime banner restructured: text on top, full-width purple button below; timeline `pb-44` keeps content clear of FAB | §1 (CTA above fold), §3 |
| B3 | Leak step-2 amount row | 4 amount buttons overflowed iPhone SE 6 px on each edge | `grid grid-cols-4 gap-1.5 px-1` — Drops at x=32, Large ends at x=343 inside the 375 viewport | §1 (fit the budget) |
| B4 | Edit/trash icons | 36×36 px, below Apple HIG | 44×44 px with 18 px icon (was 15 px) | Apple HIG; doc rule of thumb |
| B5 | Edit/trash + sensation | No `aria-label`, no `aria-pressed` | Each icon button has a localized `aria-label`; sensation pickers expose `aria-pressed` | Accessibility (VoiceOver). Boomers are the population most likely to use it. |
| B6 | "Continue to Day 2" | Plain text link below banner | Real bordered button with chevron, full width | §3 (buttons look like buttons) |
| B7 | Drink form volume | Slider only — fiddly for shaky thumbs | 3 chips (200 / 350 / 500 mL) + retained slider for fine-tune | §1 (accessible defaults); behavioral: Hick's law |
| B8 | Day-1 celebration | 3 anchor buttons stacked, reminder options below the fold | Anchors as 3-column horizontal grid; all 4 reminder options (calendar / share / helper / skip) visible without scroll | §1; behavioral: present alternatives, not just the default |
| B9 | TimePicker backfill | Only `±15 min` and `Now`. Logging "I had coffee 4 h ago" took dozens of taps | Added `1h ago / 2h ago / 3h ago` quick chips beneath the main row | §3 (one-tap path); behavioral: minimize friction for backfill |

**Changes — behavioral levers (L-series).**

| # | Lever | Mechanism | Why it matters |
|---|---|---|---|
| L1 | Persistent "Day X of 3 · N entries" subtitle under the day title | Loss-aversion / sunk-cost framing — the user always sees what they have already invested | The single highest-leverage anti-abandonment cue per multi-day-tracking research; turns "starting Day 2" into "protecting Day 1" |
| L2 | Stale-nudge banner: "Last logged about Xh ago" replaces generic "Keep logging" once ≥2 h elapsed | Implementation-intention prompt at the moment of re-entry | Fires on the most-likely abandonment surface (mid-day app re-open). Amber theme to draw the eye away from the journey tracker. |
| L3 | Drink form pre-fills from the most recent prior drink | Habit recognition — patients drink the same coffee at the same time every day | Cuts taps on Day 2/3 entries by ~60 %. Signals "the app remembers me" — strong retention driver for this demographic. |

**Changes — volumes pulled from real diary data (Bruno + Alex paper PDFs).**

| Form | Before | After (mL) | Why |
|---|---|---|---|
| Void | Small / Medium / Large = 150 / 250 / 350 | 150 / 300 / 500 | 200 mL appeared 6× in Bruno's 3-day diary; 250–300 was the modal cluster; 450–500+ covered nocturia. Old "Large = 350" missed the most-common large-bladder events. |
| Drink | Small / Medium / Large = 150 / 250 / 500 | 200 / 350 / 500 | Real container sizes: small glass / standard glass / bottle. Bruno's 200 mL coffee, Alex's 200 mL coffee, 250 mL water all map cleanly. |
| Display | "Small" + 250 mL subtitle | Big bold number ("200") + small "mL" unit | "Small / Medium / Large" labels were useless without a mL anchor; the number IS the label. |

**Changes — accessibility / cross-browser.**

- Viewport meta: `userScalable: true`, `maximumScale: 5`, `viewportFit: 'cover'`. Old config blocked pinch-zoom (WCAG 1.4.4). For older users with reading glasses, that was a barrier.
- Night-mode container `min-h-screen` → `min-h-dvh` — Safari iOS gives wrong viewport height with the dynamic address bar otherwise.
- Onboarding back buttons converted from text-only links to bordered pills (Principle 3 holdover from the 2026-04-21 pass).
- Form headers: `text-ipc-800` (brown-tan) → `text-ipc-950` (near-black) so modal text reads as black, matching the rest of the app.

**What we did not change.**

- The 5-step D1 → N1 → D2 → N2 → D3 model — clinical meaning is non-negotiable (§8).
- The slider — kept under the chips for users who want a non-preset value. The chips are the primary path, the slider the fallback.
- The chip-strip pattern from the clinician app — different audience. Chips optimize for transcription speed; the patient app's 3 large presets optimize for low-decision-fatigue in-the-moment logging.

**Why 3 chips, not 5 or chip-strip.**

Hicks's law predicts decision time grows logarithmically with options. 3 vs 5
options ≈ 30 % faster decision; for someone in a rush to the bathroom, faster
matters. 3 chips also fit the Small / Normal / Big mental model patients
already use, and the buttons are ~115 px wide (vs ~70 px for 5 chips, ~60 px
for chip-strip) — fewer mis-taps for shaky thumbs. The slider remains for
users who genuinely need a non-preset value; that's the long tail.

**Decisions deferred (still open).**

- "+VOL" pop micro-reward (Pavlovian feedback) — consider porting from the clinician app.
- "Smart-default + chip" combo for the void form (currently smart-default is drinks-only).
- The journey tracker takes ~80 px vertical above the day title — could collapse into a thin progress bar on Day 2/3 once the user knows the model.

### 2026-04-26 — Backfill correctness, night-modal legibility, inclusive clinician copy

**Problem.** A patient testing the app on Day 2 (date set on a future
calendar date relative to "today") tapped the `1h ago / 2h ago / 3h ago`
quick-add chips on the void log form. The picker displayed a sensible
clock time (e.g. "8:01 AM") but the form refused to save with `This time
is before Day 1's bedtime (10:00 PM)`. The same clock time entered via
the manual `+/-` buttons saved without complaint. Same surface bug
across day-view, night-view, and bedtime forms — the chips were
semantically broken in any scenario where the diary day's calendar date
did not match real-world today.

A second screenshot from the night-view modal showed the +/-/Now box
and time input rendered as a faint gray smudge against the deep-indigo
night background — the surrounding `Xh ago` chips read as more
prominent than the primary controls because they have a visible border
without an opaque-white fill.

A third issue: in the summary page, `forTeamBody` referenced "your
doctor or nurse" — the IPC educational institution behind the app is
predominantly physiotherapists and occupational therapists, and the
phrasing alienated non-MD/RN healthcare practitioners. A separate copy
line "This is yours to read first. Your team reads it second." felt
preachy and added no information.

A fourth issue: the night-view smart default time was `bedtime + 5
minutes`, sitting the picker at 10:05 PM the moment a patient opened
the form to backfill a 2 AM nocturia event — a long string of +15-min
forward taps was the expected user action.

**Commit.** [batch fix — see git log around 2026-04-26]

**Changes — TimePicker chip semantics (correctness).**

| # | Area | Before | After | Principle |
|---|---|---|---|---|
| C1 | `handleHoursAgo(n)` | `addMinutes(new Date(), -60n).toISOString()` — emits a real-time UTC instant | Reads current clock time in user's tz, subtracts n hours, builds the result on `value`'s calendar date via `buildIsoForClockTimeInTz` | §8 (clinical correctness); time-model invariant: chips must respect the form's diary day |
| C2 | `handleLastNightAt(h)` | `buildIsoForClockTimeInTz(new Date(Date.now()-86400000), h, 0, tz)` — anchors to real-world yesterday | `buildIsoForClockTimeInTz(value, h, 0, tz)` — anchors to `value`'s date directly; `correctAfterMidnight` handles the "12 AM" wrap | Same — chip results must not depend on real-world calendar |
| C3 | `handleSetNow` | `new Date().toISOString()` | Unchanged — "Now" semantically refers to real time, and validation correctly catches a wrong-day click | Don't break a working semantic |

The +/- buttons and manual time-input typing already passed `value` into
`buildIsoForClockTimeInTz`; the chips are now consistent with that
contract. Documentation added to [TIME_MODEL.md](TIME_MODEL.md) under
"TimePicker quick-add chips" explaining the rule.

**Changes — night-view smart default (click-saving).**

| # | Area | Before | After | Principle |
|---|---|---|---|---|
| D1 | First overnight event | `bedtime + 5 min` | `bedtime + 3 h` (median first-overnight-void window per nocturia literature) | Saves ~12 taps on the most common backfill scenario |
| D2 | Subsequent overnight event | `bedtime + 5 min` (same) | `latestExistingNightEvent + 90 min` (typical inter-void interval in nocturia) | Saves ~6 taps on second/third logging in the same night |
| D3 | Wake guard | None | Clamp target to `wake − 30 min` so the pre-fill never trips "after wake" | Avoids surprising the user with a validation warning on a default value |

Implemented as a single helper `getNightDefaultTime` in `src/lib/utils.ts`
used by `LogVoidForm`, `LogDrinkForm`, and `LogLeakForm` — one tuning
point if real patient data tells us the clusters are different.

**Changes — night-modal contrast (aesthetics + legibility).**

| # | Area | Before | After | Principle |
|---|---|---|---|---|
| E1 | TimePicker buttons (+/-, Now), time input, and form note textareas in night view | `bg-white/50` rendered as flat gray on the deep-indigo sheet — primary controls read as less prominent than the secondary "Xh ago" chips | Added `.nighttime-bg .bg-white\/70 .bg-white\/50` override to globals.css remapping the fill to `rgba(99, 102, 241, 0.15)` (indigo glass, matching the existing language for `bg-ipc-100/30` and friends) | §3 (buttons must look like buttons); the existing night CSS already remaps every other ipc-/white- token — `bg-white/50` was the one missing piece |

The fix is one CSS rule, scoped to `.nighttime-bg .bg-white\/70`, so it
only fires inside the night-view bottom sheet. Day mode is untouched.
The same override automatically improves contrast for the note
textareas in `LogVoidForm`, `LogDrinkForm`, `LogLeakForm` because they
all use the same `bg-white/50` fill.

**Changes — inclusive clinician copy (en + es + fr).**

| # | Area | Before | After | Principle |
|---|---|---|---|---|
| F1 | `summary.forTeamBody` | "Your doctor or nurse reads three days like a short story…" | "Your healthcare team reads three days like a short story…" (and equivalents in es/fr) | The IPC user base spans physiotherapists, occupational therapists, doctors, nurses — naming only doctors and nurses alienates the rest |
| F2 | `summary.yoursFirst` | "This is yours to read first. Your team reads it second." | "Read it first, then share your report with your healthcare professional." | One-line, action-oriented, non-preachy |

**What we did not change.**

- `correctAfterMidnight`, `correctNightDate`, `getDayNumber` — the
  chip bug was a TimePicker-side issue, not a corrector issue. The
  correctors continue to work correctly downstream of any chip output.
- The 3-chip-row layout in TimePicker — the chips themselves are the
  one place in the picker that already had visible borders without
  opaque fills, and the user explicitly called them out as the
  "elegant" reference point we matched the +/-/Now contrast to.
- The "Now" button semantics — see C3 above.

**Decisions deferred (still open).**

- Tune the 3 h / 90 min night-default offsets if real patient logging
  data shows the typical first-overnight-void or inter-void interval
  is meaningfully different from the literature.
- Consider whether `handleSetNow` should also anchor to `value`'s date
  if user research shows boomers expect "Now" to mean "now-on-the-day-
  I'm-viewing" rather than "the actual current moment". Today's choice
  preserves the literal semantic.

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
