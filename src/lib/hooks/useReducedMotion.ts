'use client';

import { useEffect, useState } from 'react';

/**
 * Subscribe to `prefers-reduced-motion: reduce` media query.
 *
 * Returns `true` when the OS preference is set to reduce motion, `false`
 * otherwise. SSR-safe (returns `false` during server-render and on the
 * first client paint pre-effect; transitions to the real OS value on
 * the second render after the useEffect fires).
 *
 * Updates LIVE on `change` events for users who toggle their OS
 * preference mid-visit. The subscription is cleaned up on unmount.
 *
 * Phase 17 MOT-02. Single source of truth for component-level
 * prefers-reduced-motion detection. Replaces the previously-inline
 * matchMedia / private usePrefersReducedMotion patterns that
 * proliferated across Phase 14/15/16 components.
 *
 * Note: The CSS-level @media (prefers-reduced-motion: reduce) rule in
 * globals.css:124-133 STILL handles the framework-level animation
 * collapse for all CSS animations + transitions. This hook is the
 * SINGLE source of truth for COMPONENT code that needs to branch on
 * the preference for JS-driven motion (rAF loops, setTimeouts,
 * IntersectionObserver setup, etc.).
 *
 * @returns boolean. True if `(prefers-reduced-motion: reduce)` matches.
 */
export default function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    // Synchronizing React state with the external matchMedia API on mount.
    // Falls under the documented "subscribe to an external system" exception
    // of react-hooks/set-state-in-effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return reduced;
}
