/**
 * Global state store for the patient bladder diary.
 * Uses Zustand with localStorage persistence.
 * Pattern mirrors the clinician app's useDiaryStore.
 */

'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { format } from 'date-fns';
import { generateId, getDayNumber, detectTimeZone } from './utils';
import type {
  VoidEntry,
  DrinkEntry,
  LeakEntry,
  BedtimeEntry,
  WakeTimeEntry,
  DiaryState,
  MorningAnchor,
} from './types';

/**
 * Given all voids for a day and the wake time, return the voids array
 * with isFirstMorningVoid assigned to the day-phase void closest to wake time.
 * Night-phase voids (before wake) are never tagged as FMV.
 */
function reassignMorningVoid(
  allVoids: VoidEntry[],
  dayNumber: number,
  startDate: string,
  bedtimes: BedtimeEntry[],
  wakeTimes: WakeTimeEntry[],
  timeZone?: string,
): VoidEntry[] {
  const wakeEntry = wakeTimes.find((w) => w.dayNumber === dayNumber);
  if (!wakeEntry) return allVoids; // No wake time → don't change anything

  const wakeIso = wakeEntry.timestampIso;

  // Find all day-phase voids for this day (at or after wake time)
  const dayVoidIndices: { index: number; diff: number }[] = [];
  allVoids.forEach((v, i) => {
    const vDay = getDayNumber(v.timestampIso, startDate, bedtimes, timeZone);
    if (vDay === dayNumber && v.timestampIso >= wakeIso) {
      const diff = Math.abs(new Date(v.timestampIso).getTime() - new Date(wakeIso).getTime());
      dayVoidIndices.push({ index: i, diff });
    }
  });

  // Find the closest to wake time
  let closestIdx = -1;
  if (dayVoidIndices.length > 0) {
    dayVoidIndices.sort((a, b) => a.diff - b.diff);
    closestIdx = dayVoidIndices[0].index;
  }

  // Reassign flags for this day only
  return allVoids.map((v, i) => {
    const vDay = getDayNumber(v.timestampIso, startDate, bedtimes, timeZone);
    if (vDay !== dayNumber) return v;
    const shouldBeFmv = i === closestIdx;
    if (v.isFirstMorningVoid !== shouldBeFmv) {
      return { ...v, isFirstMorningVoid: shouldBeFmv };
    }
    return v;
  });
}

interface DiaryStore extends DiaryState {
  // Setup
  setStartDate: (date: string) => void;
  setAge: (age: number) => void;
  setVolumeUnit: (unit: 'mL' | 'oz') => void;
  setTimeZone: (tz: string) => void;
  startDiary: () => void;
  setClinicCode: (code: string | null) => void;

  // Void actions — add* returns true on success, false if dropped as duplicate
  // (UI must check the return so we never confirm a save that didn't happen).
  addVoid: (v: Omit<VoidEntry, 'id'>) => boolean;
  updateVoid: (id: string, updates: Partial<VoidEntry>) => void;
  removeVoid: (id: string) => void;
  markMorningVoid: (id: string, dayNumber: number) => void;

  // Drink actions
  addDrink: (d: Omit<DrinkEntry, 'id'>) => boolean;
  updateDrink: (id: string, updates: Partial<DrinkEntry>) => void;
  removeDrink: (id: string) => void;

  // Leak actions
  addLeak: (l: Omit<LeakEntry, 'id'>) => boolean;
  updateLeak: (id: string, updates: Partial<LeakEntry>) => void;
  removeLeak: (id: string) => void;

  // Bedtime actions
  setBedtime: (dayNumber: 1 | 2 | 3, timestampIso: string) => void;
  removeBedtime: (dayNumber: 1 | 2 | 3) => void;

  // Wake time actions
  setWakeTime: (dayNumber: 1 | 2 | 3, timestampIso: string) => void;
  removeWakeTime: (dayNumber: 1 | 2 | 3) => void;

  // Day 1 peak-end moment
  setMorningAnchor: (anchor: MorningAnchor | null) => void;
  markDay1CelebrationShown: () => void;

  // Selectors
  getVoidsForDay: (dayNumber: number) => VoidEntry[];
  getDrinksForDay: (dayNumber: number) => DrinkEntry[];
  getLeaksForDay: (dayNumber: number) => LeakEntry[];
  getBedtimeForDay: (dayNumber: number) => BedtimeEntry | undefined;
  getWakeTimeForDay: (dayNumber: number) => WakeTimeEntry | undefined;
  hasData: () => boolean;

  // Reset
  resetDiary: () => void;
}

const initialState: DiaryState = {
  startDate: format(new Date(), 'yyyy-MM-dd'),
  age: null,
  voids: [],
  drinks: [],
  leaks: [],
  bedtimes: [],
  wakeTimes: [],
  volumeUnit: 'mL',
  diaryStarted: false,
  clinicCode: null,
  timeZone: detectTimeZone(),
  morningAnchor: null,
  day1CelebrationShown: false,
};

