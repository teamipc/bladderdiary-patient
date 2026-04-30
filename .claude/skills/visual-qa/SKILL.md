---
name: visual-qa
description: Visual aesthetic and layout QA for the patient app — render pages in a real browser, screenshot, inspect computed CSS, and fix issues across all 6 locales (en/fr/es/pt/zh/ar) and both LTR + RTL. Use this skill when the user asks for "visual QA", "design check", "look at the site", "RTL walkthrough", "check how it looks in <locale>", "is anything broken visually", or after any change that could affect layout, typography, or theming. Catches RTL physical-CSS leaks, text overflow in long-translation locales (PT, AR), font-fallback issues for non-Latin scripts (zh, ar), spacing inconsistencies, contrast/AA violations, and broken responsive breakpoints. Pairs with `i18n-sync` (copy-level translation fixes) and `learn-styling` (design-language reference).
---

# visual-qa (patient app — myflowcheck.com)

Real-browser visual QA. The skill that opens pages, looks at them, screenshots, measures, and fixes layout. Invoke whenever a change might break the visual experience — especially after i18n work, CSS edits, or component refactors.

## When to invoke

- **User-triggered**: "visual QA", "check the design", "RTL walkthrough", "how does <locale> look", "is anything visually broken".
- **Self-triggered (proactive)**: after editing `globals.css`, any `*.tsx` page or component, any `messages/<locale>.json` change that could lengthen strings, any new locale, any RTL-related change.
- **Don't invoke**: for pure logic/state changes (calculations, store, exports), backend-only changes, content-only article edits where layout is unchanged.

## Tools used

In order of preference. Fall back if the higher tool isn't available.

1. **`mcp__Claude_in_Chrome__*`** (preferred) — real Chrome browser. Use `navigate`, `computer` (screenshot/click/scroll), `read_page` (accessibility tree), `find` (natural-language element search), `tabs_context_mcp` to discover tabs. Best for visual fidelity.
2. **`mcp__Claude_Preview__preview_*`** — Next dev server tooling. Use `preview_start` (reads `.claude/launch.json`), `preview_screenshot`, `preview_snapshot` (a11y tree), `preview_inspect` (computed CSS), `preview_resize` (responsive). Faster startup but workspace-bound — sometimes attaches to a different project's dev server.
3. **Bash + curl** (fallback) — `nohup env PORT=NNNN npx next dev --turbo`, then `curl -s http://localhost:NNNN/<path> | grep ...`. No screenshots, but you can inspect the HTML and verify text rendering.

If the Chrome MCP says "not connected", retry once after 10 seconds — it usually recovers. If still down, fall back to Preview MCP, then to Bash. Never block on tool unavailability — pick the highest-fidelity option that works.

## Workflow

### Step 1: Boot dev server

```bash
# Kill any stale dev servers + lock
pkill -f "next dev" 2>/dev/null
sleep 1
rm -f .next/dev/lock
# Start fresh on a unique port
nohup env PORT=3050 npx next dev --turbo > /tmp/visual-qa.log 2>&1 & disown
sleep 14
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3050/en
```

If Preview MCP is configured (`.claude/launch.json`), use `preview_start` instead.

### Step 2: Define the route matrix

For this app, the meaningful visual surface per locale is roughly:

| Route | What it tests |
|---|---|
| `/<locale>` | Landing hero, IPC branding, Start CTA, footer |
| `/<locale>/diary` | Onboarding (age → unit → date) and timeline view |
| `/<locale>/summary` | Story timeline (drink/void dots), observations card, export buttons |
| `/<locale>/learn` | Hub: chip rail, latest reading grid, topic groups, glossary card |
| `/<locale>/learn/<topic>/<slug>` | Article: hero, prose, citations, DiaryCta, related |
| `/<locale>/learn/glossary` | Glossary index (when populated) |
| `/<locale>/help` | FAQ accordion |
| `/<locale>/privacy`, `/<locale>/terms` | Long-form legal — stress tests typography in long-translation locales |

For a full audit: 8 routes × 6 locales = 48 screens. For a fast smoke test: focus on 3 routes (landing + learn + one article) × 3 locales (en + ar for RTL + zh for non-Latin script).

### Step 3: Walk the matrix

For each (locale, route) pair, capture in this order:

