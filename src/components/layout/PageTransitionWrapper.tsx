'use client';

import { usePathname } from '@/i18n/navigation';

/**
 * Page-to-page transition wrapper for the diary flow.
 *
 * Phase 17 MOT-03. Wraps the children of a route-level layout (e.g.,
 * `src/app/[locale]/diary/day/[dayNumber]/layout.tsx` or
 * `src/app/[locale]/summary/layout.tsx`) in a `<div>` that re-mounts
 * on every pathname change. The CSS `.animate-page-fade-in` utility
 * (globals.css) fires its `pageFadeIn` keyframe on every fresh mount,
 * so the user sees a cross-fade + 4px upward slide on each route
 * navigation (Day 1 → Day 2 → Day 3 → /summary, and the back path).
 *
 * Mechanism:
 *   - `usePathname()` from `@/i18n/navigation` returns the current
 *     locale-stripped pathname. The hook is built on next-intl's
 *     `createNavigation`, which forwards to Next.js App Router's
 *     internal pathname tracking.
 *   - `key={pathname}` on the root `<div>` forces React's reconciler
 *     to unmount the old subtree and mount a fresh one when the
 *     pathname changes. CSS animations fire on element creation by
 *     default — the keyframe restart is automatic without imperative
 *     DOM mutations (no `el.style.animation = 'none'` reflow hacks).
 *   - `.animate-page-fade-in` is the canonical utility from Phase 17
 *     globals.css; consumes `var(--duration-normal)` (180ms) and
 *     `var(--ease-decelerated)`.
 *
 * Reduced-motion behavior is handled by the global
 * `@media (prefers-reduced-motion: reduce)` rule in globals.css
 * (lines 141-150), which collapses `animation-duration` to 0.01ms —
 * reduced-motion users see the new page on first paint with no
 * keyframe steps.
 *
 * RTL safety: the wrapper renders a plain `<div>` with no
 * directional padding. The keyframe transform is Y-axis-only
 * (direction-neutral).
 */
export default function PageTransitionWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div key={pathname} className="animate-page-fade-in">
      {children}
    </div>
  );
}
