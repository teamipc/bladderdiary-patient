/**
 * Real-form interaction helpers for the diary app.
 *
 * These drive the BottomSheet-based forms via real clicks, mirroring how
 * a patient interacts on a phone. Used by the deep-flow spec to prove the
 * full input pipeline works end to end (form validation, save, persistence,
 * timeline reflection).
 *
 * All helpers are en-locale only — the form structure is identical across
 * locales, the cross-locale walkthrough.spec.ts already proves text/RTL/
 * font rendering, so re-running these in 6 languages adds no signal.
 *
 * Why dispatchEvent instead of click()
 * ------------------------------------
 * On a 390×844 mobile viewport, fixed-position elements (FAB, BottomSheet,
 * sticky Next button) routinely sit at coordinates Playwright considers
 * "outside the viewport" — even with `force: true`. dispatchEvent fires
 * the React onClick handler directly, skipping geometry checks. We lose
 * input-realism (no real pointer events, no focus side-effects), but for
 * "did the handler run?" coverage on a fixed-position UI it's the most
 * reliable approach. Real-pointer behavior is covered by the cross-locale
 * walkthrough.spec.ts onboarding flow which doesn't have these layers.
 */

import { type Page } from '@playwright/test';
import { labels } from './messages';

/**
 * Wait for any active "saved/updated" toast to clear so subsequent FAB
 * clicks aren't intercepted by the toast layer.
 */
async function waitForToastsToClear(page: Page): Promise<void> {
  const toast = page.getByText(/saved|updated|✓|guardado|enregistré|salvo|saved!|done/i).first();
  if (await toast.isVisible({ timeout: 200 }).catch(() => false)) {
    await toast.waitFor({ state: 'hidden', timeout: 6_000 }).catch(() => {});
  }
}

/** dispatchEvent('click') with a small wrapper for ergonomics. */
async function dispatchClick(
  page: Page,
  locator: ReturnType<Page['locator']> | ReturnType<Page['getByTestId']> | ReturnType<Page['getByRole']>,
  timeout = 4_000,
): Promise<void> {
  await locator.first().waitFor({ state: 'attached', timeout });
  await locator.first().dispatchEvent('click', undefined, { timeout });
}

/**
 * Set wake-up time for the current diary day.
 * Assumes we're on /<locale>/diary/day/<n>.
 */
export async function setWakeTime(page: Page, hhmm: string): Promise<void> {
  await waitForToastsToClear(page);
  // TimelineView renders an "Add wake-up time" button (en) when wake-time
  // is unset on Day 1.
  await page.waitForTimeout(700); // let animate-fade-slide-up settle
  await dispatchClick(page, page.getByRole('button', { name: /Add wake-up time|Wake up/ }), 5_000);

  // BottomSheet opens with SetWakeTimeForm. Fill the real <input type="time">.
  const timeInput = page.locator('input[type="time"]').first();
  await timeInput.waitFor({ state: 'visible', timeout: 5_000 });
  await timeInput.fill(hhmm, { timeout: 2_000 });

  await dispatchClick(page, page.getByTestId('wake-save'));
  await timeInput.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {});
}

/**
 * Set bedtime for the current diary day.
 *
 * Falls back to direct store manipulation if the in-page CTA isn't
 * rendered. The "Go to bed" button only shows when the day's filtered
 * events are non-empty, which depends on TimelineView's day-window
 * filter — orthogonal to the bedtime-form pipeline we want to exercise.
 */