1. **Take a full-page screenshot.** Look first, fix later — don't fixate on the first issue.
2. **Read the a11y tree** (`read_page` / `preview_snapshot`). Confirm headings hierarchy, landmark roles, visible text.
3. **Scan visually for the failure modes below.**
4. **Take a mobile-width screenshot** (375px × 667px). The app's primary form factor is mobile.
5. **For RTL locales (ar)**: also scroll the page to confirm dot positions, icon flips, and text alignment scroll cleanly.

### Step 4: Triage issues by failure mode

Score each finding **BLOCKER / MAJOR / MINOR**.

#### Failure modes to actively look for

**A. RTL physical-CSS leaks** (Arabic only)
- Text-aligned to physical left/right instead of `start`/`end`. Symptom: paragraph aligned to LTR side in Arabic page.
- Margin/padding using `ml-*`/`mr-*`/`pl-*`/`pr-*` instead of `ms-*`/`me-*`/`ps-*`/`pe-*`. Symptom: content hugs the wrong edge.
- Absolute positioning with physical `left:`/`right:` (or Tailwind `left-0`/`right-0`) instead of `inset-inline-start:`/`inset-inline-end:` (or `start-0`/`end-0`). Symptom: dropdowns, badges, close buttons on the wrong side.
- Inline `style={{ left: ... }}` for percent positioning. Symptom: timeline/scrubber dots flow LTR even in Arabic. Fix: `style={{ insetInlineStart: ... }}` and pair with a `[dir="rtl"]`-scoped translate flip if the element uses `translateX(-50%)` to center.
- Icons that should mirror in RTL: chevrons (`ChevronRight`/`ChevronLeft`/`ArrowRight`), back-arrows. The arrow visually means "forward", which is the inline-end direction. Wrap with a span or Lucide's `dir`-aware variant.
- `transform: translateX(-50%)` to center: physical, doesn't auto-flip. Either keep both axes OK by avoiding centering math, or add `[dir="rtl"] .x { transform: translateX(50%); }` in globals.css.

**B. Text overflow / wrap break** (especially PT, ZH, AR)
- Long PT translations break button widths. Symptom: button text wraps to 2 lines or overflows the chip.
- Tightly-spaced row of chips (`Latest reading`, `Browse by topic` chip rail) overflows in PT. Fix: `flex-wrap`, smaller chip padding, or line-clamp.
- Article titles longer in target language overflow `text-balance` budgets.
- Single-word ARIA labels OK; longer translated phrases may break visual rhythm.

**C. Font fallback for non-Latin scripts** (ZH, AR)
- Inter font doesn't ship Chinese or Arabic glyphs. The browser falls back to system fonts which may look heavier or lighter than Inter — verify visual weight is acceptable.
- Mixed Latin+CJK or Latin+Arabic strings (like "Powered by IPC" embedded in Chinese text) need consistent baseline. Inspect with `getComputedStyle` if the alignment looks off.
- Numerals: confirm Western Arabic digits (0-9) render in `ar` context (we forced this via copy, but confirm visually).
- If the visual weight is too thin, add `Noto Sans SC` and `Noto Naskh Arabic` to the font stack in `globals.css`.

**D. Contrast & accessibility**
- IPC palette text colors (text-ipc-700, text-ipc-500) on `bg-surface` — verify ≥ 4.5:1 for body text per WCAG AA. Use `preview_inspect` for computed RGB then a contrast checker.
- Button states: hover, active, disabled — all must clear AA on the chosen background.
- Focus rings: visible at all sizes, ideally 2px outset.

**E. Spacing / rhythm consistency**
- `py-`, `mb-`, `gap-` values should follow the IPC scale (mostly 4/6/8/12 increments). Off-scale values (e.g. `mb-7`) usually mean a one-off that doesn't compose.
- Section dividers between hero / story / observations should breathe equally.
- The footer should never butt against the BottomNav on mobile (verify with mobile screenshot).

**F. Responsive breakpoints**
- Default audit at 375px (iPhone SE) — primary form factor. Then 768px (iPad portrait). Then 1280px (desktop).
- The app is mobile-first; desktop is a wider center column with the same components. Long-text overflows show at the narrowest breakpoint first.
- Check that the Header stays sticky and the BottomNav stays fixed on scroll (key UX promise for the 50+ target user).

**G. Theming / dark mode**
- The app has a "nighttime mode" CSS class (`.nighttime-bg`) used for late-night logging. Verify all text remains readable in both states.

### Step 5: Fix in place

Most fixes are 1-2 lines:

