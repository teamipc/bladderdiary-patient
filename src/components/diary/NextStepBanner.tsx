'use client';

import { useTranslations } from 'next-intl';
import { Sun, Moon, Droplets, Sparkles } from 'lucide-react';
import { useDiaryStore } from '@/lib/store';

interface NextStepBannerProps {
  dayNumber: 1 | 2 | 3;
  isNightView: boolean;
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
  const eventCount =
    getVoidsForDay(dayNumber).length +
    getDrinksForDay(dayNumber).length +
    getLeaksForDay(dayNumber).length;

  let Icon = Droplets;
  let title = '';
  let hint = '';

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
  } else {
    // Day is complete — banner not needed
    return null;
  }

  const nightStyle = isNightView
    ? 'bg-indigo-500/10 border-indigo-400/30 text-indigo-100'
    : 'bg-ipc-50 border-ipc-100 text-ipc-900';
  const iconBg = isNightView ? 'bg-indigo-400/20 text-indigo-200' : 'bg-ipc-500/15 text-ipc-600';
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
