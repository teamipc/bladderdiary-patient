'use client';

import { useState, useCallback, useMemo } from 'react';
import { Sun } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import TimePicker from '@/components/ui/TimePicker';
import Button from '@/components/ui/Button';
import { useDiaryStore } from '@/lib/store';
import { formatTime, getDefaultTimeForDay } from '@/lib/utils';

interface SetWakeTimeFormProps {
  dayNumber: 1 | 2 | 3;
  onSave: () => void;
}

export default function SetWakeTimeForm({ dayNumber, onSave }: SetWakeTimeFormProps) {
  const { setWakeTime, getWakeTimeForDay, getBedtimeForDay, startDate } = useDiaryStore();
  const t = useTranslations('wakeTime');
  const locale = useLocale();
  const existing = getWakeTimeForDay(dayNumber);
  const bedtime = getBedtimeForDay(dayNumber);
  const prevBedtime = dayNumber > 1 ? getBedtimeForDay((dayNumber - 1) as 1 | 2 | 3) : undefined;

  // Smart default: anchor to the diary day's date, after previous bedtime
  const smartDefault = () => {
    if (existing) return existing.timestampIso;
    return getDefaultTimeForDay(startDate, dayNumber, prevBedtime?.timestampIso);
  };

  const [time, setTime] = useState(smartDefault);

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

      <TimePicker value={time} onChange={setTime} />

      {isBeforePrevBedtime && (
        <p className="text-sm text-danger text-center font-medium">
          {t('afterBedtime', { time: formatTime(prevBedtime!.timestampIso, locale) })}
        </p>
      )}

      {!isBeforePrevBedtime && isAfterBedtime && (
        <p className="text-sm text-danger text-center font-medium">
          {t('beforeBedtime', { time: formatTime(bedtime!.timestampIso, locale) })}
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
