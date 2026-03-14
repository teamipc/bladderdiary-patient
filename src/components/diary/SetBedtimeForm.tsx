'use client';

import { useState, useCallback, useMemo } from 'react';
import { Moon } from 'lucide-react';
import { track } from '@vercel/analytics';
import { useTranslations, useLocale } from 'next-intl';
import TimePicker from '@/components/ui/TimePicker';
import Button from '@/components/ui/Button';
import { useDiaryStore } from '@/lib/store';
import { formatTime, getDefaultTimeForDay, correctAfterMidnight } from '@/lib/utils';

interface SetBedtimeFormProps {
  dayNumber: 1 | 2 | 3;
  onSave: () => void;
}

export default function SetBedtimeForm({ dayNumber, onSave }: SetBedtimeFormProps) {
  const { setBedtime, getBedtimeForDay, getWakeTimeForDay, getVoidsForDay, getDrinksForDay, startDate } = useDiaryStore();
  const t = useTranslations('bedtime');
  const locale = useLocale();
  const existing = getBedtimeForDay(dayNumber);
  const wakeTime = getWakeTimeForDay(dayNumber);
  const voids = getVoidsForDay(dayNumber);
  const drinks = getDrinksForDay(dayNumber);

  // Smart default: right after last event, or anchored to the day's date
  const smartDefault = () => {
    if (existing) return existing.timestampIso;
    const allTimes = [
      ...voids.map((v) => v.timestampIso),
      ...drinks.map((d) => d.timestampIso),
    ].sort();
    const lastEvent = allTimes.at(-1);
    if (lastEvent) {
      // 15 minutes after the last event
      return new Date(new Date(lastEvent).getTime() + 15 * 60 * 1000).toISOString();
    }
    return getDefaultTimeForDay(startDate, dayNumber, wakeTime?.timestampIso);
  };

  const [time, setTime] = useState(() => correctAfterMidnight(smartDefault(), dayNumber, startDate));

  // Correct after-midnight times: 1 AM bedtime means next calendar day
  const handleTimeChange = useCallback((newTime: string) => {
    setTime(correctAfterMidnight(newTime, dayNumber, startDate));
  }, [dayNumber, startDate]);

  // Bedtime must be after wake-up time (if one exists for this day)
  const isBeforeWakeUp = useMemo(() => {
    if (!wakeTime) return false;
    return time <= wakeTime.timestampIso;
  }, [time, wakeTime]);

  // Bedtime must be after all logged events (voids + drinks) for the day
  const lastEventTime = useMemo(() => {
    const allTimes = [
      ...voids.map((v) => v.timestampIso),
      ...drinks.map((d) => d.timestampIso),
    ];
    if (allTimes.length === 0) return null;
    return allTimes.sort().at(-1)!;
  }, [voids, drinks]);

  const isBeforeLastEvent = useMemo(() => {
    if (!lastEventTime) return false;
    return time <= lastEventTime;
  }, [time, lastEventTime]);

  const isInvalid = isBeforeWakeUp || isBeforeLastEvent;

  const handleSave = useCallback(() => {
    if (isInvalid) return;
    setBedtime(dayNumber, time);
    if (!existing) {
      track('day_complete', { day: dayNumber });
    }
    onSave();
  }, [dayNumber, time, isInvalid, existing, setBedtime, onSave]);

  return (
    <div className="space-y-5">
      <div className="text-center py-3">
        <Moon size={44} className="text-bedtime mx-auto" />
        <p className="text-lg font-semibold text-bedtime mt-3">
          {existing ? t('updateBedtime') : t('whenGoToBed')}
        </p>
      </div>

      <TimePicker value={time} onChange={handleTimeChange} variant="bedtime" />

      {isBeforeWakeUp && (
        <p className="text-sm text-danger text-center font-medium">
          {t('afterWakeUp', { time: formatTime(wakeTime!.timestampIso, locale) })}
        </p>
      )}

      {!isBeforeWakeUp && isBeforeLastEvent && (
        <p className="text-sm text-danger text-center font-medium">
          {t('afterLastEvent', { time: formatTime(lastEventTime!, locale) })}
        </p>
      )}

      <div className="flex justify-center">
        <Button onClick={handleSave} size="md" variant="bedtime" disabled={isInvalid}>
          {existing ? t('updateBedtimeButton') : t('saveBedtime')}
        </Button>
      </div>
    </div>
  );
}
