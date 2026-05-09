/**
 * Generate a complete, IPC-valid 3-day diary fixture.
 *
 * Used by the e2e walkthrough to seed the Zustand `bladder-diary-patient`
 * localStorage entry, bypassing the brittle 90+ form interactions per
 * locale that real-flow event logging would require. We still drive the
 * homepage + onboarding via real clicks; only the per-day event mass is
 * seeded so the summary page receives deterministic input.
 *
 * The data shape mirrors `src/lib/types.ts` exactly. Day boundaries
 * respect bedtimes, FMV is tagged once per day, and double-voids appear
 * once per day to exercise that code path.
 */

import { format, subDays } from 'date-fns';

export interface FixtureOptions {
  /** Diary start date (yyyy-MM-dd). Defaults to today-2. */
  startDate?: string;
  volumeUnit?: 'mL' | 'oz';
  timeZone?: string;
  age?: number;
}

interface SeedState {
  state: {
    startDate: string;
    age: number;
    voids: VoidEntry[];
    drinks: DrinkEntry[];
    leaks: LeakEntry[];
    bedtimes: BedtimeEntry[];
    wakeTimes: WakeTimeEntry[];
    volumeUnit: 'mL' | 'oz';
    diaryStarted: boolean;
    clinicCode: null;
    timeZone: string;
    morningAnchor: 'wake' | 'coffee' | 'bathroom' | null;
    day1CelebrationShown: boolean;
  };
  /** Must match the Zustand persist `version` in src/lib/store.ts. */
  version: number;
}

interface VoidEntry {
  id: string;
  timestampIso: string;
  volumeMl: number;
  doubleVoidMl?: number;
  sensation: 0 | 1 | 2 | 3 | 4 | null;
  leak: boolean;
  note: string;
  isFirstMorningVoid: boolean;
  wokeBy?: 'urge' | 'awake_anyway' | null;
}

interface DrinkEntry {
  id: string;
  timestampIso: string;
  volumeMl: number;
  drinkType: 'water' | 'coffee' | 'tea' | 'juice' | 'carbonated' | 'alcohol' | 'milk' | 'other';
  note: string;
}

interface LeakEntry {
  id: string;
  timestampIso: string;
  trigger: 'cough' | 'sneeze' | 'laugh' | 'lifting' | 'exercise' | 'toilet_way' | 'other' | 'not_sure';
  urgencyBeforeLeak: boolean | null;
  amount?: 'drops' | 'small' | 'medium' | 'large' | null;
  notes?: string;
}

interface BedtimeEntry {
  id: string;
  timestampIso: string;
  dayNumber: 1 | 2 | 3;
}

interface WakeTimeEntry {
  id: string;
  timestampIso: string;
  dayNumber: 1 | 2 | 3;
}

