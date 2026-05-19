'use client';

import { useCallback } from 'react';
import useReducedMotion from './useReducedMotion';

/**
 * Module-level feature detection for the View Transitions API.
 *
 * Computed ONCE at module load (not on every render or every call).
 * SSR-safe: during server-render `document` is undefined, so the
 * constant evaluates to `false`, and any consumer of the hook
 * degrades to direct callback invocation on the server.
 *
 * Browser support at time of writing (Phase 17 MOT-03):
 *   - Chrome 111+ (Mar 2023)
 *   - Safari 18+  (Sep 2024)
 *   - Firefox 127+ (Jun 2024)
 *
 * Older browsers fall through to direct callback invocation — the
 * page-to-page keyframe (PageTransitionWrapper + .animate-page-fade-in)
 * is the universally-supported visual transition mechanism. The View
 * Transitions API here is opportunistic, layering native browser
 * snapshot/blend on top when available.
 */
const SUPPORTS_VIEW_TRANSITIONS =
  typeof document !== 'undefined' && 'startViewTransition' in document;

/**
 * Minimal type for the document.startViewTransition method. The
 * lib.dom.d.ts in older TypeScript releases does not yet ship this
 * surface; we narrow inline rather than augmenting Document globally
 * because the wrap helper is the only consumer.
 */
type ViewTransitionDocument = Document & {
  startViewTransition: (callback: () => void) => unknown;
};

/**
 * Canonical helper for wrapping a state-change callback in the
 * browser-native View Transitions API.
 *
 * Phase 17 MOT-03. Created as the future-proof API surface for
 * EXPLICIT View Transitions API triggers (e.g., a future tab
 * component, modal-overlay state change, or any client-side state
 * mutation that should snapshot-blend the visual delta). Not invoked
 * by the route-level PageTransitionWrapper because Next.js 16's App
 * Router does not expose a navigation-completion lifecycle hook —
 * route transitions instead rely on `key={pathname}` keyframe re-fire.
 *
 * The returned `wrap` function:
 *   - If `SUPPORTS_VIEW_TRANSITIONS` AND not reduced-motion → calls
 *     `document.startViewTransition(callback)` (browser snapshots the
 *     pre/post DOM and blends them natively).
 *   - Otherwise → invokes `callback()` directly with no wrapping.
 *
 * Reduced-motion users always get direct invocation (no view
 * transition) because the snapshot-blend itself is a motion effect
 * the OS preference asks us to suppress.
 *
 * The `wrap` reference is memoized with useCallback so callers can
 * safely place it in dependency arrays of useEffect / useMemo
 * without churn.
 *
 * @returns wrap — `(callback: () => void) => void`. Stable reference
 *   across renders (only re-created when `reducedMotion` changes).
 */
export default function useViewTransition(): (callback: () => void) => void {
  const reducedMotion = useReducedMotion();

  const wrap = useCallback(
    (callback: () => void) => {
      if (SUPPORTS_VIEW_TRANSITIONS && !reducedMotion) {
        (document as ViewTransitionDocument).startViewTransition(callback);
        return;
      }
      callback();
    },
    [reducedMotion]
  );

  return wrap;
}
