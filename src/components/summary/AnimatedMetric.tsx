'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Detect prefers-reduced-motion. SSR-safe (returns false during static
 * export build). Post-mount, subscribes to the matchMedia change event
 * so the value updates live if the user toggles their preference.
 *
 * Private to this file. Not exported.
 */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    // Synchronizing React state with the external matchMedia API on mount.
    // Falls under the documented "subscribe to an external system" exception
    // of react-hooks/set-state-in-effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    // Use addEventListener if available (modern browsers); fall back to
    // addListener for older Safari per the canonical defensive pattern.
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
    mq.addListener(handler);
    return () => mq.removeListener(handler);
  }, []);

  return reduced;
}

/**
 * Count up from 0 to `target` over `durationMs`, starting after `delayMs`.
 * Uses requestAnimationFrame for smooth 60fps updates. easeOutCubic easing
 * for a smooth-deceleration feel (matches the Material emphasized curve
 * character used elsewhere in Phase 14/15).
 *
 * Returns the current numeric value scaled to `precision` decimals.
 *
 * If `reduced` (prefers-reduced-motion) is true, returns `target`
 * immediately and skips the rAF loop. Instant settled value, no
 * animation, no SR jitter.
 *
 * Private to this file. Not exported.
 */
function useCountUp(
  target: number,
  durationMs: number,
  delayMs: number,
  precision: 0 | 1,
  reduced: boolean,
): number {
  const [current, setCurrent] = useState<number>(reduced ? target : 0);
  const rafRef = useRef<number | null>(null);
  const startTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // If reduced-motion is preferred, snap to target immediately.
    // The setState calls inside this effect synchronize React state with
    // external systems (rAF clock + matchMedia preference); both fall under
    // the documented exception of react-hooks/set-state-in-effect.
    if (reduced) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrent(target);
      return;
    }

    // Reset to 0 each time target changes (rare in practice; defensive).
    setCurrent(0);

    const startTick = () => {
      const startTs = performance.now();
      const tick = (now: number) => {
        const elapsed = now - startTs;
        const progress = Math.min(Math.max(elapsed / durationMs, 0), 1);
        // easeOutCubic: 1 - (1 - t)^3, smooth deceleration.
        const eased = 1 - Math.pow(1 - progress, 3);
        const scale = precision === 1 ? 10 : 1;
        const value = Math.round(target * eased * scale) / scale;
        setCurrent(value);
        if (progress < 1) {
          rafRef.current = window.requestAnimationFrame(tick);
        }
      };
      rafRef.current = window.requestAnimationFrame(tick);
    };

    startTimeoutRef.current = setTimeout(startTick, delayMs);

    return () => {
      if (startTimeoutRef.current !== null) {
        clearTimeout(startTimeoutRef.current);
      }
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, [target, durationMs, delayMs, precision, reduced]);

  return current;
}

interface AnimatedMetricProps {
  /** The target numeric value to count up to. */
  value: number;
  /** Translated label for the metric (e.g. "24-hour volume"). */
  label: string;
  /** Unit suffix (e.g. "mL", "%"). Null = no unit chip rendered. */
  unit: string | null;
  /** Decimal precision: 0 for integers (24HV, AVV, MVV), 1 for percentages (NPi). */
  precision?: 0 | 1;
  /** Stagger delay before count-up starts (ms). Default 0. */
  delayMs?: number;
}

/**
 * Single IPC metric tile with rAF-driven count-up.
 *
 * Counts from 0 to `value` over 800ms (hardcoded per Phase 16 D-04), starting
 * after `delayMs`. easeOutCubic easing. Reduced-motion users see the final
 * value instantly with no animation.
 *
 * Visual vocabulary matches the existing effort-stat tiles at
 * summary/page.tsx:143-162 (rounded-2xl bg-ipc-50 border ipc-100 tile,
 * tabular-nums number, uppercase tracking-wide label).
 */
export default function AnimatedMetric({
  value,
  label,
  unit,
  precision = 0,
  delayMs = 0,
}: AnimatedMetricProps) {
  const reduced = usePrefersReducedMotion();
  const current = useCountUp(value, 800, delayMs, precision, reduced);
  const display = current.toFixed(precision);

  return (
    <div className="rounded-2xl bg-ipc-50 border border-ipc-100 px-2 py-3 md:px-4 md:py-5 text-center">
      <p className="text-2xl font-bold text-ipc-950 tabular-nums leading-none">
        {display}
        {unit !== null && (
          <span className="text-sm font-medium text-ipc-500 ms-1">{unit}</span>
        )}
      </p>
      <p className="text-[10px] uppercase tracking-wide text-ipc-600 mt-1.5 font-semibold leading-tight">
        {label}
      </p>
    </div>
  );
}