let idCounter = 0;
function id(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Build an ISO timestamp at a given hour:minute in UTC for a given yyyy-MM-dd. */
function isoAt(date: string, hour: number, minute = 0): string {
  // Use UTC math; calculations.ts converts to user TZ when bucketing into days.
  return new Date(`${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00Z`).toISOString();
}

function dayDate(startDate: string, dayOffset: number): string {
  const d = new Date(`${startDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dayOffset);
  return format(d, 'yyyy-MM-dd');
}

/**
 * Build a realistic per-day pattern: wake 7:00, 6 voids, 5 drinks,
 * one double-void, optional leak on days 1+3, bedtime 22:30.
 */
function buildDay(startDate: string, dayNumber: 1 | 2 | 3): {
  voids: VoidEntry[];
  drinks: DrinkEntry[];
  leaks: LeakEntry[];
  wakeTime: WakeTimeEntry;
  bedtime: BedtimeEntry;
} {
  const date = dayDate(startDate, dayNumber - 1);
  const wakeHour = 7;

  const wakeTime: WakeTimeEntry = {
    id: id('wake'),
    timestampIso: isoAt(date, wakeHour, 0),
    dayNumber,
  };

  // 6 voids spread across the day. First is FMV (closest to wake).
  const voidPlan: { hour: number; minute: number; volumeMl: number; sensation: 0 | 1 | 2 | 3 | 4; double?: number; note?: string }[] = [
    { hour: 7, minute: 5, volumeMl: 320, sensation: 4, note: dayNumber === 1 ? 'first morning' : '' },
    { hour: 10, minute: 20, volumeMl: 220, sensation: 2 },
    { hour: 13, minute: 0, volumeMl: 280, sensation: 3, double: 60 },
    { hour: 15, minute: 30, volumeMl: 200, sensation: 1 },
    { hour: 18, minute: 0, volumeMl: 240, sensation: 2 },
    { hour: 21, minute: 15, volumeMl: 260, sensation: 3, note: dayNumber === 2 ? 'after dinner' : '' },
  ];

  const voids: VoidEntry[] = voidPlan.map((v, i) => ({
    id: id('void'),
    timestampIso: isoAt(date, v.hour, v.minute),
    volumeMl: v.volumeMl,
    doubleVoidMl: v.double,
    sensation: v.sensation,
    leak: false,
    note: v.note ?? '',
    isFirstMorningVoid: i === 0,
  }));

  // 5 drinks
  const drinkTypes: DrinkEntry['drinkType'][] = ['water', 'coffee', 'tea', 'juice', 'water'];
  const drinkPlan: { hour: number; minute: number; volumeMl: number }[] = [
    { hour: 7, minute: 30, volumeMl: 250 },
    { hour: 9, minute: 0, volumeMl: 200 },
    { hour: 12, minute: 30, volumeMl: 350 },
    { hour: 16, minute: 0, volumeMl: 250 },
    { hour: 19, minute: 0, volumeMl: 300 },
  ];
  const drinks: DrinkEntry[] = drinkPlan.map((d, i) => ({
    id: id('drink'),
    timestampIso: isoAt(date, d.hour, d.minute),
    volumeMl: d.volumeMl,
    drinkType: drinkTypes[i],
    note: '',
  }));

  // Leak on day 1 and day 3 only
  const leaks: LeakEntry[] = [];
  if (dayNumber === 1) {
    leaks.push({
      id: id('leak'),
      timestampIso: isoAt(date, 14, 15),
      trigger: 'cough',
      urgencyBeforeLeak: false,
      amount: 'small',
    });
  } else if (dayNumber === 3) {
    leaks.push({
      id: id('leak'),
      timestampIso: isoAt(date, 11, 30),
      trigger: 'exercise',
      urgencyBeforeLeak: false,
      amount: 'drops',
    });
  }

  const bedtime: BedtimeEntry = {
    id: id('bed'),
    timestampIso: isoAt(date, 22, 30),
    dayNumber,
  };

  return { voids, drinks, leaks, wakeTime, bedtime };
}

/** Build the full Zustand-persisted state object. */
export function buildSeedState(opts: FixtureOptions = {}): SeedState {
  const startDate = opts.startDate ?? format(subDays(new Date(), 2), 'yyyy-MM-dd');
  const volumeUnit = opts.volumeUnit ?? 'mL';
  const timeZone = opts.timeZone ?? 'America/New_York';
  const age = opts.age ?? 62;

  const d1 = buildDay(startDate, 1);
  const d2 = buildDay(startDate, 2);
  const d3 = buildDay(startDate, 3);

  return {
    state: {
      startDate,
      age,
      voids: [...d1.voids, ...d2.voids, ...d3.voids],
      drinks: [...d1.drinks, ...d2.drinks, ...d3.drinks],
      leaks: [...d1.leaks, ...d2.leaks, ...d3.leaks],
      bedtimes: [d1.bedtime, d2.bedtime, d3.bedtime],
      wakeTimes: [d1.wakeTime, d2.wakeTime, d3.wakeTime],
      volumeUnit,
      diaryStarted: true,
      clinicCode: null,
      timeZone,
      morningAnchor: 'wake',
      day1CelebrationShown: true,
    },
    version: 2,
  };
}

/** The localStorage key used by the Zustand persist middleware. */
export const STORE_KEY = 'bladder-diary-patient';
