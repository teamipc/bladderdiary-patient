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

          let voids = s.voids;
          // If marking as first morning pee, clear that flag from all other voids
          if (v.isFirstMorningVoid) {
            const dayNum = getDayNumber(v.timestampIso, s.startDate, s.bedtimes);
            voids = voids.map((existing) => {
              if (
                existing.isFirstMorningVoid &&
                getDayNumber(existing.timestampIso, s.startDate, s.bedtimes) === dayNum
              ) {
                return { ...existing, isFirstMorningVoid: false };
              }
              return existing;
            });
          }
          return { voids: [...voids, { ...v, id: generateId() }] };
        }),
      updateVoid: (id, updates) =>
        set((s) => ({
          voids: s.voids.map((v) => (v.id === id ? { ...v, ...updates } : v)),
        })),
      removeVoid: (id) =>
        set((s) => ({
          voids: s.voids.filter((v) => v.id !== id),
        })),
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
          return {
            wakeTimes: [...existing, { id: generateId(), timestampIso, dayNumber }],
          };
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
