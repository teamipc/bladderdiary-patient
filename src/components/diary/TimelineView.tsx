'use client';

import { useMemo, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Link, useRouter } from '@/i18n/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { Sun, Moon, Droplets, CheckCircle2, ChevronLeft, ChevronRight, Plus, RotateCcw, Check, CloudDrizzle, Pencil } from 'lucide-react';
import TimelineEvent from './TimelineEvent';
import DrinkIcon from '@/components/ui/DrinkIcon';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useDiaryStore } from '@/lib/store';
import { getDayDate, formatDate, formatTime, mlToDisplayVolume } from '@/lib/utils';
import type { VoidEntry, DrinkEntry, BedtimeEntry, WakeTimeEntry, LeakEntry } from '@/lib/types';

interface TimelineViewProps {
  dayNumber: 1 | 2 | 3;
  onLogVoid?: (initialTime?: string) => void;
  onLogDrink?: (initialTime?: string) => void;
  onLogBedtime?: () => void;
  onLogWakeUp?: () => void;
  onEditVoid?: (entry: VoidEntry) => void;
  onEditDrink?: (entry: DrinkEntry) => void;
  onEditBedtime?: (entry: BedtimeEntry) => void;
  onLogLeak?: (initialTime?: string) => void;
  onEditLeak?: (entry: LeakEntry) => void;
}

type TimelineItem =
  | { kind: 'void'; entry: VoidEntry }
  | { kind: 'drink'; entry: DrinkEntry }
  | { kind: 'bedtime'; entry: BedtimeEntry }
  | { kind: 'wakeup'; entry: WakeTimeEntry }
  | { kind: 'leak'; entry: LeakEntry };

/** Calculate the midpoint ISO timestamp between two ISO timestamps */
function midpointTime(a: string, b: string): string {
  const ta = new Date(a).getTime();
  const tb = new Date(b).getTime();
  return new Date(Math.round((ta + tb) / 2)).toISOString();
}