export const useDiaryStore = create<DiaryStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setStartDate: (date) => set({ startDate: date }),
      setAge: (age) => set({ age }),
      setVolumeUnit: (unit) => set({ volumeUnit: unit }),
      setTimeZone: (tz) => set({ timeZone: tz }),
      startDiary: () => set({ diaryStarted: true }),
      setClinicCode: (code) => set({ clinicCode: code }),

      // ── Voids ──
      addVoid: (v) => {
        let added = false;
        set((s) => {
          // Prevent duplicate: no two voids at the same minute
          const newMinute = v.timestampIso.slice(0, 16); // "YYYY-MM-DDTHH:MM"
          const hasDuplicate = s.voids.some(
            (existing) => existing.timestampIso.slice(0, 16) === newMinute,
          );
          if (hasDuplicate) return {};

          added = true;
          const dayNum = getDayNumber(v.timestampIso, s.startDate, s.bedtimes, s.timeZone);
          // Add the void (always with FMV false — reassignMorningVoid will set it)
          const newVoids = [...s.voids, { ...v, id: generateId(), isFirstMorningVoid: false }];
          return { voids: reassignMorningVoid(newVoids, dayNum, s.startDate, s.bedtimes, s.wakeTimes, s.timeZone) };
        });
        return added;
      },
      updateVoid: (id, updates) =>
        set((s) => {
          const before = s.voids.find((v) => v.id === id);
          const updatedVoids = s.voids.map((v) => (v.id === id ? { ...v, ...updates } : v));
          const updated = updatedVoids.find((v) => v.id === id);
          if (!updated || !before) return { voids: updatedVoids };
          const oldDay = getDayNumber(before.timestampIso, s.startDate, s.bedtimes, s.timeZone);
          const newDay = getDayNumber(updated.timestampIso, s.startDate, s.bedtimes, s.timeZone);
          // Recompute FMV for the new day; if the void moved across a day
          // boundary, also recompute the old day so its stale FMV flag is cleared.
          let voids = reassignMorningVoid(updatedVoids, newDay, s.startDate, s.bedtimes, s.wakeTimes, s.timeZone);
          if (oldDay !== newDay) {
            voids = reassignMorningVoid(voids, oldDay, s.startDate, s.bedtimes, s.wakeTimes, s.timeZone);
          }
          return { voids };
        }),
      removeVoid: (id) =>
        set((s) => {
          const removed = s.voids.find((v) => v.id === id);
          const remaining = s.voids.filter((v) => v.id !== id);
          if (!removed) return { voids: remaining };
          const dayNum = getDayNumber(removed.timestampIso, s.startDate, s.bedtimes, s.timeZone);
          return { voids: reassignMorningVoid(remaining, dayNum, s.startDate, s.bedtimes, s.wakeTimes, s.timeZone) };
        }),
      markMorningVoid: (id, dayNumber) =>
        set((s) => ({
          voids: s.voids.map((v) => {
            const vDay = getDayNumber(v.timestampIso, s.startDate, s.bedtimes, s.timeZone);
            if (vDay === dayNumber) {
              return { ...v, isFirstMorningVoid: v.id === id };
            }
            return v;
          }),
        })),

      // ── Drinks ──
      addDrink: (d) => {
        let added = false;
        set((s) => {
          // Prevent duplicate: no two drinks at the same minute
          const newMinute = d.timestampIso.slice(0, 16);
          const hasDuplicate = s.drinks.some(
            (existing) => existing.timestampIso.slice(0, 16) === newMinute,
          );
          if (hasDuplicate) return {};
          added = true;
          return { drinks: [...s.drinks, { ...d, id: generateId() }] };
        });
        return added;
      },
      updateDrink: (id, updates) =>
        set((s) => ({
          drinks: s.drinks.map((d) => (d.id === id ? { ...d, ...updates } : d)),
        })),
      removeDrink: (id) =>
        set((s) => ({
          drinks: s.drinks.filter((d) => d.id !== id),
        })),

      // ── Leaks ──
      addLeak: (l) => {
        let added = false;
        set((s) => {
          const newMinute = l.timestampIso.slice(0, 16);
          const hasDuplicate = (s.leaks ?? []).some(
            (existing) => existing.timestampIso.slice(0, 16) === newMinute,
          );
          if (hasDuplicate) return {};
          added = true;
          return { leaks: [...(s.leaks ?? []), { ...l, id: generateId() }] };
        });
        return added;
      },
      updateLeak: (id, updates) =>
        set((s) => ({
          leaks: (s.leaks ?? []).map((l) => (l.id === id ? { ...l, ...updates } : l)),
        })),
      removeLeak: (id) =>
        set((s) => ({
          leaks: (s.leaks ?? []).filter((l) => l.id !== id),
        })),

      // ── Bedtimes ──
      // Bedtime changes can shift voids across day boundaries via the
      // bedtime-aware logic in getDayNumber, so we must recompute FMV for
      // both the affected day and the next day after the bedtime change.
      setBedtime: (dayNumber, timestampIso) =>
        set((s) => {
          const existing = s.bedtimes.filter((b) => b.dayNumber !== dayNumber);
          const newBedtimes = [...existing, { id: generateId(), timestampIso, dayNumber }];
          let voids = reassignMorningVoid(s.voids, dayNumber, s.startDate, newBedtimes, s.wakeTimes, s.timeZone);
          if (dayNumber < 3) {
            voids = reassignMorningVoid(voids, dayNumber + 1, s.startDate, newBedtimes, s.wakeTimes, s.timeZone);
          }
          return { bedtimes: newBedtimes, voids };
        }),
      removeBedtime: (dayNumber) =>
        set((s) => {
          const newBedtimes = s.bedtimes.filter((b) => b.dayNumber !== dayNumber);
          let voids = reassignMorningVoid(s.voids, dayNumber, s.startDate, newBedtimes, s.wakeTimes, s.timeZone);
          if (dayNumber < 3) {
            voids = reassignMorningVoid(voids, dayNumber + 1, s.startDate, newBedtimes, s.wakeTimes, s.timeZone);
          }
          return { bedtimes: newBedtimes, voids };
        }),

      // ── Wake times ──
      setWakeTime: (dayNumber, timestampIso) =>
        set((s) => {
          const existing = s.wakeTimes.filter((w) => w.dayNumber !== dayNumber);
          const newWakeTimes: WakeTimeEntry[] = [...existing, { id: generateId(), timestampIso, dayNumber }];
          // Reassign FMV now that wake time changed
          const voids = reassignMorningVoid(s.voids, dayNumber, s.startDate, s.bedtimes, newWakeTimes, s.timeZone);
          return { wakeTimes: newWakeTimes, voids };
        }),
      removeWakeTime: (dayNumber) =>
        set((s) => ({
          wakeTimes: s.wakeTimes.filter((w) => w.dayNumber !== dayNumber),
        })),

      // ── Selectors (bedtime-aware day boundaries) ──
      getVoidsForDay: (dayNumber) => {
        const s = get();
        return s.voids
          .filter((v) => getDayNumber(v.timestampIso, s.startDate, s.bedtimes, s.timeZone) === dayNumber)
          .sort((a, b) => a.timestampIso.localeCompare(b.timestampIso));
      },
      getDrinksForDay: (dayNumber) => {
        const s = get();
        return s.drinks
          .filter((d) => getDayNumber(d.timestampIso, s.startDate, s.bedtimes, s.timeZone) === dayNumber)
          .sort((a, b) => a.timestampIso.localeCompare(b.timestampIso));
      },
      getLeaksForDay: (dayNumber) => {
        const s = get();
        return (s.leaks ?? [])
          .filter((l) => getDayNumber(l.timestampIso, s.startDate, s.bedtimes, s.timeZone) === dayNumber)
          .sort((a, b) => a.timestampIso.localeCompare(b.timestampIso));
      },
      getBedtimeForDay: (dayNumber) => {
        const s = get();
        return s.bedtimes.find((b) => b.dayNumber === dayNumber);
      },
      getWakeTimeForDay: (dayNumber) => {
        const s = get();
        return (s.wakeTimes ?? []).find((w) => w.dayNumber === dayNumber);
      },
      hasData: () => {
        const s = get();
        return s.voids.length > 0 || s.drinks.length > 0 || (s.leaks ?? []).length > 0 || s.bedtimes.length > 0;
      },

      // ── Day 1 peak-end moment ──
      setMorningAnchor: (anchor) => set({ morningAnchor: anchor }),
      markDay1CelebrationShown: () => set({ day1CelebrationShown: true }),

      // ── Reset ──
      resetDiary: () => set({ ...initialState, startDate: format(new Date(), 'yyyy-MM-dd'), timeZone: detectTimeZone() }),
    }),
    {
      name: 'bladder-diary-patient',
      version: 2,
      migrate: (persisted, version) => {
        const obj = persisted as Record<string, unknown>;
        if (version < 1) {
          // v0 had no timeZone — auto-detect from browser
          obj.timeZone = detectTimeZone();
        }
        if (version < 2) {
          // v1 had no morning anchor / Day 1 celebration flag
          obj.morningAnchor = null;
          obj.day1CelebrationShown = false;
        }
        return obj as unknown as DiaryStore;
      },
    },
  ),
);

export default useDiaryStore;
