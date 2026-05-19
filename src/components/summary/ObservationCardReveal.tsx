'use client';

import { useEffect, useRef, useState } from 'react';
import useReducedMotion from '@/lib/hooks/useReducedMotion';

interface ObservationCardRevealProps {
  /** Children rendered inside the reveal wrapper. */
  children: React.ReactNode;
  /** 0-indexed position in the sequence. Each card delays its reveal by
   *  `index * staggerMs` ms after IntersectionObserver fires. */
  index: number;
  /** Per-card stagger delay in ms. Default 150. */
  staggerMs?: number;
}

/**
 * Sequentially reveals observation cards as they enter the viewport.
 * Phase 16 CEL-03.
 *
 * Behavior:
 *   - On mount, the wrapper renders at the "invisible" state
 *     (opacity 0 + translateY(8px)).
 *   - An IntersectionObserver fires when the wrapper enters the viewport.
 *   - A setTimeout(reveal, index * staggerMs) schedules the visual reveal
 *     so cards appear in INDEX order even if they all enter the viewport
 *     simultaneously (e.g. on a tall desktop screen).
 *   - The reveal is a CSS transition on opacity + transform using
 *     the --duration-slow + --ease-emphasized tokens from Phase 17 MOT-01.
 *   - The observer disconnects after the one-shot reveal (no re-trigger).
 *
 * SSR + reduced-motion:
 *   - Initial state is invisible (opacity 0 + translateY(8px)). For SSR the
 *     useEffect does not run, so the static export shows the pre-reveal
 *     state. Acceptable for /summary because the page is gated on a
 *     complete localStorage diary; crawlers won't have that state and the
 *     observations section is educational, not load-bearing for SEO.
 *   - `prefers-reduced-motion: reduce` skips the observer setup entirely
 *     and reveals children at the final state immediately. The global CSS
 *     rule at globals.css:124-133 ALSO collapses the transition for these
 *     users; this is belt-and-suspenders.
 *   - Browsers without IntersectionObserver fall back to revealing
 *     immediately on mount (graceful degradation).
 */
export default function ObservationCardReveal({
  children,
  index,
  staggerMs = 150,
}: ObservationCardRevealProps) {
  const [revealed, setRevealed] = useState(false);
  const reducedMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // SSR safety + reduced-motion + no-IntersectionObserver fallbacks all
    // converge on the same behavior: reveal immediately. These setState
    // calls synchronize React state with external systems (the
    // useReducedMotion hook subscription + IntersectionObserver availability
    // + the DOM ref); they fall under the documented "subscribe to an
    // external system" exception of react-hooks/set-state-in-effect.
    if (reducedMotion) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRevealed(true);
      return;
    }
    if (typeof window === 'undefined') {
      setRevealed(true);
      return;
    }
    if (typeof window.IntersectionObserver === 'undefined') {
      setRevealed(true);
      return;
    }
    const el = ref.current;
    if (!el) {
      setRevealed(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            window.setTimeout(() => setRevealed(true), index * staggerMs);
            observer.disconnect();
            break;
          }
        }
      },
      { rootMargin: '-10% 0px -10% 0px', threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [reducedMotion, index, staggerMs]);

  return (
    <div
      ref={ref}
      style={{
        opacity: revealed ? 1 : 0,
        transform: revealed ? 'translateY(0)' : 'translateY(8px)',
        transition:
          'opacity var(--duration-slow) var(--ease-emphasized), transform var(--duration-slow) var(--ease-emphasized)',
        willChange: 'opacity, transform',
      }}
    >
      {children}
    </div>
  );
}