export default function TimelineView({ dayNumber, onLogVoid, onLogDrink, onLogBedtime, onLogWakeUp, onEditVoid, onEditDrink, onEditBedtime, onLogLeak, onEditLeak }: TimelineViewProps) {
  const {
    startDate,
    timeZone,
    getVoidsForDay,
    getDrinksForDay,
    getLeaksForDay,
    getBedtimeForDay,
    getWakeTimeForDay,
    removeVoid,
    removeDrink,
    removeLeak,
    removeBedtime,
    removeWakeTime,
    resetDiary,
  } = useDiaryStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('timeline');
  const tc = useTranslations('common');
  const tdt = useTranslations('drinkTypes');
  const tlt = useTranslations('leakTriggers');
  const { volumeUnit } = useDiaryStore();
  const locale = useLocale();

  const allVoids = getVoidsForDay(dayNumber);
  const allDrinks = getDrinksForDay(dayNumber);
  const allLeaks = getLeaksForDay(dayNumber);
  const bedtime = getBedtimeForDay(dayNumber);
  const wakeTime = getWakeTimeForDay(dayNumber);

  const dayDateStr = getDayDate(startDate, dayNumber);
  const dayLabel = formatDate(dayDateStr + 'T12:00:00', locale, timeZone);

  const hasWakeTime = !!wakeTime;
  const hasBedtime = !!bedtime;

  // Day navigation
  const prevDayBedtime = dayNumber > 1 ? getBedtimeForDay((dayNumber - 1) as 1 | 2 | 3) : undefined;
  const nextDayAccessible = dayNumber < 3 && hasBedtime;

  // Night phase: this day has a previous bedtime (i.e. there was an overnight period)
  const hasNightPhase = dayNumber > 1 && !!prevDayBedtime;

  // Night view: explicit ?view=night param, OR auto-detect (night phase, no wake time yet)
  const viewParam = searchParams.get('view');
  const isNighttime = hasNightPhase && (viewParam === 'night' || (!viewParam && !hasWakeTime));
  const isNightComplete = isNighttime && hasWakeTime;

  // Separate night vs day events: night = before wake time, day = at/after wake time
  const voids = isNighttime
    ? (hasWakeTime
      ? allVoids.filter((v) => v.timestampIso < wakeTime!.timestampIso)
      : allVoids)
    : hasWakeTime
      ? allVoids.filter((v) => v.timestampIso >= wakeTime!.timestampIso)
      : allVoids;
  const drinks = isNighttime
    ? (hasWakeTime
      ? allDrinks.filter((d) => d.timestampIso < wakeTime!.timestampIso)
      : allDrinks)
    : hasWakeTime
      ? allDrinks.filter((d) => d.timestampIso >= wakeTime!.timestampIso)
      : allDrinks;
  const leaks = isNighttime
    ? (hasWakeTime
      ? allLeaks.filter((l) => l.timestampIso < wakeTime!.timestampIso)
      : allLeaks)
    : hasWakeTime
      ? allLeaks.filter((l) => l.timestampIso >= wakeTime!.timestampIso)
      : allLeaks;

  const hasMorningVoid = allVoids.some((v) => v.isFirstMorningVoid);

  // 5-step journey: Day 1, Night 1, Day 2, Night 2, Day 3
  const day1Bedtime = !!getBedtimeForDay(1);
  const day2Wake = !!getWakeTimeForDay(2);
  const day2Bedtime = !!getBedtimeForDay(2);
  const day3Wake = !!getWakeTimeForDay(3);
  const day3Bedtime = !!getBedtimeForDay(3);

  type StepInfo = { label: string; complete: boolean; accessible: boolean; href: string; isCurrent: boolean };
  const journeySteps: StepInfo[] = [
    { label: 'D1', complete: day1Bedtime, accessible: true, href: '/diary/day/1', isCurrent: dayNumber === 1 && !isNighttime },
    { label: 'N1', complete: day2Wake, accessible: day1Bedtime, href: '/diary/day/2?view=night', isCurrent: dayNumber === 2 && isNighttime },
    { label: 'D2', complete: day2Bedtime, accessible: day2Wake, href: '/diary/day/2?view=day', isCurrent: dayNumber === 2 && !isNighttime },
    { label: 'N2', complete: day3Wake, accessible: day2Bedtime, href: '/diary/day/3?view=night', isCurrent: dayNumber === 3 && isNighttime },
    { label: 'D3', complete: day3Bedtime, accessible: day3Wake, href: '/diary/day/3?view=day', isCurrent: dayNumber === 3 && !isNighttime },
  ];

  // Navigation: find current step and determine prev/next
  const currentStepIdx = journeySteps.findIndex((s) => s.isCurrent);
  const prevStep = currentStepIdx > 0 ? journeySteps[currentStepIdx - 1] : null;
  const nextStep = currentStepIdx < journeySteps.length - 1 ? journeySteps[currentStepIdx + 1] : null;

  // Day is complete:
  const isDayComplete = dayNumber === 1
    ? voids.length > 0 && hasBedtime
    : hasMorningVoid && hasBedtime;

  // Track which "+" gap is expanded
  const [openInsertIdx, setOpenInsertIdx] = useState<number | null>(null);

  // Reset confirmation
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // M4: After Day 1 the user has seen the journey-tracker labels and learned
  // the D→N→D→N→D model. Collapse to compact dots from Day 2 onward to
  // reclaim ~30 px of vertical space above the day header — that's room
  // we'd otherwise have to fight for elsewhere.
  const journeyCompact = dayNumber > 1;

  // Delete confirmation — for ANY event the user taps the trash icon on
  type PendingDelete =
    | { kind: 'void'; id: string; label: string }
    | { kind: 'drink'; id: string; label: string }
    | { kind: 'leak'; id: string; label: string }
    | { kind: 'bedtime'; dayNumber: 1 | 2 | 3; label: string }
    | { kind: 'wakeup'; dayNumber: 1 | 2 | 3; label: string };
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);

  const requestDeleteVoid = useCallback((id: string) => {
    const v = allVoids.find((x) => x.id === id);
    if (!v) return;
    const time = formatTime(v.timestampIso, locale, timeZone);
    const vol = mlToDisplayVolume(v.volumeMl, volumeUnit);
    setPendingDelete({ kind: 'void', id, label: `${vol} ${volumeUnit} · ${time}` });
  }, [allVoids, locale, timeZone, volumeUnit]);

  const requestDeleteDrink = useCallback((id: string) => {
    const d = allDrinks.find((x) => x.id === id);
    if (!d) return;
    const time = formatTime(d.timestampIso, locale, timeZone);
    const vol = mlToDisplayVolume(d.volumeMl, volumeUnit);
    setPendingDelete({ kind: 'drink', id, label: `${tdt(d.drinkType)} · ${vol} ${volumeUnit} · ${time}` });
  }, [allDrinks, locale, timeZone, volumeUnit, tdt]);

  const requestDeleteLeak = useCallback((id: string) => {
    const l = allLeaks.find((x) => x.id === id);
    if (!l) return;
    const time = formatTime(l.timestampIso, locale, timeZone);
    setPendingDelete({ kind: 'leak', id, label: `${tlt(`${l.trigger}.label`)} · ${time}` });
  }, [allLeaks, locale, timeZone, tlt]);

  const requestDeleteBedtime = useCallback((dayNumber: 1 | 2 | 3) => {
    const b = bedtime;
    if (!b) return;
    const time = formatTime(b.timestampIso, locale, timeZone);
    setPendingDelete({ kind: 'bedtime', dayNumber, label: time });
  }, [bedtime, locale, timeZone]);

  const requestDeleteWakeUp = useCallback((dayNumber: 1 | 2 | 3) => {
    const w = wakeTime;
    if (!w) return;
    const time = formatTime(w.timestampIso, locale, timeZone);
    setPendingDelete({ kind: 'wakeup', dayNumber, label: time });
  }, [wakeTime, locale, timeZone]);

  const confirmDelete = useCallback(() => {
    if (!pendingDelete) return;
    switch (pendingDelete.kind) {
      case 'void': removeVoid(pendingDelete.id); break;
      case 'drink': removeDrink(pendingDelete.id); break;
      case 'leak': removeLeak(pendingDelete.id); break;
      case 'bedtime': removeBedtime(pendingDelete.dayNumber); break;
      case 'wakeup': removeWakeTime(pendingDelete.dayNumber); break;
    }
    setPendingDelete(null);
  }, [pendingDelete, removeVoid, removeDrink, removeLeak, removeBedtime, removeWakeTime]);


  // Handle "Wake up" button — opens wake-up time form
  const handleWakeUp = useCallback(() => {
    onLogWakeUp?.();
  }, [onLogWakeUp]);

  // Merge and sort all events chronologically
  const items = useMemo<TimelineItem[]>(() => {
    const all: TimelineItem[] = [
      ...voids.map((entry) => ({ kind: 'void' as const, entry })),
      ...drinks.map((entry) => ({ kind: 'drink' as const, entry })),
      ...leaks.map((entry) => ({ kind: 'leak' as const, entry })),
      ...(!isNighttime && bedtime ? [{ kind: 'bedtime' as const, entry: bedtime }] : []),
      ...(isNighttime && prevDayBedtime ? [{ kind: 'bedtime' as const, entry: prevDayBedtime }] : []),
      ...(wakeTime ? [{ kind: 'wakeup' as const, entry: wakeTime }] : []),
    ];
    const kindOrder = (k: string) =>
      k === 'wakeup' ? 0 : k === 'bedtime' ? 2 : 1;
    return all.sort((a, b) => {
      const cmp = a.entry.timestampIso.localeCompare(b.entry.timestampIso);
      return cmp !== 0 ? cmp : kindOrder(a.kind) - kindOrder(b.kind);
    });
  }, [voids, drinks, leaks, bedtime, wakeTime, isNighttime, prevDayBedtime]);

  const handleInsertVoid = (gapIdx: number) => {
    if (gapIdx < items.length - 1) {
      const timeBefore = items[gapIdx].entry.timestampIso;
      const timeAfter = items[gapIdx + 1].entry.timestampIso;
      const mid = midpointTime(timeBefore, timeAfter);
      setOpenInsertIdx(null);
      onLogVoid?.(mid);
    } else {
      setOpenInsertIdx(null);
      onLogVoid?.();
    }
  };

  const handleInsertDrink = (gapIdx: number) => {
    if (gapIdx < items.length - 1) {
      const timeBefore = items[gapIdx].entry.timestampIso;
      const timeAfter = items[gapIdx + 1].entry.timestampIso;
      const mid = midpointTime(timeBefore, timeAfter);
      setOpenInsertIdx(null);
      onLogDrink?.(mid);
    } else {
      setOpenInsertIdx(null);
      onLogDrink?.();
    }
  };

  const handleInsertLeak = (gapIdx: number) => {
    if (gapIdx < items.length - 1) {
      const timeBefore = items[gapIdx].entry.timestampIso;
      const timeAfter = items[gapIdx + 1].entry.timestampIso;
      const mid = midpointTime(timeBefore, timeAfter);
      setOpenInsertIdx(null);
      onLogLeak?.(mid);
    } else {
      setOpenInsertIdx(null);
      onLogLeak?.();
    }
  };

  const renderTimelineItem = (item: TimelineItem) => {
    if (item.kind === 'void') {
      return (
        <TimelineEvent key={item.entry.id} type="void" entry={item.entry} onDelete={requestDeleteVoid} onEdit={onEditVoid} nightMode={isNighttime} />
      );
    }
    if (item.kind === 'drink') {
      return (
        <TimelineEvent key={item.entry.id} type="drink" entry={item.entry} onDelete={requestDeleteDrink} onEdit={onEditDrink} nightMode={isNighttime} />
      );
    }
    if (item.kind === 'leak') {
      return (
        <TimelineEvent key={item.entry.id} type="leak" entry={item.entry} onDelete={requestDeleteLeak} onEdit={onEditLeak} nightMode={isNighttime} />
      );
    }
    if (item.kind === 'wakeup') {
      if (!isNighttime) {
        const noDayEvents = voids.length === 0 && drinks.length === 0 && leaks.length === 0;
        return (
          <div key={item.entry.id} className="px-4 py-2">
            <div className="flex items-center gap-2">
              <Sun size={16} className="text-warning shrink-0" />
              <span className="text-sm font-medium text-ipc-700">
                {t('wokeUpAt', { time: formatTime(item.entry.timestampIso, locale, timeZone) })}
              </span>
            </div>
            {noDayEvents && (
              <p className="text-xs text-ipc-800 mt-1 ml-6 animate-fade-slide-up">
                {t('addFirstEvent')}
              </p>
            )}
          </div>
        );
      }
      return (
        <TimelineEvent key={item.entry.id} type="wakeup" entry={item.entry} onDelete={(dn) => requestDeleteWakeUp(dn as 1 | 2 | 3)} />
      );
    }
    // Bedtime in night view — context text
    if (isNighttime) {
      return (
        <div key={item.entry.id} className="flex items-center gap-2 px-4 py-2">
          <Moon size={16} className="text-indigo-400 shrink-0" />
          <span className="text-sm font-medium text-indigo-300">
            {t('wentToBedAt', { time: formatTime(item.entry.timestampIso, locale, timeZone) })}
          </span>
        </div>
      );
    }
    return (
      <TimelineEvent key={item.entry.id} type="bedtime" entry={item.entry} onDelete={(dn) => requestDeleteBedtime(dn as 1 | 2 | 3)} onEdit={onEditBedtime} />
    );
  };

  const deleteTitle = pendingDelete
    ? pendingDelete.kind === 'void'
      ? tc('deletePeeTitle')
      : pendingDelete.kind === 'drink'
        ? tc('deleteDrinkTitle')
        : pendingDelete.kind === 'leak'
          ? tc('deleteLeakTitle')
          : pendingDelete.kind === 'bedtime'
            ? tc('deleteBedtimeTitle')
            : tc('deleteWakeUpTitle')
    : '';

  return (
    <div className={`flex flex-col transition-colors duration-700 ${
      isNighttime ? 'nighttime-tint -mx-4 px-4 -mt-4 pt-7 min-h-dvh pb-44' : 'rounded-2xl pb-44'
    }`}>
      {/* 5-step journey progress: D1 -> N1 -> D2 -> N2 -> D3.
          On Day 1 we show the labelled version so the user learns the model.
          From Day 2 onward we collapse to a compact dot-strip — the user
          already knows the structure, so reclaim ~30 px of vertical real
          estate above the day header. The compact version still shows
          progress (filled vs. hollow circles) without the verbose labels. */}
      <div className={`flex items-center justify-center px-4 ${journeyCompact ? 'mb-1.5' : 'mb-3'}`}>
        {journeySteps.map((step, idx) => {
          const isNight = step.label.startsWith('N');

          let circleClass: string;
          let labelClass: string;
          if (isNighttime) {
            if (step.isCurrent) {
              circleClass = isNight
                ? 'bg-indigo-400/80 text-white ring-1 ring-indigo-300/30'
                : 'bg-ipc-400/80 text-white ring-1 ring-ipc-300/30';
              labelClass = 'text-indigo-300/70';
            } else if (step.complete) {
              circleClass = 'bg-indigo-400/40 text-white/80';
              labelClass = 'text-indigo-400/40';
            } else {
              circleClass = 'bg-indigo-500/15 text-indigo-400/30';
              labelClass = 'text-indigo-500/20';
            }
          } else {
            if (step.isCurrent) {
              circleClass = 'bg-ipc-500 text-white ring-1 ring-ipc-300/30';
              labelClass = 'text-ipc-700';
            } else if (step.complete) {
              circleClass = isNight ? 'bg-bedtime/70 text-white' : 'bg-ipc-400 text-white';
              labelClass = isNight ? 'text-bedtime' : 'text-ipc-600';
            } else {
              circleClass = 'bg-ipc-200 text-ipc-700';
              labelClass = 'text-ipc-700';
            }
          }

          const showLine = idx < journeySteps.length - 1;
          const lineComplete = step.complete;
          const stepNumber = step.label[1];

          // Show a tiny pencil overlay on completed, non-current DAY dots so
          // the user understands they can tap to look back and edit. Restricted
          // to Day steps (D1/D2/D3) since Night phases are short and uncommon
          // edit targets — keeps the arc readable for boomers.
          const showEditHint = step.complete && !step.isCurrent && !isNight;

          const circleContent = journeyCompact ? (
            <div className="relative">
              <div className={`w-4 h-4 rounded-full flex items-center justify-center transition-all ${circleClass}`}>
                {step.complete && !step.isCurrent ? (
                  <Check size={9} strokeWidth={3} />
                ) : isNight ? (
                  <Moon size={8} strokeWidth={2.5} />
                ) : (
                  <Sun size={9} strokeWidth={2.5} />
                )}
              </div>
              {showEditHint && (
                <span
                  className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full flex items-center justify-center ${
                    isNighttime ? 'bg-indigo-300/80' : 'bg-ipc-300'
                  }`}
                  aria-hidden="true"
                >
                  <Pencil size={5} strokeWidth={2.5} className="text-white" />
                </span>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <div className="relative">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center
                  transition-all ${circleClass}`}>
                  {step.complete && !step.isCurrent ? (
                    <Check size={12} strokeWidth={3} />
                  ) : isNight ? (
                    <Moon size={11} strokeWidth={2.5} />
                  ) : (
                    <Sun size={12} strokeWidth={2.5} />
                  )}
                </div>
                {showEditHint && (
                  <span
                    className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-ipc-300 flex items-center justify-center"
                    aria-hidden="true"
                  >
                    <Pencil size={7} strokeWidth={2.5} className="text-white" />
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-semibold leading-none ${labelClass}`}>
                {isNight ? tc('night', { number: stepNumber }) : tc('day', { number: stepNumber })}
              </span>
            </div>
          );

          return (
            <div key={step.label} className="flex items-center">
              {step.accessible ? (
                <Link
                  href={step.href}
                  className="active:scale-[0.9] transition-all"
                  aria-label={t('goTo', { label: isNight ? tc('night', { number: stepNumber }) : tc('day', { number: stepNumber }) }) + (step.complete ? ' (complete)' : step.isCurrent ? ' (current)' : '')}
                >
                  {circleContent}
                </Link>
              ) : (
                <div aria-label={`${isNight ? tc('night', { number: stepNumber }) : tc('day', { number: stepNumber })} (locked)`}>
                  {circleContent}
                </div>
              )}
              {showLine && (
                <div className={`h-px mx-1 transition-colors ${journeyCompact ? 'w-3 mt-0' : 'flex-1 w-4 mt-[-12px]'} ${
                  isNighttime
                    ? lineComplete ? 'bg-indigo-400/40' : 'bg-indigo-500/10'
                    : lineComplete ? 'bg-ipc-300' : 'bg-ipc-100'
                }`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Day header with navigation arrows */}
      <div className="flex items-center justify-between px-1 mb-3">
        {prevStep ? (
          prevStep.accessible ? (
            <Link
              href={prevStep.href}
              className={`w-10 h-10 flex items-center justify-center rounded-full transition-all
                active:scale-[0.9] ${
                  isNighttime ? 'text-indigo-200 hover:bg-indigo-500/20' : 'text-ipc-600 hover:bg-ipc-100'
                }`}
              aria-label={t('goTo', { label: prevStep.label })}
            >
              <ChevronLeft size={24} strokeWidth={2.5} />
            </Link>
          ) : (
            <div className={`w-10 h-10 flex items-center justify-center rounded-full ${
              isNighttime ? 'text-indigo-500/30' : 'text-ipc-200'
            }`}>
              <ChevronLeft size={24} strokeWidth={2.5} />
            </div>
          )
        ) : (
          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="w-10 h-10 flex items-center justify-center rounded-full
              text-ipc-400 hover:text-danger hover:bg-danger-light transition-all active:scale-[0.9]"
            aria-label={t('startOver')}
          >
            <RotateCcw size={20} strokeWidth={2} />
          </button>
        )}

        <div className="text-center">
          <h2 className={`text-xl font-bold text-balance ${isNighttime ? 'text-indigo-100' : 'text-ipc-950'}`}>
            {isNighttime ? tc('night', { number: dayNumber - 1 }) : tc('day', { number: dayNumber })}
          </h2>
          <span className={`font-medium text-sm ${isNighttime ? 'text-indigo-300/80' : 'text-ipc-700'}`}>
            {dayLabel}
          </span>
          {/* L1: persistent progress subtitle so users always see how far they are */}
          {!isNighttime && (
            <div className={`text-xs mt-0.5 font-semibold ${isNighttime ? 'text-indigo-300/60' : 'text-ipc-700'}`}>
              {t('progressSubtitle', {
                day: dayNumber,
                total: 3,
                count: voids.length + drinks.length + leaks.length,
              })}
            </div>
          )}
        </div>

        {nextStep ? (
          nextStep.accessible ? (
            <Link
              href={nextStep.href}
              className={`w-10 h-10 flex items-center justify-center rounded-full transition-all
                active:scale-[0.9] ${
                  isNighttime ? 'text-indigo-200 hover:bg-indigo-500/20' : 'text-ipc-600 hover:bg-ipc-100'
                }`}
              aria-label={t('goTo', { label: nextStep.label })}
            >
              <ChevronRight size={24} strokeWidth={2.5} />
            </Link>
          ) : (
            <div
              className={`w-10 h-10 flex items-center justify-center rounded-full ${
                isNighttime ? 'text-indigo-500/30' : 'text-ipc-200'
              }`}
            >
              <ChevronRight size={24} strokeWidth={2.5} />
            </div>
          )
        ) : isDayComplete && dayNumber === 3 ? (
          <Link
            href="/summary"
            className="w-10 h-10 flex items-center justify-center rounded-full transition-all
              active:scale-[0.9] text-ipc-600 hover:bg-ipc-100"
            aria-label={t('viewResults')}
          >
            <ChevronRight size={24} strokeWidth={2.5} />
          </Link>
        ) : (
          <div className="w-10 h-10" />
        )}
      </div>

      <div className="mb-2" />

      {/* Empty state */}
      {items.length === 0 ? (
        <div className="text-center py-12">
          {isNighttime ? (
            <Moon size={48} className="text-indigo-300/60 mx-auto mb-4" />
          ) : (
            <Sun size={48} className="text-ipc-300 mx-auto mb-4" />
          )}
          <p className={`text-lg font-semibold mb-1 ${isNighttime ? 'text-indigo-100' : 'text-ipc-800'}`}>
            {isNighttime ? t('goodEvening') : dayNumber === 1 ? t('hello') : t('goodMorning')}
          </p>
          {!isNighttime && (
            <p className={`text-base mb-5 ${isNighttime ? 'text-indigo-300/80' : 'text-ipc-500'}`}>
              {dayNumber === 1 && !hasWakeTime
                ? t('startByWakeUp')
                : t('addFirstPee', { dayNumber })}
            </p>
          )}
          {isNighttime ? (
            <div className="space-y-4">
              <p className="text-lg font-medium text-indigo-100 text-center mb-2 animate-night-hero">
                {t('overnightQuestion')}
              </p>
              <div className="flex justify-center gap-3 animate-night-actions">
                {onLogVoid && (
                  <button type="button" onClick={() => onLogVoid()}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold text-base active:scale-[0.97] transition-all bg-indigo-500 text-white">
                    <Droplets size={16} />
                    {t('pee')}
                  </button>
                )}
                {onLogDrink && (
                  <button type="button" onClick={() => onLogDrink()}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold text-base active:scale-[0.97] transition-all bg-indigo-400/30 text-indigo-100 border border-indigo-400/30">
                    <DrinkIcon name="GlassWater" size={16} className="text-indigo-200" />
                    {t('drink')}
                  </button>
                )}
                {onLogLeak && (
                  <button type="button" onClick={() => onLogLeak()}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold text-base active:scale-[0.97] transition-all bg-indigo-400/30 text-indigo-100 border border-indigo-400/30">
                    <CloudDrizzle size={16} className="text-indigo-200" />
                    {t('leak')}
                  </button>
                )}
              </div>
              {onLogWakeUp && (
                <div className="flex flex-col items-center gap-2 mt-8">
                  <div className="w-12 h-px bg-indigo-400/20 mx-auto" />
                  <p className="text-xs text-indigo-400/60 text-center">
                    {t('nothingOvernight')}
                  </p>
                  <button type="button" onClick={handleWakeUp}
                    className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl font-medium text-sm active:scale-[0.97] transition-all bg-indigo-400/20 text-indigo-300 border border-indigo-400/25 animate-start-day">
                    {t('continueToDay')}
                    <Sun size={14} />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {dayNumber === 1 && !hasWakeTime && onLogWakeUp ? (
                <button type="button" onClick={handleWakeUp}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold text-base active:scale-[0.97] transition-all bg-warning/15 text-warning border border-warning/30 animate-wake-guide">
                  <Sun size={18} />
                  {t('addWakeUpTime')}
                </button>
              ) : (
                onLogVoid && (
                  <button type="button" onClick={() => onLogVoid()}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold text-base active:scale-[0.97] transition-all bg-ipc-500 text-white animate-cta-guide">
                    {t('addFirstPeeButton')}
                    <ChevronRight size={18} />
                  </button>
                )
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-0">
          {items.map((item, idx) => (
            <div key={item.entry.id} className="relative pb-4">
              {renderTimelineItem(item)}

              {!isDayComplete && !isNightComplete && (dayNumber !== 1 || hasWakeTime) && (
                <div className="absolute -bottom-0 left-0 right-0 flex justify-center z-10">
                  {openInsertIdx === idx ? (
                    <div className={`flex items-center gap-2 animate-scale-in backdrop-blur-sm rounded-full px-2 py-0.5 ${
                      isNighttime ? 'bg-indigo-900/80' : 'bg-white/80'
                    }`}>
                      <button type="button" onClick={() => handleInsertVoid(idx)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-[0.95] ${
                          isNighttime ? 'bg-indigo-500/25 text-indigo-200 border border-indigo-400/30' : 'bg-void/10 text-void border border-void/20'
                        }`}>
                        <Droplets size={12} />
                        {t('pee')}
                      </button>
                      <button type="button" onClick={() => handleInsertDrink(idx)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-[0.95] ${
                          isNighttime ? 'bg-indigo-500/25 text-indigo-200 border border-indigo-400/30' : 'bg-drink/10 text-drink border border-drink/20'
                        }`}>
                        <DrinkIcon name="GlassWater" size={12} className={isNighttime ? 'text-indigo-200' : 'text-drink'} />
                        {t('drink')}
                      </button>
                      <button type="button" onClick={() => handleInsertLeak(idx)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-[0.95] ${
                          isNighttime ? 'bg-indigo-500/25 text-indigo-200 border border-indigo-400/30' : 'bg-leak/10 text-leak border border-leak/20'
                        }`}>
                        <CloudDrizzle size={12} />
                        {t('leak')}
                      </button>
                      <button type="button" onClick={() => setOpenInsertIdx(null)}
                        className={`w-6 h-6 flex items-center justify-center rounded-full text-xs transition-all active:scale-[0.9] ${
                          isNighttime ? 'text-indigo-400 hover:bg-indigo-500/20' : 'text-ipc-300 hover:bg-ipc-100'
                        }`}
                        aria-label={tc('cancel')}>
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setOpenInsertIdx(idx)}
                      className={`w-6 h-6 flex items-center justify-center rounded-full transition-all active:scale-[0.85] shadow-sm ${
                        isNighttime
                          ? 'bg-indigo-900/80 text-indigo-400/60 hover:text-indigo-300 hover:bg-indigo-500/30 border border-indigo-400/20'
                          : 'bg-white text-ipc-300 hover:text-ipc-500 hover:bg-ipc-50 border border-ipc-100'
                      }`}
                      aria-label={t('insertEvent')}>
                      <Plus size={12} strokeWidth={2.5} />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Night prompt */}
      {isNighttime && !isNightComplete && voids.length === 0 && drinks.length === 0 && leaks.length === 0 && !hasWakeTime && (
        <div className="text-center py-6 space-y-6">
          <p className="text-base font-medium text-indigo-200/80 animate-night-hero">
            {t('overnightQuestion')}
          </p>
          <p className="text-xs text-indigo-400/50 animate-night-actions">
            {t('useInsertButton')}
          </p>
          {onLogWakeUp && (
            <button type="button" onClick={handleWakeUp}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl font-medium text-sm active:scale-[0.97] transition-all bg-indigo-400/20 text-indigo-300 border border-indigo-400/25 animate-start-day">
              {t('continueToDay')}
              <Sun size={14} />
            </button>
          )}
        </div>
      )}

      {/* Wake-up reminder */}
      {isNighttime && !isNightComplete && (voids.length > 0 || drinks.length > 0 || leaks.length > 0) && onLogWakeUp && (
        <div className="mt-4 px-4 py-3 rounded-2xl bg-warning/10 border border-warning/25 animate-fade-slide-up">
          <div className="flex items-center gap-3">
            <Sun size={20} className="shrink-0 text-warning" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-warning">
                {t('markWakeUp')}
              </p>
              <p className="text-xs mt-0.5 font-medium text-warning/70">
                {t('addOvernightFirst')}
              </p>
            </div>
            <button type="button" onClick={handleWakeUp}
              className="px-4 py-2 rounded-full text-sm font-semibold bg-warning text-white active:scale-[0.95] transition-all">
              {t('wakeUp')}
            </button>
          </div>
        </div>
      )}

      {/* Night complete indicator */}
      {isNightComplete && (
        <div className="mt-4 space-y-2.5">
          <div className="px-4 py-2.5 rounded-2xl bg-indigo-500/15 border border-indigo-400/20">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-indigo-400" />
              <p className="text-sm font-medium text-indigo-300">
                {t('nightComplete', { number: dayNumber - 1 })}
              </p>
            </div>
          </div>
          <Link
            href={`/diary/day/${dayNumber}?view=day`}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-ipc-500 text-white font-semibold text-base active:scale-[0.97] transition-all animate-fade-slide-up"
          >
            {t('continueToDay')}
            <Sun size={16} />
          </Link>
        </div>
      )}

      {/* Bedtime reminder — full-width button below text so it doesn't collide with the FAB */}
      {(voids.length > 0 || drinks.length > 0 || leaks.length > 0) && !hasBedtime && !isNighttime && (
        <div className="mt-4 px-4 py-4 rounded-2xl bg-bedtime/10 border border-bedtime/25 animate-reminder">
          <div className="flex items-start gap-3 mb-3">
            <Moon size={20} className="shrink-0 text-bedtime mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-bedtime">
                {t('markBedtime')}
              </p>
              <p className="text-xs mt-0.5 font-medium text-bedtime/80">
                {t('addBeforeBedtime')}
              </p>
            </div>
          </div>
          {onLogBedtime && (
            <button type="button" onClick={onLogBedtime}
              className="w-full min-h-[48px] flex items-center justify-center gap-2 px-5 rounded-2xl text-base font-semibold bg-bedtime text-white active:scale-[0.97] transition-all">
              <Moon size={18} />
              {t('goToBed')}
            </button>
          )}
        </div>
      )}

      {/* Day complete indicator */}
      {isDayComplete && !isNighttime && (
        <div className="mt-4 space-y-2.5">
          <div className="px-4 py-2.5 rounded-2xl bg-ipc-100/30 border border-ipc-200/30 animate-complete">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-ipc-400" />
              <p className="text-sm font-medium text-ipc-500">
                {t('dayComplete', { dayNumber })}
              </p>
            </div>
          </div>
          {dayNumber < 3 && nextDayAccessible && (
            <div className="space-y-3">
              <div className="px-4 py-3.5 rounded-2xl bg-bedtime/5 border border-bedtime/20">
                <div className="flex items-start gap-2.5 mb-3">
                  <Moon size={18} className="shrink-0 text-bedtime mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-ipc-900">
                      {t('overnightNocturiaPrompt')}
                    </p>
                    <p className="text-xs text-ipc-600 mt-0.5 leading-snug">
                      {t('overnightNocturiaHint')}
                    </p>
                  </div>
                </div>
                <Link
                  href={`/diary/day/${dayNumber + 1}?view=night&add=void`}
                  className="flex items-center justify-center gap-2 w-full px-5 py-3 rounded-2xl bg-bedtime text-white font-semibold text-base active:scale-[0.97] transition-all"
                >
                  <Droplets size={18} />
                  {t('logOvernightPee')}
                </Link>
              </div>
              <Link
                href={`/diary/day/${dayNumber + 1}?view=night`}
                className="flex items-center justify-center gap-2 w-full px-5 py-3 rounded-2xl bg-ipc-100/70 border border-ipc-200/70 text-ipc-700 font-semibold text-base active:scale-[0.97] transition-all"
              >
                {t('noOvernightContinueButton', { dayNumber: dayNumber + 1 })}
                <ChevronRight size={18} />
              </Link>
            </div>
          )}
          {dayNumber === 3 && (
            <Link
              href="/summary"
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-ipc-500 text-white font-semibold text-base active:scale-[0.97] transition-all animate-cta-guide"
            >
              {t('viewResults')}
              <ChevronRight size={18} />
            </Link>
          )}
        </div>
      )}

      {/* Delete-event confirmation. Boomers with shaky thumbs sit a few px from
          the trash icon — undoing a silent delete with no toast was causing
          accidental data loss on the diary they're trying to complete. */}
      <ConfirmDialog
        open={pendingDelete !== null}
        title={deleteTitle}
        message={pendingDelete?.label}
        confirmLabel={tc('delete')}
        cancelLabel={tc('cancel')}
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      {/* Reset confirmation overlay */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 backdrop-dim" onClick={() => setShowResetConfirm(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl mx-6 p-6 max-w-sm w-full animate-scale-in">
            <div className="text-center">
              <RotateCcw size={36} className="text-danger mx-auto mb-3" />
              <h3 className="text-lg font-bold text-ipc-950 mb-1 text-balance">{t('startOver')}</h3>
              <p className="text-sm text-ipc-600 mb-5">
                {t('clearAllWarning')}
              </p>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowResetConfirm(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-base bg-ipc-50 text-ipc-800 border border-ipc-200 active:scale-[0.97] transition-all">
                  {tc('cancel')}
                </button>
                <button type="button" onClick={() => { resetDiary(); setShowResetConfirm(false); router.replace('/'); }}
                  className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-base bg-danger text-white active:scale-[0.97] transition-all">
                  {t('clearAll')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
