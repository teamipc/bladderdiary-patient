'use client';

import { useState, useCallback, useMemo } from 'react';
import { Sun } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import TimePicker from '@/components/ui/TimePicker';
import Button from '@/components/ui/Button';
import { useDiaryStore } from '@/lib/store';
import { formatTime, advanceIsoToAfter } from '@/lib/utils';

interface SetWakeTimeFormProps {
  dayNumber: 1 | 2 | 3;
  onSave: () => void;
}

export default function SetWakeTimeForm({ dayNumber, onSave }: SetWakeTimeFormProps) {
  const { setWakeTime, getWakeTimeForDay, getBedtimeForDay, timeZone } = useDiaryStore();
  const t = useTranslations('wakeTime');
  const locale = useLocale();
  const existing = getWakeTimeForDay(dayNumber);
  const bedtime = getBedtimeForDay(dayNumber);
  const prevBedtime = dayNumber > 1 ? getBedtimeForDay((dayNumber - 1) as 1 | 2 | 3) : undefined;

  // Smart default: use the patient's current real time, clamped to be after
  // the previous day's bedtime. This works for normal sleep AND short-sleep
  // patterns (e.g., bedtime 8 PM, wake 11 PM same calendar day) — anchoring
  // to the diary day's date instead would land on the wrong calendar day
  // for the short-sleep case.
  const smartDefault = () => {
    if (existing) return existing.timestampIso;
    const now = new Date().toISOString();
    if (prevBedtime && now <= prevBedtime.timestampIso) {
      // Real time is somehow before prev bedtime — fall back to bedtime + 5 min
      return new Date(new Date(prevBedtime.timestampIso).getTime() + 5 * 60 * 1000).toISOString();
    }
    return now;
  };

  const [time, setTime] = useState(smartDefault);

  // Wake time is always between the previous bedtime and this day's bedtime.
  // If the user picks a clock time that lands at-or-before the previous
  // bedtime (e.g. 12:00 AM after a 10:30 PM bedtime), they meant the
  // morning AFTER bedtime — the picker stayed on the form's calendar date
  // (which is BEFORE bedtime crosses midnight). Advance the date in the
  // user's tz so the timestamp falls in the awake window.
  const handleTimeChange = useCallback((newTime: string) => {
    if (prevBedtime && newTime <= prevBedtime.timestampIso) {
      setTime(advanceIsoToAfter(newTime, prevBedtime.timestampIso, timeZone));
      return;
    }
    setTime(newTime);
  }, [prevBedtime, timeZone]);

  // Wake-up must be before bedtime (if one is already set for this day)
  const isAfterBedtime = useMemo(() => {
    if (!bedtime) return false;
    return time >= bedtime.timestampIso;
  }, [time, bedtime]);

  // Wake-up must be after previous day's bedtime
  const isBeforePrevBedtime = useMemo(() => {
    if (!prevBedtime) return false;
    return time <= prevBedtime.timestampIso;
  }, [time, prevBedtime]);

  const isInvalid = isAfterBedtime || isBeforePrevBedtime;

  const handleSave = useCallback(() => {
    if (isInvalid) return;
    setWakeTime(dayNumber, time);
    onSave();
  }, [dayNumber, time, isInvalid, setWakeTime, onSave]);

  return (
    <div className="space-y-5">
      <div className="text-center py-3">
        <Sun size={44} className="text-warning mx-auto" />
        <p className="text-lg font-semibold text-ipc-950 mt-3">
          {existing ? t('updateWakeUp') : t('whenWakeUp')}
        </p>
      </div>

      <TimePicker value={time} onChange={handleTimeChange} timeZone={timeZone} />

      {isBeforePrevBedtime && (
        <p className="text-sm text-danger text-center font-medium">
          {t('afterBedtime', { time: formatTime(prevBedtime!.timestampIso, locale, timeZone) })}
        </p>
      )}

      {!isBeforePrevBedtime && isAfterBedtime && (
        <p className="text-sm text-danger text-center font-medium">
          {t('beforeBedtime', { time: formatTime(bedtime!.timestampIso, locale, timeZone) })}
        </p>
      )}

      <div className="flex justify-center">
        <Button onClick={handleSave} size="md" disabled={isInvalid}>
          {existing ? t('updateWakeUpButton') : t('saveWakeUp')}
        </Button>
      </div>
    </div>
  );
}
