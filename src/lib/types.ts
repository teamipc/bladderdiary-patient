/**
 * Core types for the patient bladder diary app.
 * Aligned with the clinician app's types for export compatibility.
 *
 * All timestamps are stored as ISO 8601 strings (UTC).
 * Day numbers are always 1 | 2 | 3 (3-day diary).
 */

/** Supported drink categories for fluid intake logging. */
export type DrinkType =
  | 'water'
  | 'coffee'
  | 'tea'
  | 'juice'
  | 'carbonated'
  | 'alcohol'
  | 'milk'
  | 'other';

/** Bladder urgency sensation scale: 0 = no urgency, 4 = desperate. */
export type BladderSensation = 0 | 1 | 2 | 3 | 4;

/** Trigger that caused a standalone leak event. */
export type LeakTrigger =
  | 'cough'
  | 'sneeze'
  | 'laugh'
  | 'lifting'
  | 'exercise'
  | 'toilet_way'
  | 'other'
  | 'not_sure';

/** Subjective leak amount. */
export type LeakAmount = 'drops' | 'small' | 'medium' | 'large';

/** A standalone leak event (leakage outside of a void). */
export interface LeakEntry {
  id: string;
  /** ISO 8601 timestamp in UTC. */
  timestampIso: string;
  /** What triggered the leak. */
  trigger: LeakTrigger;
  /** Was there urgency before the leak? */
  urgencyBeforeLeak: boolean | null;
  /** Subjective amount (null = not recorded). */
  amount?: LeakAmount | null;
  /** Free-text note (max 120 chars). */
  notes?: string;
}

/** A single void (urination) event. */
export interface VoidEntry {
  id: string;
  /** ISO 8601 timestamp in UTC. */
  timestampIso: string;
  /** Volume in millilitres. */
  volumeMl: number;
  /** Optional double-void volume in millilitres. */
  doubleVoidMl?: number;
  /** Urgency sensation at time of void (null = not recorded). */
  sensation: BladderSensation | null;
  /** Whether any leakage occurred. */
  leak: boolean;
  /** Free-text note (max 120 chars). */
  note: string;
  /** Whether this is the first void after waking. */
  isFirstMorningVoid: boolean;
}

/** A single fluid intake event. */
export interface DrinkEntry {
  id: string;
  /** ISO 8601 timestamp in UTC. */
  timestampIso: string;
  /** Volume in millilitres. */
  volumeMl: number;
  /** Drink category. */
  drinkType: DrinkType;
  /** Free-text note (max 120 chars). */
  note: string;
}

/** Marks end-of-day bedtime. Events after bedtime roll to the next day. */
export interface BedtimeEntry {
  id: string;
  /** ISO 8601 timestamp in UTC. */
  timestampIso: string;
  /** Which diary day this bedtime belongs to (1, 2, or 3). */
  dayNumber: 1 | 2 | 3;
}

/** Marks start-of-day wake time. */
export interface WakeTimeEntry {
  id: string;
  /** ISO 8601 timestamp in UTC. */
  timestampIso: string;
  /** Which diary day this wake time belongs to (1, 2, or 3). */
  dayNumber: 1 | 2 | 3;
}

/** The full persisted state of the diary. */
export interface DiaryState {
  /** YYYY-MM-DD date string for Day 1 of the diary. */
  startDate: string;
  /** Patient age (null if not yet entered). */
  age: number | null;
  /** All void entries across all 3 days. */
  voids: VoidEntry[];
  /** All drink entries across all 3 days. */
  drinks: DrinkEntry[];
  /** Standalone leak entries across all 3 days. */
  leaks: LeakEntry[];
  /** Bedtime markers (one per day, max 3). */
  bedtimes: BedtimeEntry[];
  /** Wake time markers (one per day, max 3). */
  wakeTimes: WakeTimeEntry[];
  /** Volume display unit preference. */
  volumeUnit: 'mL' | 'oz';
  /** Whether onboarding is complete and tracking is active. */
  diaryStarted: boolean;
  /** Optional clinic code for professional integration. */
  clinicCode: string | null;
  /** IANA timezone string (e.g. "Asia/Singapore"). Auto-detected, user-overridable. */
  timeZone: string;
}
