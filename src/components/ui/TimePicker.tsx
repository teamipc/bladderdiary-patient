'use client';

import { format, parseISO, addMinutes } from 'date-fns';
import { Minus, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface TimePickerProps {
  value: string; // ISO string
  onChange: (isoString: string) => void;
  label?: string;
  variant?: 'default' | 'drink' | 'bedtime' | 'leak';
}

/** Snap a Date to the nearest 15-minute mark */
function snapTo15(date: Date): Date {
  const snapped = new Date(date);
  const minutes = snapped.getMinutes();
  const remainder = minutes % 15;
  if (remainder < 8) {
    snapped.setMinutes(minutes - remainder, 0, 0);
  } else {
    snapped.setMinutes(minutes + (15 - remainder), 0, 0);
  }
  return snapped;
}

export default function TimePicker({ value, onChange, label, variant = 'default' }: TimePickerProps) {
  const tc = useTranslations('common');
  const isDrink = variant === 'drink';
  const isBedtime = variant === 'bedtime';
  const isLeak = variant === 'leak';
  const hasAccent = isDrink || isBedtime || isLeak;
  const date = parseISO(value);
  const timeValue = format(date, 'HH:mm');

  // Manual input → save exact time the user typed
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [hours, minutes] = e.target.value.split(':').map(Number);
    const updated = new Date(date);
    updated.setHours(hours, minutes, 0, 0);
    onChange(updated.toISOString());
  };

  // "Now" → exact current time
  const handleSetNow = () => {
    onChange(new Date().toISOString());
  };

  // +/− 15 min → snap to nearest 15-min boundary first, then step
  const handleIncrement = (delta: number) => {
    const snapped = snapTo15(date);
    const updated = addMinutes(snapped, delta);
    onChange(updated.toISOString());
  };

  // "X hours ago" — quick backfill for older users who don't want to nudge ±15 many times
  const handleHoursAgo = (hours: number) => {
    onChange(addMinutes(new Date(), -60 * hours).toISOString());
  };

  // Set to a specific clock time YESTERDAY. Used for bedtime backfill —
  // the "I forgot to mark bedtime last night, now I just woke up" case.
  // Boomers think in clock times ("10 last night"), not "9 hours ago".
  const handleLastNightAt = (hour24: number) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(hour24, 0, 0, 0);
    onChange(yesterday.toISOString());
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-ipc-600">{label}</label>
      )}

      {/* Compact row: − [time] + | Now */}
      <div className="flex items-center justify-center gap-1.5">
        {/* Minus 15 min */}
        <button
          type="button"
          onClick={() => handleIncrement(-15)}
          className={`w-10 h-10 flex items-center justify-center rounded-xl
            bg-white/50 border active:scale-[0.9] transition-all shrink-0 ${
              hasAccent
                ? `${isLeak ? 'border-leak/30 text-leak active:bg-leak/10' : isBedtime ? 'border-bedtime/30 text-bedtime active:bg-bedtime/10' : 'border-drink/30 text-drink active:bg-drink/10'}`
                : 'border-ipc-200/50 text-ipc-500 active:bg-ipc-100/50'
            }`}
          aria-label={tc('subtractMinutes', { n: 15 })}
        >
          <Minus size={16} />
        </button>

        {/* Time input — compact */}
        <input
          type="time"
          value={timeValue}
          onChange={handleChange}
          className={`w-44 px-3 py-2.5 text-base font-bold rounded-xl
            border-2 outline-none transition-all bg-white/50 backdrop-blur-sm text-ipc-950 text-center ${
              hasAccent
                ? `${isLeak ? 'border-leak/30 focus:border-leak/60 focus:ring-2 focus:ring-leak/20' : isBedtime ? 'border-bedtime/30 focus:border-bedtime/60 focus:ring-2 focus:ring-bedtime/20' : 'border-drink/30 focus:border-drink/60 focus:ring-2 focus:ring-drink/20'}`
                : 'border-ipc-200/50 focus:border-ipc-500/60 focus:ring-2 focus:ring-ipc-200/30'
            }`}
        />

        {/* Plus 15 min */}
        <button
          type="button"
          onClick={() => handleIncrement(15)}
          className={`w-10 h-10 flex items-center justify-center rounded-xl
            bg-white/50 border active:scale-[0.9] transition-all shrink-0 ${
              hasAccent
                ? `${isLeak ? 'border-leak/30 text-leak active:bg-leak/10' : isBedtime ? 'border-bedtime/30 text-bedtime active:bg-bedtime/10' : 'border-drink/30 text-drink active:bg-drink/10'}`
                : 'border-ipc-200/50 text-ipc-500 active:bg-ipc-100/50'
            }`}
          aria-label={tc('addMinutes', { n: 15 })}
        >
          <Plus size={16} />
        </button>

        {/* Now button — inline */}
        <button
          type="button"
          onClick={handleSetNow}
          className={`px-3.5 h-10 rounded-xl bg-white/50 border
            text-sm font-semibold active:scale-[0.95] transition-all backdrop-blur-sm shrink-0 ${
              hasAccent
                ? `${isLeak ? 'border-leak/30 text-leak hover:bg-leak/10' : isBedtime ? 'border-bedtime/30 text-bedtime hover:bg-bedtime/10' : 'border-drink/30 text-drink hover:bg-drink/10'}`
                : 'border-ipc-200/50 text-ipc-500 hover:bg-white/60'
            }`}
        >
          {tc('now')}
        </button>
      </div>

      {/* Quick backfill chips. Bedtime gets clock-time presets ("10 PM
          last night") because patients backfill bedtime when they wake up
          ~9 h later — chains of "9h ago" are unintuitive. Other variants
          get hour-relative chips for shorter recent backfill. */}
      <div className="flex items-center justify-center gap-1.5 pt-1 flex-wrap">
        {isBedtime ? (
          <>
            <button
              type="button"
              onClick={() => handleLastNightAt(22)}
              className="px-3 h-8 rounded-full border border-bedtime/25 text-bedtime/80 text-xs font-semibold hover:bg-bedtime/10 active:scale-[0.95] transition-all whitespace-nowrap"
            >
              {tc('lastNightAt', { time: '10 PM' })}
            </button>
            <button
              type="button"
              onClick={() => handleLastNightAt(23)}
              className="px-3 h-8 rounded-full border border-bedtime/25 text-bedtime/80 text-xs font-semibold hover:bg-bedtime/10 active:scale-[0.95] transition-all whitespace-nowrap"
            >
              {tc('lastNightAt', { time: '11 PM' })}
            </button>
            <button
              type="button"
              onClick={() => handleLastNightAt(0)}
              className="px-3 h-8 rounded-full border border-bedtime/25 text-bedtime/80 text-xs font-semibold hover:bg-bedtime/10 active:scale-[0.95] transition-all whitespace-nowrap"
            >
              {tc('lastNightAt', { time: '12 AM' })}
            </button>
          </>
        ) : (
          <>
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => handleHoursAgo(n)}
                className={`px-3 h-8 rounded-full border text-xs font-semibold active:scale-[0.95] transition-all ${
                  hasAccent
                    ? `${isLeak ? 'border-leak/25 text-leak/80 hover:bg-leak/10' : isDrink ? 'border-drink/25 text-drink/80 hover:bg-drink/10' : 'border-ipc-200/60 text-ipc-500 hover:bg-ipc-50'}`
                    : 'border-ipc-200/60 text-ipc-500 hover:bg-ipc-50'
                }`}
              >
                {tc('hoursAgo', { n })}
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
