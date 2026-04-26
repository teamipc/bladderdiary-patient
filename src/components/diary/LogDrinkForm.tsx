'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, MessageSquarePlus, Check } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import VolumeInput from '@/components/ui/VolumeInput';
import TimePicker from '@/components/ui/TimePicker';
import DrinkTypePicker from '@/components/diary/DrinkTypePicker';
import Button from '@/components/ui/Button';
import { VOLUME_CONFIG } from '@/lib/constants';
import { useDiaryStore } from '@/lib/store';
import { formatTime, getDefaultTimeForDay, getNightDefaultTime, correctNightDate, correctAfterMidnight, mlToDisplayVolume, displayVolumeToMl } from '@/lib/utils';
import type { DrinkType, DrinkEntry } from '@/lib/types';

interface LogDrinkFormProps {
  onSave: () => void;
  dayNumber: number;
  editEntry?: DrinkEntry;
  initialTime?: string;
  isNightView?: boolean;
}

const TOTAL_STEPS = 2;

export default function LogDrinkForm({ onSave, dayNumber, editEntry, initialTime, isNightView }: LogDrinkFormProps) {
  const { addDrink, updateDrink, getBedtimeForDay, getWakeTimeForDay, startDate, volumeUnit, timeZone, drinks: allDrinks } = useDiaryStore();
  const t = useTranslations('logDrink');
  const tc = useTranslations('common');
  const tv = useTranslations('validation');
  const tdt = useTranslations('drinkTypes');
  const locale = useLocale();
  const vc = VOLUME_CONFIG[volumeUnit];
  const isEditing = !!editEntry;

  const prevDayBedtime = dayNumber > 1 ? getBedtimeForDay((dayNumber - 1) as 1 | 2 | 3) : undefined;
  const wakeTime = getWakeTimeForDay(dayNumber as 1 | 2 | 3);
  const currentBedtime = getBedtimeForDay(dayNumber as 1 | 2 | 3);

  const smartDefault = () => {
    if (editEntry) return editEntry.timestampIso;
    if (initialTime) return initialTime;
    if (isNightView && prevDayBedtime) {
      return getNightDefaultTime(
        prevDayBedtime.timestampIso,
        wakeTime?.timestampIso,
        allDrinks.map((d) => d.timestampIso),
      );
    }
    const after = wakeTime?.timestampIso ?? prevDayBedtime?.timestampIso;
    return getDefaultTimeForDay(startDate, dayNumber as 1 | 2 | 3, after, timeZone);
  };

  const handleTimeChange = useCallback((newTime: string) => {
    if (isNightView && prevDayBedtime) {
      setTime(correctNightDate(newTime, prevDayBedtime.timestampIso, timeZone));
    } else {
      setTime(correctAfterMidnight(newTime, dayNumber as 1 | 2 | 3, startDate, timeZone, wakeTime?.timestampIso, 'event'));
    }
  }, [isNightView, prevDayBedtime, dayNumber, startDate, timeZone, wakeTime]);

  // L3: smart default — when adding a new drink, prefer the patient's most
  // recent prior drink as the pre-fill. Drink habits are highly repetitive
  // (same morning coffee, same lunch glass), so pre-filling cuts taps and
  // signals "the app remembers you" — both retention drivers for older users.
  const mostRecentPriorDrink = !editEntry && allDrinks.length > 0
    ? [...allDrinks].sort((a, b) => b.timestampIso.localeCompare(a.timestampIso))[0]
    : null;

  const defaultDrinkType: DrinkType = editEntry?.drinkType ?? mostRecentPriorDrink?.drinkType ?? 'water';
  const defaultVolume = editEntry
    ? mlToDisplayVolume(editEntry.volumeMl, volumeUnit)
    : mostRecentPriorDrink
      ? mlToDisplayVolume(mostRecentPriorDrink.volumeMl, volumeUnit)
      : vc.default;

  const [drinkType, setDrinkType] = useState<DrinkType>(defaultDrinkType);
  const [volume, setVolume] = useState(defaultVolume);
  const [time, setTime] = useState(smartDefault);
  const [note, setNote] = useState(editEntry?.note ?? '');

  // Drink chips: 3 real-world container sizes pulled from patient diary data
  // (Bruno's water/coffee/juice 150–500 mL range, Alex's coffee 200, beer 340).
  // 200 mL = small glass / cup, 350 mL = standard glass / can, 500 mL = bottle.
  // Three chips keeps Hick's-Law decision time low for older users.
  const VOLUME_PRESETS = volumeUnit === 'oz'
    ? [
        { id: 'p1', value: 7 },
        { id: 'p2', value: 12 },
        { id: 'p3', value: 17 },
      ]
    : [
        { id: 'p1', value: 200 },
        { id: 'p2', value: 350 },
        { id: 'p3', value: 500 },
      ];

  const [step, setStep] = useState(1);
  const [slideDir, setSlideDir] = useState<'left' | 'right'>('left');
  const [noteOpen, setNoteOpen] = useState(false);
  const noteAreaRef = useRef<HTMLDivElement>(null);
  // Pavlovian "+VOL" micro-reward — see LogVoidForm for rationale.
  const [chipPop, setChipPop] = useState<{ id: string; label: string; nonce: number } | null>(null);

  const savedRef = useRef(false);
  const formRef = useRef({ drinkType, volume, time, note });
  useEffect(() => {
    formRef.current = { drinkType, volume, time, note };
  });

  useEffect(() => {
    if (!isEditing || !editEntry) return;
    return () => {
      if (savedRef.current) return;
      const d = formRef.current;
      if (d.volume <= 0) return;
      updateDrink(editEntry.id, {
        timestampIso: d.time,
        volumeMl: displayVolumeToMl(d.volume, volumeUnit),
        drinkType: d.drinkType,
        note: d.note,
      });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goToStep = useCallback((target: number) => {
    const clamped = Math.max(1, Math.min(TOTAL_STEPS, target));
    setSlideDir(clamped > step ? 'left' : 'right');
    setStep(clamped);
  }, [step]);

  const handleVolumeChange = useCallback((v: number) => {
    setVolume(v);
  }, []);

  const handleNoteToggle = useCallback(() => {
    if (!noteOpen) {
      setTimeout(() => {
        noteAreaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 150);
    }
    setNoteOpen(prev => !prev);
  }, [noteOpen]);

  const handleDrinkTypeChange = useCallback((type: DrinkType) => {
    setDrinkType(type);
  }, []);

  const isBeforePrevBedtime = prevDayBedtime ? time <= prevDayBedtime.timestampIso : false;
  const isBeforeWakeTime = !isNightView && wakeTime ? time < wakeTime.timestampIso : false;
  const isAfterWakeTime = isNightView && wakeTime ? time >= wakeTime.timestampIso : false;
  const isAfterBedtime = !isNightView && currentBedtime ? time >= currentBedtime.timestampIso : false;

  const [timeWarning, setTimeWarning] = useState<string | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSave = useCallback(() => {
    if (volume <= 0) return;
    if (isBeforePrevBedtime && prevDayBedtime) {
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      setTimeWarning(tv('beforePrevBedtime', { dayNumber: dayNumber - 1, time: formatTime(prevDayBedtime.timestampIso, locale, timeZone) }));
      warningTimerRef.current = setTimeout(() => setTimeWarning(null), 4000);
      return;
    }
    if (isBeforeWakeTime && wakeTime) {
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      setTimeWarning(tv('beforeWakeUp', { time: formatTime(wakeTime.timestampIso, locale, timeZone) }));
      warningTimerRef.current = setTimeout(() => setTimeWarning(null), 4000);
      return;
    }
    if (isAfterWakeTime && wakeTime) {
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      setTimeWarning(tv('afterWakeUp', { time: formatTime(wakeTime.timestampIso, locale, timeZone) }));
      warningTimerRef.current = setTimeout(() => setTimeWarning(null), 4000);
      return;
    }
    if (isAfterBedtime && currentBedtime) {
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      setTimeWarning(tv('afterBedtime', { time: formatTime(currentBedtime.timestampIso, locale, timeZone) }));
      warningTimerRef.current = setTimeout(() => setTimeWarning(null), 4000);
      return;
    }
    const data = {
      timestampIso: time,
      volumeMl: displayVolumeToMl(volume, volumeUnit),
      drinkType,
      note,
    };
    if (isEditing && editEntry) {
      savedRef.current = true;
      updateDrink(editEntry.id, data);
      onSave();
      return;
    }
    const ok = addDrink(data);
    if (!ok) {
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      setTimeWarning(tv('duplicateMinute'));
      warningTimerRef.current = setTimeout(() => setTimeWarning(null), 4000);
      return;
    }
    savedRef.current = true;
    onSave();
  }, [volume, drinkType, time, note, isEditing, editEntry, addDrink, updateDrink, onSave, isBeforePrevBedtime, prevDayBedtime, dayNumber, volumeUnit, isBeforeWakeTime, isAfterWakeTime, wakeTime, isAfterBedtime, currentBedtime, tv]);

  const slideClass = slideDir === 'left' ? 'animate-step-in-left' : 'animate-step-in-right';

  return (
    <div className="select-none min-h-[70vh]">
      <div className="flex flex-col items-center gap-1 mb-3">
        <div className="flex justify-center gap-2">
          {[1, 2].map((s) => (
            <button key={s} type="button" onClick={() => goToStep(s)}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                s === step ? 'bg-drink scale-125' : s < step ? 'bg-drink/50' : 'bg-drink/20'
              }`}
              aria-label={`Step ${s}`} />
          ))}
        </div>
        <span className="text-[11px] font-semibold tracking-wide text-drink/70 uppercase">
          {tc('stepOf', { current: step, total: TOTAL_STEPS })}
        </span>
      </div>

      {step > 1 && (
        <div className="px-2 mb-2">
          <button type="button" onClick={() => goToStep(step - 1)}
            className="inline-flex items-center gap-1 pl-2 pr-3 h-8 rounded-full bg-drink/10 border border-drink/20 text-drink active:scale-[0.95] active:bg-drink/20 transition-all"
            aria-label={tc('previousStep')}>
            <ChevronLeft size={18} strokeWidth={2.5} />
            <span className="text-sm font-semibold">{tc('back')}</span>
          </button>
        </div>
      )}

      <div className="relative">
        <div key={step} className={`px-2 ${slideClass}`}>
          {step === 1 && (
            <>
              <h3 className="text-xl font-bold text-center mb-2 text-ipc-950 px-10 text-balance">
                {t('whatDrink')}
              </h3>
              <DrinkTypePicker value={drinkType} onChange={handleDrinkTypeChange} />
              <div className="flex justify-center mt-2.5 mb-1">
                <button type="button" onClick={handleNoteToggle}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all active:scale-[0.95] ${
                    noteOpen || note ? 'bg-drink/15 text-drink ring-1 ring-drink/30' : 'bg-drink/5 text-drink/70 border border-drink/20'
                  }`}>
                  <MessageSquarePlus size={15} />
                  {note && !noteOpen ? tc('noteAdded') : tc('addNote')}
                </button>
              </div>
              {noteOpen && (
                <div ref={noteAreaRef} className="note-expand mt-1 pb-1">
                  <div className="relative">
                    <textarea value={note} onChange={(e) => setNote(e.target.value)}
                      placeholder={t('notePlaceholder')}
                      autoFocus rows={2} maxLength={120}
                      className="w-full px-3 py-2.5 pr-11 rounded-xl border-2 border-drink/30 focus:border-drink/60 focus:ring-2 focus:ring-drink/20 outline-none transition-all bg-white/50 backdrop-blur-sm text-drink text-sm resize-none placeholder:text-drink/40" />
                    <button type="button" onClick={handleNoteToggle}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg bg-drink text-white active:scale-[0.9] transition-all"
                      aria-label={tc('done')}>
                      <Check size={16} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              )}
              <div className="border-t border-drink/15 mt-2 mb-2" />
              <h3 className="text-lg font-bold text-center mb-2 text-ipc-950 text-balance">
                {t('howMuch')}
              </h3>
              {/* Quick-pick presets — three real-world container sizes */}
              <div className="grid grid-cols-3 gap-2 mb-2 px-2">
                {VOLUME_PRESETS.map((p) => {
                  const active = volume === p.value;
                  return (
                    <div key={p.id} className="relative">
                      {chipPop?.id === p.id && (
                        <span
                          key={chipPop.nonce}
                          aria-hidden="true"
                          className="absolute left-1/2 -top-3 z-10 px-2 py-0.5 rounded-full
                            bg-success text-white text-[11px] font-bold shadow-md
                            pointer-events-none whitespace-nowrap animate-float-pop"
                        >
                          {chipPop.label}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setVolume(p.value);
                          setChipPop({ id: p.id, label: `+${p.value} ${volumeUnit}`, nonce: Date.now() });
                        }}
                        aria-pressed={active}
                        className={`w-full min-h-[58px] px-2 py-2 rounded-2xl border-2 flex items-baseline justify-center gap-1 transition-all active:scale-[0.96] ${
                          active
                            ? 'bg-drink border-drink text-white shadow-md'
                            : 'bg-white border-drink/30 text-ipc-950'
                        }`}
                      >
                        <span className="text-2xl font-bold leading-none tabular-nums">{p.value}</span>
                        <span className={`text-xs font-medium ${active ? 'text-white/85' : 'text-drink/80'}`}>
                          {volumeUnit}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
              <VolumeInput value={volume} onChange={handleVolumeChange}
                unit={volumeUnit} max={vc.max} step={vc.step} variant={isNightView ? 'night' : 'drink'} />
            </>
          )}

          {step === 2 && (
            <div className="flex flex-col items-center min-h-[45vh] pt-4">
              {/* Recap of step 1 so user confirms before saving */}
              <div className="w-full mb-5 px-4 py-3 rounded-2xl bg-drink/5 border border-drink/15">
                <p className="text-[11px] font-semibold tracking-wide text-drink/60 uppercase mb-1">
                  {tc('review')}
                </p>
                <p className="text-sm font-medium text-drink leading-snug">
                  {[tdt(drinkType), `${volume} ${volumeUnit}`].join(' · ')}
                </p>
              </div>

              <h3 className="text-xl font-bold text-center mb-5 text-ipc-950 text-balance">
                {t('whenWasThis')}
              </h3>
              <TimePicker value={time} onChange={handleTimeChange} variant="drink" timeZone={timeZone} />
              {timeWarning && (
                <div className="mt-3 px-4 py-2.5 rounded-2xl bg-danger-light border border-danger/20 animate-fade-slide-up">
                  <p className="text-sm font-medium text-danger text-center">{timeWarning}</p>
                </div>
              )}
              <div className="flex justify-center mt-6">
                <Button onClick={handleSave} size="lg" variant={isNightView ? 'night' : 'drink'} disabled={volume <= 0}>
                  {isEditing ? tc('updateCheck') : tc('saveCheck')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sticky Next on non-final step — always visible at the bottom */}
      {step < TOTAL_STEPS && (
        <div className="sticky bottom-0 -mx-5 mt-6 px-5 pt-5 pb-2 bg-gradient-to-t from-white via-white/95 to-white/0">
          <Button onClick={() => goToStep(step + 1)} fullWidth size="lg" variant={isNightView ? 'night' : 'drink'} disabled={volume <= 0}>
            {tc('next')}
            <ChevronRight size={18} className="ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
