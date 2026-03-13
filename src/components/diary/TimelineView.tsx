'use client';

import { useMemo, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Sun, Moon, Droplets, CheckCircle2, ChevronLeft, ChevronRight, Plus, RotateCcw, Check, CloudDrizzle } from 'lucide-react';
import TimelineEvent from './TimelineEvent';
import DrinkIcon from '@/components/ui/DrinkIcon';
import { useDiaryStore } from '@/lib/store';
import { getDayDate, formatDate, formatTime } from '@/lib/utils';
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

  const allVoids = getVoidsForDay(dayNumber);
  const allDrinks = getDrinksForDay(dayNumber);
  const allLeaks = getLeaksForDay(dayNumber);
  const bedtime = getBedtimeForDay(dayNumber);
  const wakeTime = getWakeTimeForDay(dayNumber);

  const dayDateStr = getDayDate(startDate, dayNumber);
  const dayLabel = formatDate(dayDateStr + 'T12:00:00');

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
  // Day 1: first void logged + bedtime set (no wake-up needed, diary starts with first void)
  // Day 2/3: morning void tagged + bedtime set
  const isDayComplete = dayNumber === 1
    ? voids.length > 0 && hasBedtime
    : hasMorningVoid && hasBedtime;

  // Track which "+" gap is expanded
  const [openInsertIdx, setOpenInsertIdx] = useState<number | null>(null);

  // Reset confirmation
  const [showResetConfirm, setShowResetConfirm] = useState(false);


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
      // Day view: show current day's bedtime (marks end of day)
      ...(!isNighttime && bedtime ? [{ kind: 'bedtime' as const, entry: bedtime }] : []),
      // Night view: show previous day's bedtime (marks start of night)
      ...(isNighttime && prevDayBedtime ? [{ kind: 'bedtime' as const, entry: prevDayBedtime }] : []),
      // Wake time shows in both night view (marks end of night) and day view (marks start of day)
      ...(wakeTime ? [{ kind: 'wakeup' as const, entry: wakeTime }] : []),
    ];
    // Sort priority: wakeup first, bedtime last at same timestamp
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
      // After last event — no pre-set time
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
        <TimelineEvent
          key={item.entry.id}
          type="void"
          entry={item.entry}
          onDelete={removeVoid}
          onEdit={onEditVoid}
          nightMode={isNighttime}
        />
      );
    }
    if (item.kind === 'drink') {
      return (
        <TimelineEvent
          key={item.entry.id}
          type="drink"
          entry={item.entry}
          onDelete={removeDrink}
          onEdit={onEditDrink}
          nightMode={isNighttime}
        />
      );
    }
    if (item.kind === 'leak') {
      return (
        <TimelineEvent
          key={item.entry.id}
          type="leak"
          entry={item.entry}
          onDelete={removeLeak}
          onEdit={onEditLeak}
          nightMode={isNighttime}
        />
      );
    }
    if (item.kind === 'wakeup') {
      // In day view, wake-up is just context (start of day) — show as simple text
      if (!isNighttime) {
        const noDayEvents = voids.length === 0 && drinks.length === 0 && leaks.length === 0;
        return (
          <div key={item.entry.id} className="px-4 py-2">
            <div className="flex items-center gap-2">
              <Sun size={16} className="text-warning shrink-0" />
              <span className="text-sm font-medium text-ipc-500">
                Woke up at {formatTime(item.entry.timestampIso)}
              </span>
            </div>
            {noDayEvents && (
              <p className="text-xs text-ipc-400 mt-1 ml-6 animate-fade-slide-up">
                Add your first event of the day
              </p>
            )}
          </div>
        );
      }
      return (
        <TimelineEvent
          key={item.entry.id}
          type="wakeup"
          entry={item.entry}
          onDelete={(dn) => removeWakeTime(dn as 1 | 2 | 3)}
        />
      );
    }
    // In night view, bedtime is just context (start of night) — show as simple text
    if (isNighttime) {
      return (
        <div key={item.entry.id} className="flex items-center gap-2 px-4 py-2">
          <Moon size={16} className="text-indigo-400 shrink-0" />
          <span className="text-sm font-medium text-indigo-300">
            Went to bed at {formatTime(item.entry.timestampIso)}
          </span>
        </div>
      );
    }
    return (
      <TimelineEvent
        key={item.entry.id}
        type="bedtime"
        entry={item.entry}
        onDelete={(dn) => removeBedtime(dn as 1 | 2 | 3)}
        onEdit={onEditBedtime}
      />
    );
  };

  return (
    <div className={`flex flex-col transition-colors duration-700 ${
      isNighttime ? 'nighttime-tint -mx-4 px-4 -mt-4 pt-7 min-h-screen pb-24' : 'rounded-2xl pb-28'
    }`}>
      {/* 5-step journey progress: D1 → N1 → D2 → N2 → D3 */}
      <div className="flex items-center justify-center mb-3 px-4">
        {journeySteps.map((step, idx) => {
          const isNight = step.label.startsWith('N');

          // Circle colors
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
              circleClass = 'bg-ipc-400 text-white ring-1 ring-ipc-300/30';
              labelClass = 'text-ipc-500';
            } else if (step.complete) {
              circleClass = isNight ? 'bg-bedtime/60 text-white' : 'bg-ipc-300 text-white';
              labelClass = isNight ? 'text-bedtime/50' : 'text-ipc-300';
            } else {
              circleClass = 'bg-ipc-100 text-ipc-300';
              labelClass = 'text-ipc-200';
            }
          }

          const showLine = idx < journeySteps.length - 1;
          const lineComplete = step.complete;

          const circleContent = (
            <div className="flex flex-col items-center gap-0.5">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold
                transition-all ${circleClass}`}>
                {step.complete && !step.isCurrent ? <Check size={9} strokeWidth={3} /> : step.label}
              </div>
              <span className={`text-[8px] font-medium leading-none ${labelClass}`}>
                {isNight ? `Night ${step.label[1]}` : `Day ${step.label[1]}`}
              </span>
            </div>
          );

          return (
            <div key={step.label} className="flex items-center">
              {step.accessible ? (
                <Link
                  href={step.href}
                  className="active:scale-[0.9] transition-all"
                  aria-label={`${isNight ? 'Night' : 'Day'} ${step.label[1]}${step.complete ? ' (complete)' : step.isCurrent ? ' (current)' : ''}`}
                >
                  {circleContent}
                </Link>
              ) : (
                <div aria-label={`${isNight ? 'Night' : 'Day'} ${step.label[1]} (locked)`}>
                  {circleContent}
                </div>
              )}
              {showLine && (
                <div className={`flex-1 w-5 h-px mt-[-10px] mx-1 transition-colors ${
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
              aria-label={`Go to ${prevStep.label}`}
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
            aria-label="Start over"
          >
            <RotateCcw size={20} strokeWidth={2} />
          </button>
        )}

        <div className="text-center">
          <h2 className={`text-xl font-bold ${isNighttime ? 'text-indigo-100' : 'text-ipc-950'}`}>
            {isNighttime ? `Night ${dayNumber - 1}` : `Day ${dayNumber}`}
          </h2>
          <span className={`font-medium text-sm ${isNighttime ? 'text-indigo-300/80' : 'text-ipc-500'}`}>
            {dayLabel}
          </span>
        </div>

        {nextStep ? (
          nextStep.accessible ? (
            <Link
              href={nextStep.href}
              className={`w-10 h-10 flex items-center justify-center rounded-full transition-all
                active:scale-[0.9] ${
                  isNighttime ? 'text-indigo-200 hover:bg-indigo-500/20' : 'text-ipc-600 hover:bg-ipc-100'
                }`}
              aria-label={`Go to ${nextStep.label}`}
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
            aria-label="View Results"
          >
            <ChevronRight size={24} strokeWidth={2.5} />
          </Link>
        ) : (
          <div className="w-10 h-10" />
        )}
      </div>

      {/* Spacer */}
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
            {isNighttime ? 'Good evening!' : dayNumber === 1 ? 'Hello!' : 'Good morning!'}
          </p>
          {!isNighttime && (
            <p className={`text-base mb-5 ${isNighttime ? 'text-indigo-300/80' : 'text-ipc-500'}`}>
              {dayNumber === 1 && !hasWakeTime
                ? 'Start by adding your wake-up time'
                : `Add your first pee to start Day ${dayNumber}`}
            </p>
          )}
          {isNighttime ? (
            <div className="space-y-4">
              <p className="text-lg font-medium text-indigo-100 text-center mb-2 animate-night-hero">
                Did you pee or drink anything overnight?
              </p>
              <div className="flex justify-center gap-3 animate-night-actions">
                {onLogVoid && (
                  <button
                    type="button"
                    onClick={() => onLogVoid()}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl
                      font-semibold text-base active:scale-[0.97] transition-all
                      bg-indigo-500 text-white"
                  >
                    <Droplets size={16} />
                    Pee
                  </button>
                )}
                {onLogDrink && (
                  <button
                    type="button"
                    onClick={() => onLogDrink()}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl
                      font-semibold text-base active:scale-[0.97] transition-all
                      bg-indigo-400/30 text-indigo-100 border border-indigo-400/30"
                  >
                    <DrinkIcon name="GlassWater" size={16} className="text-indigo-200" />
                    Drink
                  </button>
                )}
                {onLogLeak && (
                  <button
                    type="button"
                    onClick={() => onLogLeak()}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl
                      font-semibold text-base active:scale-[0.97] transition-all
                      bg-indigo-400/30 text-indigo-100 border border-indigo-400/30"
                  >
                    <CloudDrizzle size={16} className="text-indigo-200" />
                    Leak
                  </button>
                )}
              </div>
              {onLogWakeUp && (
                <div className="flex flex-col items-center gap-2 mt-8">
                  <div className="w-12 h-px bg-indigo-400/20 mx-auto" />
                  <p className="text-xs text-indigo-400/60 text-center">
                    Nothing overnight?
                  </p>
                  <button
                    type="button"
                    onClick={handleWakeUp}
                    className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl
                      font-medium text-sm active:scale-[0.97] transition-all
                      bg-indigo-400/20 text-indigo-300 border border-indigo-400/25 animate-start-day"
                  >
                    Continue to Day
                    <Sun size={14} />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Day 1: prompt wake-up first, then first pee */}
              {dayNumber === 1 && !hasWakeTime && onLogWakeUp ? (
                <button
                  type="button"
                  onClick={handleWakeUp}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl
                    font-semibold text-base active:scale-[0.97] transition-all
                    bg-warning/15 text-warning border border-warning/30
                    animate-wake-guide"
                >
                  <Sun size={18} />
                  Add wake-up time
                </button>
              ) : (
                onLogVoid && (
                  <button
                    type="button"
                    onClick={() => onLogVoid()}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl
                      font-semibold text-base active:scale-[0.97] transition-all
                      bg-ipc-500 text-white animate-cta-guide"
                  >
                    Add First Pee
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

              {/* "+" insertion button at bottom border of event — hidden once day is complete or Day 1 without wake time */}
              {!isDayComplete && !isNightComplete && (dayNumber !== 1 || hasWakeTime) && (
                <div className="absolute -bottom-0 left-0 right-0 flex justify-center z-10">
                  {openInsertIdx === idx ? (
                    <div className={`flex items-center gap-2 animate-scale-in backdrop-blur-sm rounded-full px-2 py-0.5 ${
                      isNighttime ? 'bg-indigo-900/80' : 'bg-white/80'
                    }`}>
                      <button
                        type="button"
                        onClick={() => handleInsertVoid(idx)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold
                          transition-all active:scale-[0.95] ${
                            isNighttime
                              ? 'bg-indigo-500/25 text-indigo-200 border border-indigo-400/30'
                              : 'bg-void/10 text-void border border-void/20'
                          }`}
                      >
                        <Droplets size={12} />
                        Pee
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInsertDrink(idx)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold
                          transition-all active:scale-[0.95] ${
                            isNighttime
                              ? 'bg-indigo-500/25 text-indigo-200 border border-indigo-400/30'
                              : 'bg-drink/10 text-drink border border-drink/20'
                          }`}
                      >
                        <DrinkIcon name="GlassWater" size={12} className={isNighttime ? 'text-indigo-200' : 'text-drink'} />
                        Drink
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInsertLeak(idx)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold
                          transition-all active:scale-[0.95] ${
                            isNighttime
                              ? 'bg-indigo-500/25 text-indigo-200 border border-indigo-400/30'
                              : 'bg-leak/10 text-leak border border-leak/20'
                          }`}
                      >
                        <CloudDrizzle size={12} />
                        Leak
                      </button>
                      <button
                        type="button"
                        onClick={() => setOpenInsertIdx(null)}
                        className={`w-6 h-6 flex items-center justify-center rounded-full text-xs
                          transition-all active:scale-[0.9] ${
                            isNighttime ? 'text-indigo-400 hover:bg-indigo-500/20' : 'text-ipc-300 hover:bg-ipc-100'
                          }`}
                        aria-label="Cancel"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setOpenInsertIdx(idx)}
                      className={`w-6 h-6 flex items-center justify-center rounded-full
                        transition-all active:scale-[0.85] shadow-sm ${
                          isNighttime
                            ? 'bg-indigo-900/80 text-indigo-400/60 hover:text-indigo-300 hover:bg-indigo-500/30 border border-indigo-400/20'
                            : 'bg-white text-ipc-300 hover:text-ipc-500 hover:bg-ipc-50 border border-ipc-100'
                        }`}
                      aria-label="Insert event here"
                    >
                      <Plus size={12} strokeWidth={2.5} />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Night prompt — show when bedtime exists but no overnight events logged yet */}
      {isNighttime && !isNightComplete && voids.length === 0 && drinks.length === 0 && leaks.length === 0 && !hasWakeTime && (
        <div className="text-center py-6 space-y-6">
          <p className="text-base font-medium text-indigo-200/80 animate-night-hero">
            Did you pee or drink anything overnight?
          </p>
          <p className="text-xs text-indigo-400/50 animate-night-actions">
            Use the + button to log overnight events, or continue to the next day
          </p>
          {onLogWakeUp && (
            <button
              type="button"
              onClick={handleWakeUp}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl
                font-medium text-sm active:scale-[0.97] transition-all
                bg-indigo-400/20 text-indigo-300 border border-indigo-400/25 animate-start-day"
            >
              Continue to Day
              <Sun size={14} />
            </button>
          )}
        </div>
      )}

      {/* Wake-up reminder — only show after at least one overnight void or drink, hide when night complete */}
      {isNighttime && !isNightComplete && (voids.length > 0 || drinks.length > 0 || leaks.length > 0) && onLogWakeUp && (
        <div className="mt-4 px-4 py-3 rounded-2xl bg-warning/10 border border-warning/25 animate-fade-slide-up">
          <div className="flex items-center gap-3">
            <Sun size={20} className="shrink-0 text-warning" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-warning">
                Mark your wake-up time
              </p>
              <p className="text-xs mt-0.5 font-medium text-warning/70">
                Add all overnight pees and drinks before marking wake-up
              </p>
            </div>
            <button
              type="button"
              onClick={handleWakeUp}
              className="px-4 py-2 rounded-full text-sm font-semibold
                bg-warning text-white
                active:scale-[0.95] transition-all"
            >
              Wake up
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
                Night {dayNumber - 1} complete
              </p>
            </div>
          </div>
          <Link
            href={`/diary/day/${dayNumber}?view=day`}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl
              bg-ipc-500 text-white font-semibold text-base
              active:scale-[0.97] transition-all animate-fade-slide-up"
          >
            Continue to Day
            <Sun size={16} />
          </Link>
        </div>
      )}

      {/* Bedtime reminder — only show after at least one void or drink is logged */}
      {(voids.length > 0 || drinks.length > 0 || leaks.length > 0) && !hasBedtime && !isNighttime && (
        <div className="mt-4 px-4 py-3 rounded-2xl bg-bedtime/10 border border-bedtime/25 animate-reminder">
          <div className="flex items-center gap-3">
            <Moon size={20} className="shrink-0 text-bedtime" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-bedtime">
                Mark your bedtime
              </p>
              <p className="text-xs mt-0.5 font-medium text-bedtime/80">
                Add all pees and drinks before marking bedtime
              </p>
            </div>
            {onLogBedtime && (
              <button
                type="button"
                onClick={onLogBedtime}
                className="px-4 py-2 rounded-full text-sm font-semibold
                  bg-bedtime text-white
                  active:scale-[0.95] transition-all"
              >
                Go to bed
              </button>
            )}
          </div>
        </div>
      )}

      {/* Day complete indicator — hide during night view */}
      {isDayComplete && !isNighttime && (
        <div className="mt-4 space-y-2.5">
          <div className="px-4 py-2.5 rounded-2xl bg-ipc-100/30 border border-ipc-200/30 animate-complete">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-ipc-400" />
              <p className="text-sm font-medium text-ipc-500">
                Day {dayNumber} complete
              </p>
            </div>
          </div>
          {dayNumber < 3 && nextDayAccessible && (
            <div className="space-y-2">
              <Link
                href={`/diary/day/${dayNumber + 1}?view=night`}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl
                  bg-bedtime text-white font-semibold text-base
                  active:scale-[0.97] transition-all animate-night-pulse"
              >
                Continue to Night
                <Moon size={16} />
              </Link>
            </div>
          )}
          {dayNumber === 3 && (
            <Link
              href="/summary"
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl
                bg-ipc-500 text-white font-semibold text-base
                active:scale-[0.97] transition-all animate-cta-guide"
            >
              View Results
              <ChevronRight size={18} />
            </Link>
          )}
        </div>
      )}

      {/* Reset confirmation overlay */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 backdrop-dim" onClick={() => setShowResetConfirm(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl mx-6 p-6 max-w-sm w-full animate-scale-in">
            <div className="text-center">
              <RotateCcw size={36} className="text-danger mx-auto mb-3" />
              <h3 className="text-lg font-bold text-ipc-950 mb-1">Start over?</h3>
              <p className="text-sm text-ipc-600 mb-5">
                This will clear all data from Day 1, Day 2, and Day 3. This can&apos;t be undone.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-base
                    bg-ipc-50 text-ipc-800 border border-ipc-200
                    active:scale-[0.97] transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    resetDiary();
                    setShowResetConfirm(false);
                    router.replace('/');
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-base
                    bg-danger text-white
                    active:scale-[0.97] transition-all"
                >
                  Clear all
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
