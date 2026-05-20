/**
 * Global state store for the patient bladder diary.
 * Uses Zustand with IndexedDB persistence (via `idb-keyval`). Same Same-Origin
 * Policy sandbox as localStorage — device-local only, no network. On first
 * hydrate after v2→v3, the adapter copies any legacy `localStorage` value
 * over to IndexedDB and clears it. See `src/lib/storage/indexedDbAdapter.ts`.
 * Pattern mirrors the clinician app's useDiaryStore.
 */

'use client';

import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { format } from 'date-fns';
import { generateId, getDayNumber, detectTimeZone } from './utils';
import { createIndexedDbStorage } from './storage/indexedDbAdapter';
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
  if (!wakeEntry) {
    // No wake time for this day. Clear any stale FMV flag on voids attributed
    // to this day so removeWakeTime is a true inverse of setWakeTime for the
    // FMV invariant (CRI-04 / docs/TIME_MODEL.md). Voids on OTHER days are
    // untouched. Object identity is preserved for entries that don't change,
    // so React-Zustand reference equality holds for unaffected voids.
    return allVoids.map((v) => {
      const vDay = getDayNumber(v.timestampIso, startDate, bedtimes, timeZone);
      if (vDay === dayNumber && v.isFirstMorningVoid) {
        return { ...v, isFirstMorningVoid: false };
      }
      return v;
    });
  }

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
  setHapticEnabled: (enabled: boolean) => void;
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

  // FMV educational tooltip (one-pass)
  markFmvTooltipShown: () => void;

  // /summary completion hero (one-pass)
  markSummaryCelebrationShown: () => void;

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

export const migrateBladderDiaryState = (
  persisted: unknown,
  version: number,
): DiaryStore => {
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
  if (version < 3) {
    // v2 → v3: backend swap from localStorage to IndexedDB. No state-shape change.
    // The adapter handles the storage-layer migration transparently (see
    // src/lib/storage/indexedDbAdapter.ts). This branch exists as a marker so a
    // future v4 migration knows where the IDB transition landed.
  }
  // Defensive: any persisted state predating an array field should hydrate
  // with []. Touches every array field on DiaryState so future v* bumps
  // don't have to re-discover this in production via a runtime crash.
  const ARRAY_FIELDS = ['voids', 'drinks', 'leaks', 'bedtimes', 'wakeTimes'] as const;
  for (const field of ARRAY_FIELDS) {
    if (!Array.isArray(obj[field])) obj[field] = [];
  }
  // v3 -> v4: hapticEnabled added in Phase 15 MI-02. Default true so existing
  // users get the new behavior; they can toggle off in /help if undesired.
  // Guard is idempotent so re-running the migration is safe.
  if (typeof obj.hapticEnabled !== 'boolean') {
    obj.hapticEnabled = true;
  }
  // v4 -> v5: fmvTooltipShown added in Phase 15 MI-04. Default false (new
  // users see the tooltip once; existing users with prior FMV-flagged data
  // will also see it once on their next Day 2/3 morning, which is harmless).
  // Guard is idempotent so re-running the migration is safe.
  if (typeof obj.fmvTooltipShown !== 'boolean') {
    obj.fmvTooltipShown = false;
  }
  // v5 -> v6: summaryCelebrationShown added in Phase 16 CEL-05. Default
  // false so existing users who have already completed a diary see the
  // one-time celebration hero on their next /summary visit (retroactive,
  // harmless. they get the moment they earned). Guard is idempotent so
  // re-running the migration is safe.
  if (typeof obj.summaryCelebrationShown !== 'boolean') {
    obj.summaryCelebrationShown = false;
  }
  return obj as unknown as DiaryStore;
};

const initialState: DiaryState = {
  startDate: format(new Date(), 'yyyy-MM-dd'),
  age: null,
  voids: [],
  drinks: [],
  leaks: [],
  bedtimes: [],
  wakeTimes: [],
  volumeUnit: 'mL',
  hapticEnabled: true,
  diaryStarted: false,
  clinicCode: null,
  timeZone: detectTimeZone(),
  morningAnchor: null,
  day1CelebrationShown: false,
  fmvTooltipShown: false,
  summaryCelebrationShown: false,
};

export const useDiaryStore = create<DiaryStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setStartDate: (date) => set({ startDate: date }),
      setAge: (age) => set({ age }),
      setVolumeUnit: (unit) => set({ volumeUnit: unit }),
      setHapticEnabled: (enabled) => set({ hapticEnabled: enabled }),
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
        set((s) => {
          const newWakeTimes = s.wakeTimes.filter((w) => w.dayNumber !== dayNumber);
          // Mirror setWakeTime: recompute FMV for this day. With no wake entry,
          // the helper clears any stale FMV flag on the day's voids (CRI-04).
          const voids = reassignMorningVoid(s.voids, dayNumber, s.startDate, s.bedtimes, newWakeTimes, s.timeZone);
          return { wakeTimes: newWakeTimes, voids };
        }),

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

      // ── FMV educational tooltip (one-pass) ──
      markFmvTooltipShown: () => set({ fmvTooltipShown: true }),

      // ── /summary completion hero (one-pass) ──
      markSummaryCelebrationShown: () => set({ summaryCelebrationShown: true }),

      // ── Reset ──
      resetDiary: () => set({ ...initialState, startDate: format(new Date(), 'yyyy-MM-dd'), timeZone: detectTimeZone() }),
    }),
    {
      name: 'bladder-diary-patient',
      version: 6,
      migrate: migrateBladderDiaryState,
      storage: createJSONStorage(() => createIndexedDbStorage()),
    },
  ),
);

export default useDiaryStore;

/**
 * Returns whether the persist middleware has finished rehydrating from
 * IndexedDB. Use this to gate any rendering decision that depends on
 * persisted state (e.g. "is the diary started?", "is day 3 bedtime set?")
 * so the component does not flash the initial-state UI before hydration
 * completes.
 *
 * Why this is needed
 * ------------------
 * Zustand's persist middleware applies the rehydrated state via a queued
 * microtask, not synchronously during store creation. With Next.js's App
 * Router (server-rendered HTML → client hydration), this means the FIRST
 * client render of any page that reads from the store sees the initial
 * (empty) state. A `useEffect` that fires conditional logic on that first
 * pass — e.g. the summary page's `if (!diaryStarted) router.replace('/')`
 * — runs before the persisted state lands, and the redirect fires even
 * though IndexedDB has a complete diary. (The async backend makes this
 * gap slightly longer than under localStorage — the hook is even more
 * load-bearing now.)
 *
 * Real-world symptom: a patient deep-links or refreshes /summary → flash
 * of the empty/locked state → unwanted redirect to "/" → confusing.
 *
 * This hook follows the canonical pattern from the Zustand docs
 * (https://docs.pmnd.rs/zustand/integrations/persisting-store-data#hashydrated):
 * it subscribes to onHydrate (set false) and onFinishHydration (set true),
 * and re-checks the current state in the same effect to cover the case
 * where hydration finished between the initial useState and the effect
 * tick.
 */
export function useStoreHydrated(): boolean {
  return useSyncExternalStore(
    (notify) => {
      const unsubHydrate = useDiaryStore.persist.onHydrate(notify);
      const unsubFinish = useDiaryStore.persist.onFinishHydration(notify);
      return () => {
        unsubHydrate();
        unsubFinish();
      };
    },
    () => useDiaryStore.persist.hasHydrated(),
    () => false,
  );
}
