import PageTransitionWrapper from '@/components/layout/PageTransitionWrapper';

/**
 * Per-day layout shim that wraps the diary day page in the Phase 17
 * MOT-03 page-to-page transition wrapper.
 *
 * Why this layout exists:
 *   - The parent layout at `src/app/[locale]/diary/layout.tsx` is
 *     PRESERVED across Day 1 → Day 2 → Day 3 navigation by the
 *     Next.js App Router (since the `/diary` segment doesn't change).
 *     That means any wrapper placed there would NOT re-mount on
 *     [dayNumber] changes, and `key={pathname}` inside it would never
 *     get a new value at the layout-component level even though the
 *     children prop does change.
 *   - This per-day layout sits BETWEEN `diary/layout.tsx` and
 *     `diary/day/[dayNumber]/page.tsx`. Even though the layout COMPONENT
 *     itself is preserved across [dayNumber] changes, the
 *     PageTransitionWrapper INSIDE it consumes `usePathname()` and
 *     uses it as `key={pathname}`, so its inner subtree re-mounts on
 *     every pathname change (Day 1 → Day 2 → Day 3 → /summary).
 *
 * Server component (no `'use client'`) — only renders the wrapper
 * which is itself the client boundary.
 */
export default function DayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PageTransitionWrapper>{children}</PageTransitionWrapper>;
}
