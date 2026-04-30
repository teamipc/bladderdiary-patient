'use client';

/**
 * DrinkVoidTimeline: per-day horizontal strip showing drinks above the line
 * and pees below. Boomer-friendly visual: big dots, no axis numbers, soft
 * colors, day labels in plain English. Educational, not diagnostic.
 *
 * Each day strip spans wake-time to bedtime (with a small buffer). If wake
 * or bedtime is missing, falls back to first/last event of the day.
 */

import { useTranslations, useLocale } from 'next-intl';
import { useDiaryStore } from '@/lib/store';
import { formatTime } from '@/lib/utils';
import { Coffee, Droplet } from 'lucide-react';

interface DrinkVoidTimelineProps {
  dayNumber: 1 | 2 | 3;
}

export default function DrinkVoidTimeline({ dayNumber }: DrinkVoidTimelineProps) {
  const tc = useTranslations('common');
  const ts = useTranslations('summary');
  const locale = useLocale();
  const { timeZone, getVoidsForDay, getDrinksForDay, getBedtimeForDay, getWakeTimeForDay } = useDiaryStore();

  const voids = getVoidsForDay(dayNumber);
  const drinks = getDrinksForDay(dayNumber);
  const bedtime = getBedtimeForDay(dayNumber);
  const wakeTime = getWakeTimeForDay(dayNumber);

  if (voids.length === 0 && drinks.length === 0) return null;

  // Determine the strip's start/end. Prefer wake/bedtime; fall back to event extremes.
  const allTimestamps = [
    ...voids.map((v) => v.timestampIso),
    ...drinks.map((d) => d.timestampIso),
  ].sort();
  const startIso = wakeTime?.timestampIso ?? allTimestamps[0];
  const endIso = bedtime?.timestampIso ?? allTimestamps[allTimestamps.length - 1];
  if (!startIso || !endIso || startIso === endIso) return null;

  const startMs = new Date(startIso).getTime();
  const endMs = new Date(endIso).getTime();
  const span = endMs - startMs;

  const positionPercent = (iso: string): number => {
    const ms = new Date(iso).getTime();
    const raw = ((ms - startMs) / span) * 100;
    // Clamp inside [2, 98] so dots don't fall off the edges
    return Math.max(2, Math.min(98, raw));
  };

  return (
    <div className="rounded-2xl border border-ipc-100 bg-white p-4">
      {/* Day label + endpoints */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold text-ipc-950">{tc('day', { number: dayNumber })}</span>
        <div className="text-xs text-ipc-500 flex items-center gap-2">
          <span>{formatTime(startIso, locale, timeZone)}</span>
          <span className="opacity-50">{ts('timelineRange')}</span>
          <span>{formatTime(endIso, locale, timeZone)}</span>
        </div>
      </div>

      {/* Drinks row (above the line) — staggered fade-in by chronological order */}
      <div className="relative h-9">
        {drinks.map((d, i) => (
          <div
            key={d.id}
            className="timeline-dot absolute top-0 w-7 h-7 rounded-full bg-drink/15 border border-drink/40 flex items-center justify-center animate-fade-slide-up opacity-0"
            style={{
              insetInlineStart: `${positionPercent(d.timestampIso)}%`,
              animationDelay: `${i * 90 + dayNumber * 200}ms`,
              animationFillMode: 'forwards',
            }}
            aria-label={ts('drinkAtAria', { time: formatTime(d.timestampIso, locale, timeZone) })}
          >
            <Coffee size={14} className="text-drink" />
          </div>
        ))}
      </div>

      {/* The "sink line" itself */}
      <div className="relative h-px bg-ipc-200 my-1" />

      {/* Voids row (below the line) — staggered, slightly later than drinks */}
      <div className="relative h-9">
        {voids.map((v, i) => (
          <div
            key={v.id}
            className="timeline-dot absolute top-1 w-7 h-7 rounded-full bg-void/15 border border-void/40 flex items-center justify-center animate-fade-slide-up opacity-0"
            style={{
              insetInlineStart: `${positionPercent(v.timestampIso)}%`,
              animationDelay: `${i * 90 + dayNumber * 200 + 150}ms`,
              animationFillMode: 'forwards',
            }}
            aria-label={ts('peeAtAria', { time: formatTime(v.timestampIso, locale, timeZone) })}
          >
            <Droplet size={14} className="text-void" />
          </div>
        ))}
      </div>
    </div>
  );
}
