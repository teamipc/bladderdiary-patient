'use client';

import { useTranslations } from 'next-intl';
import { Sun, Moon, Droplets, Sparkles, Clock } from 'lucide-react';
import { useDiaryStore } from '@/lib/store';

interface NextStepBannerProps {
  dayNumber: 1 | 2 | 3;
  isNightView: boolean;
}

/**
 * Returns the most recent event timestamp across voids/drinks/leaks for a day.
 * Used to surface a "you haven't logged in a while" prompt when the user
 * re-opens the app mid-day — the single biggest re-engagement lever for a
 * 3-day diary, since most patients abandon between Day 2 morning and lunch.
 */
function lastEventIso(
  voids: { timestampIso: string }[],
  drinks: { timestampIso: string }[],
  leaks: { timestampIso: string }[],
): string | null {
  const all = [...voids, ...drinks, ...leaks].map((e) => e.timestampIso);
  if (all.length === 0) return null;
  return all.sort().slice(-1)[0];
}

/**
 * A one-line "what do I do next?" hint at the top of the diary page.
 * Built for older, less-tech-savvy users who need explicit guidance.
 * Hidden when the day is complete.
 */
export default function NextStepBanner({ dayNumber, isNightView }: NextStepBannerProps) {
  const t = useTranslations('nextStep');
  const { getWakeTimeForDay, getBedtimeForDay, getVoidsForDay, getDrinksForDay, getLeaksForDay } = useDiaryStore();

  const wakeTime = getWakeTimeForDay(dayNumber);
  const bedtime = getBedtimeForDay(dayNumber);
  const dayVoids = getVoidsForDay(dayNumber);
  const dayDrinks = getDrinksForDay(dayNumber);
  const dayLeaks = getLeaksForDay(dayNumber);
  const eventCount = dayVoids.length + dayDrinks.length + dayLeaks.length;

  // L2: how long since the last event? Drives the "log now?" nudge.
  const lastIso = lastEventIso(dayVoids, dayDrinks, dayLeaks);
  const minutesSinceLastEvent = lastIso
    ? Math.round((Date.now() - new Date(lastIso).getTime()) / 60000)
    : null;
  const hoursSinceLastEvent = minutesSinceLastEvent !== null
    ? Math.floor(minutesSinceLastEvent / 60)
    : null;

  let Icon = Droplets;
  let title = '';
  let hint = '';
  let isStaleNudge = false;

  if (isNightView && !wakeTime) {
    Icon = Moon;
    title = t('nightTitle');
    hint = t('nightHint');
  } else if (!wakeTime) {
    Icon = dayNumber === 1 ? Sparkles : Sun;
    title = dayNumber === 1 ? t('day1StartTitle') : t('morningTitle', { day: dayNumber });
    hint = dayNumber === 1 ? t('day1StartHint') : t('morningHint');
  } else if (eventCount === 0) {
    Icon = Droplets;
    title = t('firstEventTitle');
    hint = t('firstEventHint');
  } else if (!bedtime) {
    // Stale nudge takes priority over generic "keep logging" — only fires
    // when it's been ≥2 hours since the user logged anything today.
    if (hoursSinceLastEvent !== null && hoursSinceLastEvent >= 2) {
      Icon = Clock;
      title = t('staleNudgeTitle', { hours: hoursSinceLastEvent });
      hint = t('staleNudgeHint');
      isStaleNudge = true;
    } else {
      const hour = new Date().getHours();
      if (hour >= 20) {
        Icon = Moon;
        title = t('bedtimeTitle');
        hint = t('bedtimeHint');
      } else {
        Icon = Droplets;
        title = t('keepLoggingTitle');
        hint = t('keepLoggingHint');
      }
    }
  } else {
    // Day is complete — banner not needed
    return null;
  }

  // The stale-nudge variant is amber to grab attention — it's the prompt
  // most likely to recover an abandoning user re-opening the app mid-day.
  const nightStyle = isNightView
    ? 'bg-indigo-500/10 border-indigo-400/30 text-indigo-100'
    : isStaleNudge
      ? 'bg-warning/10 border-warning/30 text-ipc-900'
      : 'bg-ipc-50 border-ipc-100 text-ipc-900';
  const iconBg = isNightView
    ? 'bg-indigo-400/20 text-indigo-200'
    : isStaleNudge
      ? 'bg-warning/20 text-warning'
      : 'bg-ipc-500/15 text-ipc-600';
  const hintStyle = isNightView ? 'text-indigo-200/80' : 'text-ipc-600';

  return (
    <div className={`mx-4 mt-3 mb-4 rounded-2xl border p-3.5 flex gap-3 items-start ${nightStyle}`}>
      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
        <Icon size={18} />
      </div>
      <div className="flex-1 pt-0.5">
        <p className="text-base font-semibold leading-snug">{title}</p>
        {hint && <p className={`text-sm mt-0.5 leading-snug ${hintStyle}`}>{hint}</p>}
      </div>
    </div>
  );
}