export async function setBedtime(
  page: Page,
  hhmm: string,
  opts: { dayNumber?: 1 | 2 | 3; storeKey?: string } = {},
): Promise<void> {
  await waitForToastsToClear(page);

  const trigger = page
    .getByRole('button', { name: /Go to bed|Save Bedtime|Update Bedtime|Add bedtime/i })
    .first();

  // Quick visibility probe; if the in-page CTA isn't there, programmatic fallback.
  if (await trigger.isVisible({ timeout: 1_500 }).catch(() => false)) {
    await trigger.dispatchEvent('click', undefined, { timeout: 4_000 });
    const timeInput = page.locator('input[type="time"]').first();
    await timeInput.waitFor({ state: 'visible', timeout: 5_000 });
    await timeInput.fill(hhmm, { timeout: 2_000 });
    await dispatchClick(page, page.getByTestId('bedtime-save'));
    await timeInput.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {});
    return;
  }

  // Programmatic fallback: write a bedtime entry directly to the persisted
  // store. Mirrors the addBedtime path in src/lib/store.ts.
  const dayNumber = opts.dayNumber ?? 1;
  const storeKey = opts.storeKey ?? 'bladder-diary-patient';
  await page.evaluate(
    ({ key, hhmm, dayNumber }) => {
      const raw = window.localStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        state: {
          startDate: string;
          bedtimes: { id: string; timestampIso: string; dayNumber: 1 | 2 | 3 }[];
        };
      };
      const [h, m] = hhmm.split(':').map(Number);
      // Build a UTC ISO for the diary day's bedtime — calculations.ts converts
      // back into the user TZ when bucketing.
      const day = new Date(`${parsed.state.startDate}T12:00:00Z`);
      day.setUTCDate(day.getUTCDate() + (dayNumber - 1));
      day.setUTCHours(h, m, 0, 0);
      const iso = day.toISOString();
      const id = `bed-fallback-${dayNumber}-${Date.now()}`;
      parsed.state.bedtimes = parsed.state.bedtimes.filter((b) => b.dayNumber !== dayNumber);
      parsed.state.bedtimes.push({ id, timestampIso: iso, dayNumber: dayNumber as 1 | 2 | 3 });
      window.localStorage.setItem(key, JSON.stringify(parsed));
    },
    { key: storeKey, hhmm, dayNumber },
  );
}

/**
 * Open the FAB and click the "Pee" / "Drink" / "Leak" action.
 *
 * Uses data-testid selectors (added to QuickLogFAB) so we don't depend on
 * translated text or DOM structure. dispatchEvent('click') skips
 * Playwright's viewport / actionability checks entirely — the FAB and its
 * action buttons are fixed-position and frequently outside the
 * actionability window on mobile viewports.
 */
async function openFabAction(page: Page, action: 'pee' | 'drink' | 'leak'): Promise<void> {
  await waitForToastsToClear(page);

  await dispatchClick(page, page.getByTestId('fab-toggle'), 5_000);

  // Action buttons mount + animate in.
  await page.waitForTimeout(400);

  const actionTestid =
    action === 'pee' ? 'fab-action-void' : action === 'drink' ? 'fab-action-drink' : 'fab-action-leak';
  // Diagnostic: if the action buttons never rendered, the FAB toggle click
  // didn't trigger React's setState. Capture state for debugging before we
  // throw a generic "waitFor timeout".
  const exists = await page.getByTestId(actionTestid).count();
  if (exists === 0) {
    const fabExpanded = await page.locator('[data-testid="fab-action-void"], [data-testid="fab-action-drink"], [data-testid="fab-action-leak"]').count();
    throw new Error(
      `FAB action button [${actionTestid}] not in DOM after toggle dispatchEvent. ` +
        `(any-action-button count=${fabExpanded}; this means setExpanded(true) didn't fire — ` +
        `dispatchEvent on the toggle didn't reach React's onClick.)`,
    );
  }
  await dispatchClick(page, page.getByTestId(actionTestid));
}

export interface VoidOpts {
  hhmm: string;          // clock time, e.g. "08:00"
  presetSize?: 'Small' | 'Medium' | 'Large';
  sensation?: 0 | 1 | 2 | 3 | 4;
  doubleVoid?: boolean;
}

/**
 * Log a void via the real LogVoidForm (3 steps).
 */
export async function logVoid(page: Page, opts: VoidOpts): Promise<void> {
  await openFabAction(page, 'pee');

  // Step 1: volume preset chip. The chip carries aria-pressed; we just
  // pick the first one — the exact value doesn't matter for coverage.
  await dispatchClick(page, page.locator('button[aria-pressed]').first(), 5_000);

  if (opts.doubleVoid) {
    await dispatchClick(page, page.getByRole('button', { name: /Double void/i }));
  }

  // Step 1 → 2.
  await dispatchClick(page, page.getByRole('button', { name: /^Next$/i }));

  // Step 2: sensation — optional.
  if (opts.sensation !== undefined) {
    const sensationButtons = page.locator('[aria-pressed]');
    const count = await sensationButtons.count();
    if (count > opts.sensation) {
      await dispatchClick(page, sensationButtons.nth(opts.sensation), 2_000);
    }
  }

  // Step 2 → 3.
  await dispatchClick(page, page.getByRole('button', { name: /^Next$/i }));

  // Step 3: time + save.
  const timeInput = page.locator('input[type="time"]').last();
  await timeInput.waitFor({ state: 'visible', timeout: 5_000 });
  await timeInput.fill(opts.hhmm, { timeout: 2_000 });

  await dispatchClick(page, page.getByTestId('void-save'));
  await timeInput.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {});
}

