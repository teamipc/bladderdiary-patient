/**
 * Haptic feedback utility for the patient bladder diary.
 *
 * Phase 15 MI-02. A short 15ms haptic pulse confirms a successful log save.
 *
 * Gated by:
 *   1. SSR safety: navigator must exist (static export build runs this code
 *      at build time during pre-rendering; navigator is undefined there).
 *   2. Capability detection: navigator.vibrate must be a function (iOS Safari
 *      and desktop Chrome do not expose this API; we no-op gracefully).
 *   3. User preference: useDiaryStore.getState().hapticEnabled must be true
 *      (default true; togglable in /help via HapticSettings).
 *
 * Imperative store read (getState, not the hook) because the call site is
 * non-reactive: we just need the current value, not a re-render subscription.
 */

import useDiaryStore from './store';

export function fireSaveHaptic(): void {
  if (typeof navigator === 'undefined') return;
  if (typeof navigator.vibrate !== 'function') return;
  const enabled = useDiaryStore.getState().hapticEnabled;
  if (!enabled) return;
  navigator.vibrate(15);
}
