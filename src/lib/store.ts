/**
 * Global state store for the patient bladder diary.
 * Uses Zustand with localStorage persistence.
 * Pattern mirrors the clinician app's useDiaryStore.
 */

'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { format } from 'date-fns';
import { generateId, getDayNumber } from './utils';
import type {
  VoidEntry,
  DrinkEntry,
  BedtimeEntry,
  WakeTimeEntry,
  DiaryState,
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
): VoidEntry[] {
  const wakeEntry = wakeTimes.find((w) => w.dayNumber === dayNumber);
  if (!wakeEntry) return allVoids; // No wake time → don't change anything

  const wakeIso = wakeEntry.timestampIso;

  // Find all day-phase voids for this day (at or after wake time)
  const dayVoidIndices: { index: number; diff: number }[] = [];
  allVoids.forEach((v, i) => {
    const vDay = getDayNumber(v.timestampIso, startDate, bedtimes);
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
    const vDay = getDayNumber(v.timestampIso, startDate, bedtimes);
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
  startDiary: () => void;
  setClinicCode: (code: string | null) => void;

  // Void actions
  addVoid: (v: Omit<VoidEntry, 'id'>) => void;
  updateVoid: (id: string, updates: Partial<VoidEntry>) => void;
  removeVoid: (id: string) => void;
  markMorningVoid: (id: string, dayNumber: number) => void;

  // Drink actions
  addDrink: (d: Omit<DrinkEntry, 'id'>) => void;
  updateDrink: (id: string, updates: Partial<DrinkEntry>) => void;
  removeDrink: (id: string) => void;

  // Bedtime actions
  setBedtime: (dayNumber: 1 | 2 | 3, timestampIso: string) => void;
  removeBedtime: (dayNumber: 1 | 2 | 3) => void;

  // Wake time actions
  setWakeTime: (dayNumber: 1 | 2 | 3, timestampIso: string) => void;
  removeWakeTime: (dayNumber: 1 | 2 | 3) => void;

  // Selectors
  getVoidsForDay: (dayNumber: number) => VoidEntry[];
  getDrinksForDay: (dayNumber: number) => DrinkEntry[];
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
  bedtimes: [],
  wakeTimes: [],
  volumeUnit: 'mL',
  diaryStarted: false,
  clinicCode: null,
};

export const useDiaryStore = create<DiaryStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setStartDate: (date) => set({ startDate: date }),
      setAge: (age) => set({ age }),
      setVolumeUnit: (unit) => set({ volumeUnit: unit }),
      startDiary: () => set({ diaryStarted: true }),
      setClinicCode: (code) => set({ clinicCode: code }),

      // ── Voids ──
      addVoid: (v) =>
        set((s) => {
          // Prevent duplicate: no two voids at the same minute
          const newMinute = v.timestampIso.slice(0, 16); // "YYYY-MM-DDTHH:MM"
          const hasDuplicate = s.voids.some(
            (existing) => existing.timestampIso.slice(0, 16) === newMinute,
          );
          if (hasDuplicate) return {};

          const dayNum = getDayNumber(v.timestampIso, s.startDate, s.bedtimes);
          // Add the void (always with FMV false — reassignMorningVoid will set it)
          const newVoids = [...s.voids, { ...v, id: generateId(), isFirstMorningVoid: false }];
          return { voids: reassignMorningVoid(newVoids, dayNum, s.startDate, s.bedtimes, s.wakeTimes) };
        }),
      updateVoid: (id, updates) =>
        set((s) => {
          const updatedVoids = s.voids.map((v) => (v.id === id ? { ...v, ...updates } : v));
          const updated = updatedVoids.find((v) => v.id === id);
          if (!updated) return { voids: updatedVoids };
          const dayNum = getDayNumber(updated.timestampIso, s.startDate, s.bedtimes);
          return { voids: reassignMorningVoid(updatedVoids, dayNum, s.startDate, s.bedtimes, s.wakeTimes) };
        }),
      removeVoid: (id) =>
        set((s) => {
          const removed = s.voids.find((v) => v.id === id);
          const remaining = s.voids.filter((v) => v.id !== id);
          if (!removed) return { voids: remaining };
          const dayNum = getDayNumber(removed.timestampIso, s.startDate, s.bedtimes);
          return { voids: reassignMorningVoid(remaining, dayNum, s.startDate, s.bedtimes, s.wakeTimes) };
        }),
      markMorningVoid: (id, dayNumber) =>
        set((s) => ({
          voids: s.voids.map((v) => {
            const vDay = getDayNumber(v.timestampIso, s.startDate, s.bedtimes);
            if (vDay === dayNumber) {
              return { ...v, isFirstMorningVoid: v.id === id };
            }
            return v;
          }),
        })),

      // ── Drinks ──
      addDrink: (d) =>
        set((s) => {
          // Prevent duplicate: no two drinks at the same minute
          const newMinute = d.timestampIso.slice(0, 16);
          const hasDuplicate = s.drinks.some(
            (existing) => existing.timestampIso.slice(0, 16) === newMinute,
          );
          if (hasDuplicate) return {};
          return { drinks: [...s.drinks, { ...d, id: generateId() }] };
        }),
      updateDrink: (id, updates) =>
        set((s) => ({
          drinks: s.drinks.map((d) => (d.id === id ? { ...d, ...updates } : d)),
        })),
      removeDrink: (id) =>
        set((s) => ({
          drinks: s.drinks.filter((d) => d.id !== id),
        })),

      // ── Bedtimes ──
      setBedtime: (dayNumber, timestampIso) =>
        set((s) => {
          const existing = s.bedtimes.filter((b) => b.dayNumber !== dayNumber);
          return {
            bedtimes: [...existing, { id: generateId(), timestampIso, dayNumber }],
          };
        }),
      removeBedtime: (dayNumber) =>
        set((s) => ({
          bedtimes: s.bedtimes.filter((b) => b.dayNumber !== dayNumber),
        })),

      // ── Wake times ──
      setWakeTime: (dayNumber, timestampIso) =>
        set((s) => {
          const existing = s.wakeTimes.filter((w) => w.dayNumber !== dayNumber);
          const newWakeTimes: WakeTimeEntry[] = [...existing, { id: generateId(), timestampIso, dayNumber }];
          // Reassign FMV now that wake time changed
          const voids = reassignMorningVoid(s.voids, dayNumber, s.startDate, s.bedtimes, newWakeTimes);
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
          .filter((v) => getDayNumber(v.timestampIso, s.startDate, s.bedtimes) === dayNumber)
          .sort((a, b) => a.timestampIso.localeCompare(b.timestampIso));
      },
      getDrinksForDay: (dayNumber) => {
        const s = get();
        return s.drinks
          .filter((d) => getDayNumber(d.timestampIso, s.startDate, s.bedtimes) === dayNumber)
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
        return s.voids.length > 0 || s.drinks.length > 0 || s.bedtimes.length > 0;
      },

      // ── Reset ──
      resetDiary: () => set({ ...initialState, startDate: format(new Date(), 'yyyy-MM-dd') }),
    }),
    {
      name: 'bladder-diary-patient',
    },
  ),
);

export default useDiaryStore;
