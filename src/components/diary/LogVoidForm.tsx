'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { CopyPlus, ChevronLeft, ChevronRight, Droplets, MessageSquarePlus, Check, HelpCircle } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import VolumeInput from '@/components/ui/VolumeInput';
import TimePicker from '@/components/ui/TimePicker';
import Button from '@/components/ui/Button';
import { VOLUME_CONFIG } from '@/lib/constants';
import SensationPicker from '@/components/diary/SensationPicker';
import { useDiaryStore } from '@/lib/store';
import { formatTime, getDefaultTimeForDay, correctNightDate, correctAfterMidnight, mlToDisplayVolume, displayVolumeToMl } from '@/lib/utils';
import type { BladderSensation, VoidEntry } from '@/lib/types';

interface LogVoidFormProps {
  onSave: () => void;
  dayNumber: number;
  editEntry?: VoidEntry;
  initialTime?: string;
  isNightView?: boolean;
}

export default function LogVoidForm({ onSave, dayNumber, editEntry, initialTime, isNightView }: LogVoidFormProps) {
  const { addVoid, updateVoid, getWakeTimeForDay, getBedtimeForDay, startDate, volumeUnit, timeZone, voids: allVoids } = useDiaryStore();
  const t = useTranslations('logVoid');
  const tc = useTranslations('common');
  const tv = useTranslations('validation');
  const ts = useTranslations('sensations');
  const locale = useLocale();
  const vc = VOLUME_CONFIG[volumeUnit];
  const isEditing = !!editEntry;

  const prevDayBedtime = dayNumber > 1 ? getBedtimeForDay((dayNumber - 1) as 1 | 2 | 3) : undefined;
  const wakeTimeEntry = getWakeTimeForDay(dayNumber);
  const currentBedtime = getBedtimeForDay(dayNumber as 1 | 2 | 3);

  const smartDefault = () => {
    if (editEntry) return editEntry.timestampIso;
    if (initialTime) return initialTime;
    if (isNightView && prevDayBedtime) {
      return new Date(new Date(prevDayBedtime.timestampIso).getTime() + 5 * 60 * 1000).toISOString();
    }
    const after = wakeTimeEntry?.timestampIso ?? prevDayBedtime?.timestampIso;
    return getDefaultTimeForDay(startDate, dayNumber as 1 | 2 | 3, after, timeZone);
  };

  const handleTimeChange = useCallback((newTime: string) => {
    if (isNightView && prevDayBedtime) {
      setTime(correctNightDate(newTime, prevDayBedtime.timestampIso, timeZone));
    } else {
      setTime(correctAfterMidnight(newTime, dayNumber as 1 | 2 | 3, startDate, timeZone));
    }
  }, [isNightView, prevDayBedtime, dayNumber, startDate, timeZone]);

  // Smart default: when adding a NEW void, pre-fill the volume from the
  // patient's most recent prior void. Bladder voids are highly repetitive
  // for any given patient (each person has their own typical void volume),
  // so this cuts taps and signals "the app remembers me." Editing keeps
  // the entry's own value.
  const mostRecentPriorVoid = !editEntry && allVoids.length > 0
    ? [...allVoids].sort((a, b) => b.timestampIso.localeCompare(a.timestampIso))[0]
    : null;
  const defaultVolume = editEntry
    ? mlToDisplayVolume(editEntry.volumeMl, volumeUnit)
    : mostRecentPriorVoid
      ? mlToDisplayVolume(mostRecentPriorVoid.volumeMl, volumeUnit)
      : vc.default;

  const [volume, setVolume] = useState(defaultVolume);
  const [sensation, setSensation] = useState<BladderSensation | null>(editEntry?.sensation ?? null);
  const [time, setTime] = useState(smartDefault);
  const [note, setNote] = useState(editEntry?.note ?? '');
  const [leak, setLeak] = useState(editEntry?.leak ?? false);

  const [doubleVoid, setDoubleVoid] = useState(!!editEntry?.doubleVoidMl);
  const [doubleVoidVolume, setDoubleVoidVolume] = useState(
    editEntry?.doubleVoidMl ? mlToDisplayVolume(editEntry.doubleVoidMl, volumeUnit) : (volumeUnit === 'oz' ? 3 : 75),
  );

  const [step, setStep] = useState(1);
  const [slideDir, setSlideDir] = useState<'left' | 'right'>('left');
  const [noteOpen, setNoteOpen] = useState(false);
  const [showCupHelp, setShowCupHelp] = useState(false);
  // Pavlovian micro-reward: when the user taps a chip, a "+VOL" pill pops
  // above it briefly. The nonce re-keys the span so back-to-back taps on
  // the same chip retrigger the animation. Cheap dopamine on a medical task.
  const [chipPop, setChipPop] = useState<{ id: string; label: string; nonce: number } | null>(null);

  // Volume chips: 3 options, real-world volumes pulled from the actual void
  // distribution in patient paper diaries (Alex/Bruno). 150 captures the
  // first-morning "small" cluster (120–200 in the data), 300 sits in the
  // 250/275/300 mode (Bruno's most-frequent range), 500 covers the larger
  // bladder voids and nocturia (450–575 in the data). Three chips beats five
  // because Hick's Law predicts ~30% slower decisions with five, big chips
  // beat small ones for shaky thumbs, and 3 fits a familiar small/normal/big
  // mental model. Slider remains for fine-tuning.
  const VOLUME_PRESETS = volumeUnit === 'oz'
    ? [
        { id: 'p1', value: 5 },
        { id: 'p2', value: 10 },
        { id: 'p3', value: 17 },
      ]
    : [
        { id: 'p1', value: 150 },
        { id: 'p2', value: 300 },
        { id: 'p3', value: 500 },
      ];
  const noteAreaRef = useRef<HTMLDivElement>(null);

  const savedRef = useRef(false);
  const formRef = useRef({ volume, sensation, time, note, leak, doubleVoid, doubleVoidVolume });
  useEffect(() => {
    formRef.current = { volume, sensation, time, note, leak, doubleVoid, doubleVoidVolume };
  });

  useEffect(() => {
    if (!isEditing || !editEntry) return;
    return () => {
      if (savedRef.current) return;
      const d = formRef.current;
      if (d.volume <= 0) return;
      updateVoid(editEntry.id, {
        timestampIso: d.time,
        volumeMl: displayVolumeToMl(d.volume, volumeUnit),
        doubleVoidMl: d.doubleVoid ? displayVolumeToMl(d.doubleVoidVolume, volumeUnit) : undefined,
        sensation: d.sensation,
        leak: d.leak,
        note: d.note,
      });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goToStep = useCallback((target: number) => {
    const clamped = Math.max(1, Math.min(3, target));
    setSlideDir(clamped > step ? 'left' : 'right');
    setStep(clamped);
  }, [step]);

  const handleVolumeChange = useCallback((v: number) => {
    setVolume(v);
  }, []);

  const handleLeakToggle = useCallback(() => {
    setLeak(prev => !prev);
  }, []);

  const handleNoteToggle = useCallback(() => {
    if (!noteOpen) {
      setTimeout(() => {
        noteAreaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 150);
    }
    setNoteOpen(prev => !prev);
  }, [noteOpen]);

  const isBeforePrevBedtime = prevDayBedtime ? time <= prevDayBedtime.timestampIso : false;
  const isBeforeWakeTime = !isNightView && wakeTimeEntry ? time < wakeTimeEntry.timestampIso : false;
  const isAfterWakeTime = isNightView && wakeTimeEntry ? time >= wakeTimeEntry.timestampIso : false;
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
    if (isBeforeWakeTime && wakeTimeEntry) {
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      setTimeWarning(tv('beforeWakeUp', { time: formatTime(wakeTimeEntry.timestampIso, locale, timeZone) }));
      warningTimerRef.current = setTimeout(() => setTimeWarning(null), 4000);
      return;
    }
    if (isAfterWakeTime && wakeTimeEntry) {
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      setTimeWarning(tv('afterWakeUp', { time: formatTime(wakeTimeEntry.timestampIso, locale, timeZone) }));
      warningTimerRef.current = setTimeout(() => setTimeWarning(null), 4000);
      return;
    }
    if (isAfterBedtime && currentBedtime) {
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      setTimeWarning(tv('afterBedtime', { time: formatTime(currentBedtime.timestampIso, locale, timeZone) }));
      warningTimerRef.current = setTimeout(() => setTimeWarning(null), 4000);
      return;
    }
    savedRef.current = true;
    const data = {
      timestampIso: time,
      volumeMl: displayVolumeToMl(volume, volumeUnit),
      doubleVoidMl: doubleVoid ? displayVolumeToMl(doubleVoidVolume, volumeUnit) : undefined,
      sensation,
      leak,
      note,
      isFirstMorningVoid: false,
    };
    if (isEditing && editEntry) {
      updateVoid(editEntry.id, data);
    } else {
      addVoid(data);
    }
    onSave();
  }, [volume, sensation, leak, time, note, doubleVoid, doubleVoidVolume, isEditing, editEntry, addVoid, updateVoid, onSave, isBeforePrevBedtime, prevDayBedtime, dayNumber, volumeUnit, isBeforeWakeTime, isAfterWakeTime, wakeTimeEntry, isAfterBedtime, currentBedtime, tv]);

  const slideClass = slideDir === 'left' ? 'animate-step-in-left' : 'animate-step-in-right';

  return (
    <div className="select-none min-h-[60vh]">
      <div className="flex flex-col items-center gap-1 mb-3">
        <div className="flex justify-center gap-2">
          {[1, 2, 3].map((s) => (
            <button key={s} type="button" onClick={() => goToStep(s)}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                s === step ? 'bg-ipc-500 scale-125' : s < step ? 'bg-ipc-300' : 'bg-ipc-200/60'
              }`}
              aria-label={`Step ${s}`} />
          ))}
        </div>
        <span className="text-[11px] font-semibold tracking-wide text-ipc-400 uppercase">
          {tc('stepOf', { current: step, total: 3 })}
        </span>
      </div>

      {step > 1 && (
        <div className="px-2 mb-2">
          <button type="button" onClick={() => goToStep(step - 1)}
            className="inline-flex items-center gap-1 pl-2 pr-3 h-8 rounded-full bg-ipc-100 border border-ipc-200 text-ipc-600 active:scale-[0.95] active:bg-ipc-200 transition-all"
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
              <h3 className="text-xl font-bold text-center mb-3 text-ipc-950 px-10 text-balance">
                {t('howMuch')}
              </h3>

              {/* Quick-pick size presets (for users without a measuring cup) */}
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
                        className={`w-full min-h-[62px] px-2 py-2 rounded-2xl border-2 flex items-baseline justify-center gap-1 transition-all active:scale-[0.96] ${
                          active
                            ? 'bg-ipc-500 border-ipc-600 text-white shadow-md'
                            : 'bg-white border-ipc-200 text-ipc-950'
                        }`}
                        aria-pressed={active}
                      >
                        <span className="text-2xl font-bold leading-none tabular-nums">{p.value}</span>
                        <span className={`text-xs font-medium ${active ? 'text-white/85' : 'text-ipc-500'}`}>
                          {volumeUnit}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setShowCupHelp((v) => !v)}
                className="flex items-center justify-center gap-1.5 w-full text-sm text-ipc-500 hover:text-ipc-700 py-1.5 mb-2"
              >
                <HelpCircle size={14} />
                {t('noMeasuringCupHelp')}
              </button>

              {showCupHelp && (
                <div className="bg-ipc-50 rounded-2xl p-3 mb-3 text-sm text-ipc-950 leading-relaxed space-y-1.5 animate-fade-slide-up">
                  <p className="mb-2">{t('cupHelpIntro')}</p>
                  <p className="text-sm">{t('cupHelpVolumes', { values: VOLUME_PRESETS.map((p) => `${p.value} ${volumeUnit}`).join(' \u00b7 ') })}</p>
                </div>
              )}

              <VolumeInput value={volume} onChange={handleVolumeChange}
                unit={volumeUnit} max={vc.max} step={vc.step} />
              <div className="border-t border-ipc-100/60 mt-5 mb-4" />
              <div className="flex justify-center">
                <button type="button" onClick={() => setDoubleVoid(!doubleVoid)}
                  className={`inline-flex items-center gap-2 px-5 py-3 rounded-full text-base font-semibold transition-all active:scale-[0.95] ${
                    doubleVoid ? 'bg-ipc-500/15 text-ipc-700 ring-1 ring-ipc-500/30' : 'bg-white/40 text-ipc-400 border border-ipc-100/50'
                  }`}>
                  <CopyPlus size={16} />
                  <span className="flex flex-col items-start leading-tight">
                    <span>{t('doubleVoid')}</span>
                    <span className={`text-[10px] font-normal ${doubleVoid ? 'text-ipc-600' : 'text-ipc-500'}`}>
                      {t('doubleVoidDescription')}
                    </span>
                  </span>
                </button>
              </div>
              {doubleVoid && (
                <div className="mt-3 animate-fade-slide-up">
                  <label className="block text-sm font-medium text-ipc-500 mb-1 text-center">
                    {t('secondPeeAmount')}
                  </label>
                  <VolumeInput value={doubleVoidVolume} onChange={setDoubleVoidVolume}
                    unit={volumeUnit} max={volumeUnit === 'oz' ? 25 : 750} step={vc.step} />
                </div>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <h3 className="text-xl font-bold text-center mb-3 text-ipc-950 px-10 text-balance">
                {t('anythingElse')}
              </h3>
              <div className="mb-4">
                <SensationPicker value={sensation} onChange={setSensation} />
                {sensation === null && (
                  <p className="text-xs text-ipc-400 text-center mt-2">
                    {t('optionalTapHint')}
                  </p>
                )}
              </div>
              <div className="border-t border-ipc-100/60 my-4" />
              <p className="text-base font-semibold text-ipc-950 mb-2">
                {t('didAnythingElseHappen')}
              </p>
              <div className="flex justify-center gap-2 mb-2.5">
                <button type="button" onClick={handleLeakToggle}
                  className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-semibold transition-all active:scale-[0.95] ${
                    leak ? 'bg-ipc-500/15 text-ipc-700 ring-1 ring-ipc-500/30' : 'bg-white/40 text-ipc-400 border border-ipc-100/50'
                  }`}>
                  <Droplets size={15} />
                  {tc('log')}
                </button>
                <button type="button" onClick={handleNoteToggle}
                  className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-semibold transition-all active:scale-[0.95] ${
                    noteOpen || note ? 'bg-ipc-500/15 text-ipc-700 ring-1 ring-ipc-500/30' : 'bg-white/40 text-ipc-400 border border-ipc-100/50'
                  }`}>
                  <MessageSquarePlus size={15} />
                  {note && !noteOpen ? tc('noteAdded') : tc('addNote')}
                </button>
              </div>
              {noteOpen && (
                <div ref={noteAreaRef} className="note-expand mt-2 pb-2">
                  <div className="relative">
                    <textarea value={note} onChange={(e) => setNote(e.target.value)}
                      placeholder={t('notePlaceholder')}
                      autoFocus rows={2} maxLength={120}
                      className="w-full px-3 py-2.5 pr-11 rounded-xl border-2 border-ipc-200/50 focus:border-ipc-500/60 focus:ring-2 focus:ring-ipc-200/30 outline-none transition-all bg-white/50 backdrop-blur-sm text-ipc-950 text-sm resize-none" />
                    <button type="button" onClick={handleNoteToggle}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg bg-ipc-500 text-white active:scale-[0.9] transition-all"
                      aria-label={tc('done')}>
                      <Check size={16} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {step === 3 && (
            <div className="flex flex-col items-center min-h-[45vh] pt-4">
              {/* Recap of entries from earlier steps, so user can confirm before saving */}
              <div className="w-full mb-5 px-4 py-3 rounded-2xl bg-ipc-50/70 border border-ipc-100">
                <p className="text-[11px] font-semibold tracking-wide text-ipc-400 uppercase mb-1">
                  {tc('review')}
                </p>
                <p className="text-sm font-medium text-ipc-950 leading-snug">
                  {[
                    `${volume} ${volumeUnit}`,
                    doubleVoid ? `+ ${doubleVoidVolume} ${volumeUnit}` : null,
                    sensation !== null ? ts(`${sensation}.short`) : null,
                    leak ? t('leakRecap') : null,
                  ].filter(Boolean).join(' · ')}
                </p>
              </div>

              <h3 className="text-xl font-bold text-center mb-5 text-ipc-950 text-balance">
                {t('whenWasThis')}
              </h3>
              <TimePicker value={time} onChange={handleTimeChange} />
              {timeWarning && (
                <div className="mt-3 px-4 py-2.5 rounded-2xl bg-danger-light border border-danger/20 animate-fade-slide-up">
                  <p className="text-sm font-medium text-danger text-center">{timeWarning}</p>
                </div>
              )}
              <div className="flex justify-center mt-6">
                <Button onClick={handleSave} size="lg" disabled={volume <= 0}>
                  {isEditing ? tc('updateCheck') : tc('saveCheck')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sticky Next button on non-final steps — always visible, always the
          same spot, so users never hunt for the advance affordance. */}
      {step < 3 && (
        <div className="sticky bottom-0 -mx-5 mt-6 px-5 pt-5 pb-2 bg-gradient-to-t from-white via-white/95 to-white/0">
          <Button onClick={() => goToStep(step + 1)} fullWidth size="lg" disabled={volume <= 0}>
            {tc('next')}
            <ChevronRight size={18} className="ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