- Physical → logical: `ml-3` → `ms-3`, `pl-5` → `ps-5`, `text-left` → `text-start`, `right-0` → `end-0`, `left-0` → `start-0`, `border-l-` → `border-s-`.
- Inline `style={{ left: x }}` → `style={{ insetInlineStart: x }}`.
- `translateX(-50%)` centering with logical positioning: add a `data-rtl-flip` attribute and a globals.css rule `[dir="rtl"] [data-rtl-flip="x"] { transform: translateX(50%); }`.
- Long-text overflow: add `flex-wrap`, reduce `px-` on chips, or use `text-pretty` / `line-clamp-2`.
- Icon mirror: wrap chevron in `<span className="rtl:scale-x-[-1] inline-block">` (Tailwind RTL variant).

### Step 6: Re-screenshot to verify

After every fix, re-render and re-screenshot the affected route. Confirm the failure mode is gone and no regression appeared.

### Step 7: Report

Produce a short list:

```
- LOCALE/ROUTE — issue → fix (file:line) — verified
```

Group by severity. If anything is left as a known issue, flag it with the reason (e.g. "needs design input", "blocked on backend", "not in scope").

## Common patterns by component

### Header
- Language switcher dropdown should anchor to the inline-end (right in LTR, left in RTL). Use `end-0`, not `right-0`.
- Globe icon stays as-is (it's directional-neutral).
- Locale label uppercase: `EN`, `FR`, `AR` — but in RTL the surrounding chrome should still read RTL.

### Footer
- Email link must be `dir="ltr"` even inside an RTL page (Latin emails always read LTR).
- Privacy/Terms/Help separator dots `·` flow naturally in both directions.

### DiaryCta (article inline)
- Card centered, button arrow is `ArrowRight` — should mirror to point left in RTL.
- `bg-gradient-to-br` is direction-agnostic but reads "from-top-left to-bottom-right" in LTR which inverts visually in RTL — usually fine, but check.

### DrinkVoidTimeline
- The drink/void dots are absolutely positioned by percent. The dots are conceptually "morning to bedtime" — in RTL the natural direction is right-to-left, so the dots should flow that way too.
- Inline `style={{ left: pct + '%' }}` is the leak — change to `insetInlineStart`. The `-translate-x-1/2` centering also needs the RTL flip rule.

### Onboarding flow
- The "Confirm & Start" button uses `ChevronRight` to indicate "proceed". In RTL this should point left (inline-end direction). Use the rtl: scale-x-[-1] trick or a directional component.

### Forms (LogVoidForm, LogDrinkForm, LogLeakForm)
- Step indicator dots are layout-neutral.
- "Previous step" / "Next step" buttons use chevrons — same RTL flip rule.
- Volume slider: physical "more = right" in LTR. In RTL conventionally still flows the same direction (volume up is up, time forward is forward). For now keep as-is, but flag if the user reports confusion.

## What NOT to do

- **Don't refactor for fun.** If a component looks fine in all 6 locales × 2 directions, leave it.
- **Don't translate copy here.** That's `i18n-sync`'s job. If you find an English string in a non-English render, the fix is in the messages file, not here.
- **Don't change brand colors or the IPC palette** without explicit user approval. The palette is in `globals.css @theme inline`.
- **Don't lecture the user about RTL "best practices"** when shipping a fix — just fix it and report.

## Reference

- Sibling skill: `learn-styling/SKILL.md` — `/learn` design language, typography, editorial layout
- Sibling skill: `i18n-sync/SKILL.md` — UI string translation
- `src/i18n/seo.ts` — `LOCALE_DIR` defines which locales render `dir="rtl"`
- `src/app/globals.css` — IPC palette, base styles, prose styles, nighttime-mode
- `src/app/[locale]/layout.tsx` — wires `<html dir>` from the locale
- Tailwind RTL variant: `rtl:` prefix flips properties only in RTL contexts (e.g. `rtl:scale-x-[-1]`)

## Quick-start command (copy-paste)

```bash
# Start fresh dev server
pkill -f "next dev" 2>/dev/null; sleep 1
rm -f .next/dev/lock
nohup env PORT=3050 npx next dev --turbo > /tmp/visual-qa.log 2>&1 & disown
sleep 14
echo "Server up at http://localhost:3050"
# Smoke check critical routes
for L in en ar zh pt; do
  for P in "" "/learn" "/learn/post-prostatectomy/pee-a-lot-after-surgery" "/diary" "/summary"; do
    curl -s -o /dev/null -w "$L$P: %{http_code}\n" "http://localhost:3050/$L$P"
  done
done
```

Then connect the browser MCP and walk the routes.