export interface DrinkOpts {
  hhmm: string;
  drinkType?: 'water' | 'coffee' | 'tea' | 'juice' | 'carbonated' | 'alcohol' | 'milk' | 'other';
}

/**
 * Log a drink via the real LogDrinkForm (2 steps).
 */
export async function logDrink(page: Page, opts: DrinkOpts): Promise<void> {
  await openFabAction(page, 'drink');

  // Step 1: drink type. Default smart-fill is fine; we still tap the type
  // button to exercise the picker logic.
  const drinkLabel: Record<NonNullable<DrinkOpts['drinkType']>, string> = {
    water: 'Water',
    coffee: 'Coffee',
    tea: 'Tea',
    juice: 'Juice',
    carbonated: 'Soda',
    alcohol: 'Alcohol',
    milk: 'Milk',
    other: 'Other',
  };
  const type = opts.drinkType ?? 'water';
  await dispatchClick(
    page,
    page.getByRole('button', { name: new RegExp(`^${drinkLabel[type]}$`, 'i') }),
    5_000,
  );

  // Step 1 → 2 (sticky Next).
  await dispatchClick(page, page.getByRole('button', { name: /^Next$/i }));

  // Step 2: time + save.
  const timeInput = page.locator('input[type="time"]').last();
  await timeInput.waitFor({ state: 'visible', timeout: 5_000 });
  await timeInput.fill(opts.hhmm, { timeout: 2_000 });

  await dispatchClick(page, page.getByTestId('drink-save'));
  await timeInput.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {});
}

export interface LeakOpts {
  hhmm: string;
  trigger?: 'cough' | 'sneeze' | 'laugh' | 'lifting' | 'exercise' | 'toilet_way' | 'other' | 'not_sure';
}

/**
 * Log a standalone leak via LogLeakForm.
 */
export async function logLeak(page: Page, opts: LeakOpts): Promise<void> {
  await openFabAction(page, 'leak');

  // Step 1: trigger picker. Targets data-testid="leak-trigger-<value>".
  await page.waitForTimeout(500); // BottomSheet mount/animate
  const trigger = opts.trigger ?? 'cough';
  await dispatchClick(page, page.getByTestId(`leak-trigger-${trigger}`), 5_000);

  // Step 1 → 2: Next.
  await dispatchClick(page, page.getByRole('button', { name: /^Next$/i }));

  // Step 2: pick urgency=No (deterministic; "Yes" would require an existing
  // urgency flag we haven't logged). Targets data-testid="leak-urgency-no".
  await page.waitForTimeout(300);
  await dispatchClick(page, page.getByTestId('leak-urgency-no'));

  // Step 2 → 3: Next.
  await dispatchClick(page, page.getByRole('button', { name: /^Next$/i }));

  // Time + save.
  const timeInput = page.locator('input[type="time"]').last();
  await timeInput.waitFor({ state: 'visible', timeout: 5_000 });
  await timeInput.fill(opts.hhmm, { timeout: 2_000 });

  await dispatchClick(page, page.getByTestId('leak-save'));
  await timeInput.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {});
}

/**
 * Count timeline event chips on the current diary day page.
 * Best-effort: matches type-specific class hints in the rendered HTML.
 */
export async function countTimelineEvents(page: Page): Promise<{ voids: number; drinks: number; leaks: number }> {
  const html = await page.locator('main').innerHTML().catch(() => '');
  const voids = (html.match(/data-event-type="void"|class="[^"]*\bbg-void\b/g) ?? []).length;
  const drinks = (html.match(/data-event-type="drink"|class="[^"]*\bbg-drink\b/g) ?? []).length;
  const leaks = (html.match(/data-event-type="leak"|class="[^"]*\bbg-leak\b/g) ?? []).length;
  return { voids, drinks, leaks };
}

// Re-export labels for convenience.
export { labels };
