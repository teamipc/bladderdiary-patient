/**
 * Core types for the patient bladder diary app.
 * Aligned with the clinician app's types for export compatibility.
 */

export type DrinkType =
  | 'water'
  | 'coffee'
  | 'tea'
  | 'juice'
  | 'carbonated'
  | 'alcohol'
  | 'milk'
  | 'other';

export type BladderSensation = 0 | 1 | 2 | 3 | 4;

export interface VoidEntry {
  id: string;
  timestampIso: string;
  volumeMl: number;
  sensation: BladderSensation;
  note: string;
  isFirstMorningVoid: boolean;
}

export interface DrinkEntry {
  id: string;
  timestampIso: string;
  volumeMl: number;
  drinkType: DrinkType;
  note: string;
}

export interface BedtimeEntry {
  id: string;
  timestampIso: string;
  dayNumber: 1 | 2 | 3;
}

export interface DiaryState {
  startDate: string;
  voids: VoidEntry[];
  drinks: DrinkEntry[];
  bedtimes: BedtimeEntry[];
  volumeUnit: 'mL' | 'oz';
  diaryStarted: boolean;
  clinicCode: string | null;
}
