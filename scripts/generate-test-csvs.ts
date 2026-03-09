/**
 * Generate 5 realistic test CSV files using the app's own CSV generation logic.
 * Run: npx tsx scripts/generate-test-csvs.ts
 */

import { generateCsv } from '../src/lib/exportCsv';
import type { DiaryState, VoidEntry, DrinkEntry, BedtimeEntry, WakeTimeEntry, BladderSensation, DrinkType } from '../src/lib/types';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

let idCounter = 0;
function id(): string {
  return `test-${++idCounter}`;
}

function makeVoid(
  ts: string,
  volumeMl: number,
  sensation: BladderSensation = 1,
  opts: { leak?: boolean; isFirstMorningVoid?: boolean; doubleVoidMl?: number; note?: string } = {},
): VoidEntry {
  return {
    id: id(),
    timestampIso: ts,
    volumeMl,
    sensation,
    leak: opts.leak ?? false,
    isFirstMorningVoid: opts.isFirstMorningVoid ?? false,
    doubleVoidMl: opts.doubleVoidMl,
    note: opts.note ?? '',
  };
}

function makeDrink(ts: string, volumeMl: number, drinkType: DrinkType = 'water', note = ''): DrinkEntry {
  return { id: id(), timestampIso: ts, volumeMl, drinkType, note };
}

function makeBedtime(dayNumber: 1 | 2 | 3, ts: string): BedtimeEntry {
  return { id: id(), timestampIso: ts, dayNumber };
}

function makeWake(dayNumber: 1 | 2 | 3, ts: string): WakeTimeEntry {
  return { id: id(), timestampIso: ts, dayNumber };
}

// ─── Scenario 1: Normal Healthy Patient (age 35, starts 2026-02-20) ───
const scenario1: DiaryState = {
  startDate: '2026-02-20',
  age: 35,
  volumeUnit: 'mL',
  diaryStarted: true,
  clinicCode: null,
  wakeTimes: [
    makeWake(1, '2026-02-20T07:00:00.000Z'),
    makeWake(2, '2026-02-21T06:45:00.000Z'),
    makeWake(3, '2026-02-22T07:15:00.000Z'),
  ],
  bedtimes: [
    makeBedtime(1, '2026-02-20T22:30:00.000Z'),
    makeBedtime(2, '2026-02-21T22:00:00.000Z'),
    makeBedtime(3, '2026-02-22T22:15:00.000Z'),
  ],
  voids: [
    // Day 1
    makeVoid('2026-02-20T07:15:00.000Z', 350, 1, { isFirstMorningVoid: true }),
    makeVoid('2026-02-20T09:30:00.000Z', 250, 1),
    makeVoid('2026-02-20T12:00:00.000Z', 300, 1),
    makeVoid('2026-02-20T14:45:00.000Z', 280, 2),
    makeVoid('2026-02-20T17:30:00.000Z', 320, 1),
    makeVoid('2026-02-20T20:00:00.000Z', 250, 1),
    makeVoid('2026-02-20T22:00:00.000Z', 200, 1),
    // Day 2
    makeVoid('2026-02-21T07:00:00.000Z', 400, 1, { isFirstMorningVoid: true }),
    makeVoid('2026-02-21T09:15:00.000Z', 280, 1),
    makeVoid('2026-02-21T11:45:00.000Z', 300, 1),
    makeVoid('2026-02-21T14:00:00.000Z', 260, 1),
    makeVoid('2026-02-21T16:30:00.000Z', 310, 2),
    makeVoid('2026-02-21T19:00:00.000Z', 280, 1),
    makeVoid('2026-02-21T21:30:00.000Z', 230, 1),
    // Day 3
    makeVoid('2026-02-22T07:30:00.000Z', 380, 1, { isFirstMorningVoid: true }),
    makeVoid('2026-02-22T10:00:00.000Z', 300, 1),
    makeVoid('2026-02-22T12:30:00.000Z', 270, 1),
    makeVoid('2026-02-22T15:00:00.000Z', 290, 2),
    makeVoid('2026-02-22T17:45:00.000Z', 330, 1),
    makeVoid('2026-02-22T20:30:00.000Z', 250, 1),
  ],
  drinks: [
    // Day 1
    makeDrink('2026-02-20T07:30:00.000Z', 250, 'coffee'),
    makeDrink('2026-02-20T08:30:00.000Z', 350, 'water'),
    makeDrink('2026-02-20T10:30:00.000Z', 300, 'water'),
    makeDrink('2026-02-20T12:30:00.000Z', 250, 'water'),
    makeDrink('2026-02-20T15:00:00.000Z', 300, 'tea'),
    makeDrink('2026-02-20T18:00:00.000Z', 350, 'water'),
    // Day 2
    makeDrink('2026-02-21T07:15:00.000Z', 250, 'coffee'),
    makeDrink('2026-02-21T09:00:00.000Z', 400, 'water'),
    makeDrink('2026-02-21T11:00:00.000Z', 300, 'water'),
    makeDrink('2026-02-21T13:00:00.000Z', 250, 'juice'),
    makeDrink('2026-02-21T15:30:00.000Z', 350, 'water'),
    makeDrink('2026-02-21T18:30:00.000Z', 300, 'water'),
    // Day 3
    makeDrink('2026-02-22T07:45:00.000Z', 250, 'coffee'),
    makeDrink('2026-02-22T09:30:00.000Z', 350, 'water'),
    makeDrink('2026-02-22T11:30:00.000Z', 300, 'water'),
    makeDrink('2026-02-22T14:00:00.000Z', 250, 'tea'),
    makeDrink('2026-02-22T16:30:00.000Z', 300, 'water'),
    makeDrink('2026-02-22T19:30:00.000Z', 350, 'water'),
  ],
};

// ─── Scenario 2: Overactive Bladder (age 62, starts 2026-01-10) ───
// High frequency, small volumes, urgency, some leaks
const scenario2: DiaryState = {
  startDate: '2026-01-10',
  age: 62,
  volumeUnit: 'mL',
  diaryStarted: true,
  clinicCode: 'IPC-MELB-001',
  wakeTimes: [
    makeWake(1, '2026-01-10T06:30:00.000Z'),
    makeWake(2, '2026-01-11T06:00:00.000Z'),
    makeWake(3, '2026-01-12T06:15:00.000Z'),
  ],
  bedtimes: [
    makeBedtime(1, '2026-01-10T21:30:00.000Z'),
    makeBedtime(2, '2026-01-11T21:00:00.000Z'),
    makeBedtime(3, '2026-01-12T21:30:00.000Z'),
  ],
  voids: [
    // Day 1 — frequent small voids with urgency
    makeVoid('2026-01-10T06:45:00.000Z', 180, 3, { isFirstMorningVoid: true }),
    makeVoid('2026-01-10T08:00:00.000Z', 120, 3, { leak: true, note: 'Leaked on way to bathroom' }),
    makeVoid('2026-01-10T09:15:00.000Z', 100, 2),
    makeVoid('2026-01-10T10:30:00.000Z', 150, 3, { leak: true }),
    makeVoid('2026-01-10T11:45:00.000Z', 130, 2),
    makeVoid('2026-01-10T13:00:00.000Z', 110, 3),
    makeVoid('2026-01-10T14:15:00.000Z', 140, 4, { leak: true, note: 'Urgent - could not hold' }),
    makeVoid('2026-01-10T15:30:00.000Z', 90, 2),
    makeVoid('2026-01-10T16:45:00.000Z', 120, 3),
    makeVoid('2026-01-10T18:00:00.000Z', 100, 2),
    makeVoid('2026-01-10T19:30:00.000Z', 130, 3, { leak: true }),
    makeVoid('2026-01-10T21:00:00.000Z', 110, 2),
    // Night 1 voids
    makeVoid('2026-01-10T23:30:00.000Z', 140, 2),
    makeVoid('2026-01-11T02:00:00.000Z', 160, 3),
    makeVoid('2026-01-11T04:30:00.000Z', 130, 2),
    // Day 2
    makeVoid('2026-01-11T06:15:00.000Z', 200, 3, { isFirstMorningVoid: true }),
    makeVoid('2026-01-11T07:30:00.000Z', 110, 2),
    makeVoid('2026-01-11T08:45:00.000Z', 90, 3, { leak: true }),
    makeVoid('2026-01-11T10:00:00.000Z', 130, 2),
    makeVoid('2026-01-11T11:15:00.000Z', 100, 3),
    makeVoid('2026-01-11T12:30:00.000Z', 120, 2),
    makeVoid('2026-01-11T13:45:00.000Z', 140, 4, { leak: true }),
    makeVoid('2026-01-11T15:00:00.000Z', 80, 2),
    makeVoid('2026-01-11T16:15:00.000Z', 110, 3),
    makeVoid('2026-01-11T17:30:00.000Z', 100, 2),
    makeVoid('2026-01-11T19:00:00.000Z', 130, 3, { leak: true }),
    makeVoid('2026-01-11T20:30:00.000Z', 90, 2),
    // Night 2 voids
    makeVoid('2026-01-11T23:00:00.000Z', 150, 3),
    makeVoid('2026-01-12T01:30:00.000Z', 120, 2),
    makeVoid('2026-01-12T04:00:00.000Z', 140, 3),
    // Day 3
    makeVoid('2026-01-12T06:30:00.000Z', 190, 3, { isFirstMorningVoid: true }),
    makeVoid('2026-01-12T07:45:00.000Z', 100, 2),
    makeVoid('2026-01-12T09:00:00.000Z', 120, 3, { leak: true }),
    makeVoid('2026-01-12T10:15:00.000Z', 90, 2),
    makeVoid('2026-01-12T11:30:00.000Z', 130, 3),
    makeVoid('2026-01-12T12:45:00.000Z', 110, 4, { leak: true }),
    makeVoid('2026-01-12T14:00:00.000Z', 140, 2),
    makeVoid('2026-01-12T15:15:00.000Z', 80, 3),
    makeVoid('2026-01-12T16:30:00.000Z', 100, 2),
    makeVoid('2026-01-12T18:00:00.000Z', 120, 3, { leak: true }),
    makeVoid('2026-01-12T19:30:00.000Z', 90, 2),
    makeVoid('2026-01-12T21:00:00.000Z', 110, 2),
  ],
  drinks: [
    // Day 1
    makeDrink('2026-01-10T07:00:00.000Z', 200, 'coffee'),
    makeDrink('2026-01-10T09:00:00.000Z', 300, 'water'),
    makeDrink('2026-01-10T11:00:00.000Z', 250, 'tea'),
    makeDrink('2026-01-10T13:30:00.000Z', 200, 'water'),
    makeDrink('2026-01-10T16:00:00.000Z', 300, 'water'),
    makeDrink('2026-01-10T19:00:00.000Z', 250, 'water'),
    // Day 2
    makeDrink('2026-01-11T06:30:00.000Z', 200, 'coffee'),
    makeDrink('2026-01-11T08:30:00.000Z', 300, 'water'),
    makeDrink('2026-01-11T10:30:00.000Z', 250, 'tea'),
    makeDrink('2026-01-11T13:00:00.000Z', 200, 'water'),
    makeDrink('2026-01-11T15:30:00.000Z', 300, 'water'),
    makeDrink('2026-01-11T18:00:00.000Z', 250, 'water'),
    // Day 3
    makeDrink('2026-01-12T06:45:00.000Z', 200, 'coffee'),
    makeDrink('2026-01-12T09:00:00.000Z', 300, 'water'),
    makeDrink('2026-01-12T11:00:00.000Z', 250, 'tea'),
    makeDrink('2026-01-12T13:30:00.000Z', 200, 'water'),
    makeDrink('2026-01-12T15:30:00.000Z', 300, 'water'),
    makeDrink('2026-01-12T18:30:00.000Z', 200, 'water'),
  ],
};

// ─── Scenario 3: Night Shift Worker (age 28, starts 2026-03-01) ───
// Wakes at 4 PM, sleeps at 7 AM. Reversed schedule.
const scenario3: DiaryState = {
  startDate: '2026-03-01',
  age: 28,
  volumeUnit: 'mL',
  diaryStarted: true,
  clinicCode: null,
  wakeTimes: [
    makeWake(1, '2026-03-01T16:00:00.000Z'),
    makeWake(2, '2026-03-02T15:30:00.000Z'),
    makeWake(3, '2026-03-03T16:15:00.000Z'),
  ],
  bedtimes: [
    makeBedtime(1, '2026-03-02T07:00:00.000Z'),
    makeBedtime(2, '2026-03-03T07:30:00.000Z'),
    makeBedtime(3, '2026-03-04T07:00:00.000Z'),
  ],
  voids: [
    // Day 1 (afternoon → early morning)
    makeVoid('2026-03-01T16:30:00.000Z', 400, 1, { isFirstMorningVoid: true }),
    makeVoid('2026-03-01T19:00:00.000Z', 300, 1),
    makeVoid('2026-03-01T22:00:00.000Z', 280, 1),
    makeVoid('2026-03-02T01:00:00.000Z', 320, 2),
    makeVoid('2026-03-02T04:00:00.000Z', 250, 1),
    makeVoid('2026-03-02T06:30:00.000Z', 290, 1),
    // Night (sleeps 7am-4pm) — nocturia
    makeVoid('2026-03-02T10:00:00.000Z', 200, 2),
    makeVoid('2026-03-02T13:00:00.000Z', 180, 1),
    // Day 2
    makeVoid('2026-03-02T16:00:00.000Z', 380, 1, { isFirstMorningVoid: true }),
    makeVoid('2026-03-02T18:30:00.000Z', 310, 1),
    makeVoid('2026-03-02T21:30:00.000Z', 270, 2),
    makeVoid('2026-03-03T00:30:00.000Z', 300, 1),
    makeVoid('2026-03-03T03:30:00.000Z', 260, 1),
    makeVoid('2026-03-03T06:00:00.000Z', 280, 1),
    // Night 2
    makeVoid('2026-03-03T10:30:00.000Z', 190, 2),
    makeVoid('2026-03-03T14:00:00.000Z', 170, 1),
    // Day 3
    makeVoid('2026-03-03T16:30:00.000Z', 350, 1, { isFirstMorningVoid: true }),
    makeVoid('2026-03-03T19:30:00.000Z', 290, 1),
    makeVoid('2026-03-03T22:30:00.000Z', 310, 2),
    makeVoid('2026-03-04T01:30:00.000Z', 280, 1),
    makeVoid('2026-03-04T04:30:00.000Z', 240, 1),
    makeVoid('2026-03-04T06:30:00.000Z', 270, 1),
  ],
  drinks: [
    // Day 1 — night shift hydration
    makeDrink('2026-03-01T16:30:00.000Z', 350, 'coffee'),
    makeDrink('2026-03-01T18:00:00.000Z', 500, 'water'),
    makeDrink('2026-03-01T20:30:00.000Z', 400, 'water'),
    makeDrink('2026-03-01T23:00:00.000Z', 300, 'carbonated'),
    makeDrink('2026-03-02T02:00:00.000Z', 350, 'coffee', 'Mid-shift coffee'),
    makeDrink('2026-03-02T05:00:00.000Z', 400, 'water'),
    // Day 2
    makeDrink('2026-03-02T16:00:00.000Z', 300, 'coffee'),
    makeDrink('2026-03-02T18:30:00.000Z', 500, 'water'),
    makeDrink('2026-03-02T21:00:00.000Z', 350, 'water'),
    makeDrink('2026-03-03T00:00:00.000Z', 300, 'carbonated'),
    makeDrink('2026-03-03T02:30:00.000Z', 350, 'coffee'),
    makeDrink('2026-03-03T05:00:00.000Z', 400, 'water'),
    // Day 3
    makeDrink('2026-03-03T16:30:00.000Z', 300, 'coffee'),
    makeDrink('2026-03-03T19:00:00.000Z', 500, 'water'),
    makeDrink('2026-03-03T22:00:00.000Z', 400, 'water'),
    makeDrink('2026-03-04T01:00:00.000Z', 300, 'carbonated'),
    makeDrink('2026-03-04T03:30:00.000Z', 350, 'coffee'),
    makeDrink('2026-03-04T06:00:00.000Z', 400, 'water'),
  ],
};

// ─── Scenario 4: Elderly with Nocturia (age 74, starts 2026-02-05) ───
// Early riser (5 AM), minimal drinks, frequent night voids, some double voids
const scenario4: DiaryState = {
  startDate: '2026-02-05',
  age: 74,
  volumeUnit: 'mL',
  diaryStarted: true,
  clinicCode: 'IPC-SYD-042',
  wakeTimes: [
    makeWake(1, '2026-02-05T05:00:00.000Z'),
    makeWake(2, '2026-02-06T04:45:00.000Z'),
    makeWake(3, '2026-02-07T05:15:00.000Z'),
  ],
  bedtimes: [
    makeBedtime(1, '2026-02-05T20:30:00.000Z'),
    makeBedtime(2, '2026-02-06T20:00:00.000Z'),
    makeBedtime(3, '2026-02-07T20:30:00.000Z'),
  ],
  voids: [
    // Day 1
    makeVoid('2026-02-05T05:15:00.000Z', 300, 2, { isFirstMorningVoid: true, doubleVoidMl: 80 }),
    makeVoid('2026-02-05T08:00:00.000Z', 200, 1),
    makeVoid('2026-02-05T11:00:00.000Z', 250, 2),
    makeVoid('2026-02-05T14:00:00.000Z', 220, 1, { doubleVoidMl: 60 }),
    makeVoid('2026-02-05T17:00:00.000Z', 280, 2),
    makeVoid('2026-02-05T20:00:00.000Z', 180, 1),
    // Night 1 — multiple nocturia episodes
    makeVoid('2026-02-05T22:30:00.000Z', 200, 2),
    makeVoid('2026-02-06T01:00:00.000Z', 180, 2),
    makeVoid('2026-02-06T03:30:00.000Z', 220, 3),
    // Day 2
    makeVoid('2026-02-06T05:00:00.000Z', 280, 2, { isFirstMorningVoid: true, doubleVoidMl: 90 }),
    makeVoid('2026-02-06T07:30:00.000Z', 190, 1),
    makeVoid('2026-02-06T10:30:00.000Z', 230, 2),
    makeVoid('2026-02-06T13:30:00.000Z', 210, 1, { doubleVoidMl: 70 }),
    makeVoid('2026-02-06T16:30:00.000Z', 260, 2),
    makeVoid('2026-02-06T19:30:00.000Z', 170, 1),
    // Night 2
    makeVoid('2026-02-06T22:00:00.000Z', 190, 2),
    makeVoid('2026-02-07T00:30:00.000Z', 210, 3),
    makeVoid('2026-02-07T03:00:00.000Z', 240, 2),
    // Day 3
    makeVoid('2026-02-07T05:30:00.000Z', 310, 2, { isFirstMorningVoid: true, doubleVoidMl: 100 }),
    makeVoid('2026-02-07T08:30:00.000Z', 200, 1),
    makeVoid('2026-02-07T11:30:00.000Z', 240, 2),
    makeVoid('2026-02-07T14:30:00.000Z', 190, 1, { doubleVoidMl: 50 }),
    makeVoid('2026-02-07T17:30:00.000Z', 270, 2),
    makeVoid('2026-02-07T20:00:00.000Z', 160, 1),
  ],
  drinks: [
    // Day 1 — minimal intake
    makeDrink('2026-02-05T05:30:00.000Z', 150, 'tea'),
    makeDrink('2026-02-05T08:30:00.000Z', 200, 'water'),
    makeDrink('2026-02-05T12:00:00.000Z', 200, 'water'),
    makeDrink('2026-02-05T16:00:00.000Z', 150, 'tea'),
    // Day 2
    makeDrink('2026-02-06T05:15:00.000Z', 150, 'tea'),
    makeDrink('2026-02-06T09:00:00.000Z', 200, 'water'),
    makeDrink('2026-02-06T12:30:00.000Z', 200, 'water'),
    makeDrink('2026-02-06T16:00:00.000Z', 150, 'tea'),
    // Day 3
    makeDrink('2026-02-07T05:45:00.000Z', 150, 'tea'),
    makeDrink('2026-02-07T09:30:00.000Z', 200, 'water'),
    makeDrink('2026-02-07T13:00:00.000Z', 200, 'milk'),
    makeDrink('2026-02-07T16:30:00.000Z', 150, 'tea'),
  ],
};

// ─── Scenario 5: Stress Incontinence / Heavy Drinker (age 45, starts 2026-01-25) ───
// Moderate frequency, large volumes, lots of leaks during activity, high fluid intake, alcohol
const scenario5: DiaryState = {
  startDate: '2026-01-25',
  age: 45,
  volumeUnit: 'mL',
  diaryStarted: true,
  clinicCode: null,
  wakeTimes: [
    makeWake(1, '2026-01-25T06:00:00.000Z'),
    makeWake(2, '2026-01-26T06:30:00.000Z'),
    makeWake(3, '2026-01-27T06:15:00.000Z'),
  ],
  bedtimes: [
    makeBedtime(1, '2026-01-25T23:00:00.000Z'),
    makeBedtime(2, '2026-01-26T23:30:00.000Z'),
    makeBedtime(3, '2026-01-27T22:45:00.000Z'),
  ],
  voids: [
    // Day 1 — moderate frequency, several leaks
    makeVoid('2026-01-25T06:15:00.000Z', 450, 1, { isFirstMorningVoid: true }),
    makeVoid('2026-01-25T08:30:00.000Z', 300, 1, { leak: true, note: 'Leaked during exercise' }),
    makeVoid('2026-01-25T10:45:00.000Z', 350, 2),
    makeVoid('2026-01-25T13:00:00.000Z', 280, 1, { leak: true, note: 'Sneezed and leaked' }),
    makeVoid('2026-01-25T15:30:00.000Z', 400, 2),
    makeVoid('2026-01-25T18:00:00.000Z', 320, 1, { leak: true, note: 'Leaked lifting groceries' }),
    makeVoid('2026-01-25T20:30:00.000Z', 280, 1),
    makeVoid('2026-01-25T22:30:00.000Z', 250, 1),
    // Night 1
    makeVoid('2026-01-26T02:00:00.000Z', 300, 1),
    // Day 2
    makeVoid('2026-01-26T06:45:00.000Z', 420, 1, { isFirstMorningVoid: true }),
    makeVoid('2026-01-26T09:00:00.000Z', 280, 1, { leak: true, note: 'Leaked during jog' }),
    makeVoid('2026-01-26T11:30:00.000Z', 350, 2),
    makeVoid('2026-01-26T14:00:00.000Z', 300, 1, { leak: true, note: 'Coughing episode' }),
    makeVoid('2026-01-26T16:30:00.000Z', 380, 2),
    makeVoid('2026-01-26T19:00:00.000Z', 260, 1),
    makeVoid('2026-01-26T21:00:00.000Z', 320, 1, { leak: true }),
    makeVoid('2026-01-26T23:00:00.000Z', 200, 1),
    // Night 2
    makeVoid('2026-01-27T01:30:00.000Z', 280, 1),
    makeVoid('2026-01-27T04:00:00.000Z', 220, 2),
    // Day 3
    makeVoid('2026-01-27T06:30:00.000Z', 480, 2, { isFirstMorningVoid: true }),
    makeVoid('2026-01-27T08:45:00.000Z', 300, 1, { leak: true, note: 'Leaked during yoga' }),
    makeVoid('2026-01-27T11:00:00.000Z', 350, 2, { leak: true }),
    makeVoid('2026-01-27T13:30:00.000Z', 280, 1),
    makeVoid('2026-01-27T16:00:00.000Z', 400, 2, { leak: true, note: 'Running to bathroom' }),
    makeVoid('2026-01-27T18:30:00.000Z', 320, 1),
    makeVoid('2026-01-27T21:00:00.000Z', 260, 1, { leak: true }),
    makeVoid('2026-01-27T22:30:00.000Z', 230, 1),
  ],
  drinks: [
    // Day 1 — high fluid intake including alcohol
    makeDrink('2026-01-25T06:30:00.000Z', 350, 'coffee'),
    makeDrink('2026-01-25T07:30:00.000Z', 500, 'water'),
    makeDrink('2026-01-25T09:30:00.000Z', 400, 'water'),
    makeDrink('2026-01-25T11:30:00.000Z', 350, 'juice'),
    makeDrink('2026-01-25T13:30:00.000Z', 500, 'water'),
    makeDrink('2026-01-25T16:00:00.000Z', 350, 'water'),
    makeDrink('2026-01-25T18:30:00.000Z', 400, 'water'),
    makeDrink('2026-01-25T20:00:00.000Z', 300, 'alcohol', 'Wine with dinner'),
    makeDrink('2026-01-25T21:00:00.000Z', 200, 'alcohol', 'Second glass'),
    // Day 2
    makeDrink('2026-01-26T07:00:00.000Z', 350, 'coffee'),
    makeDrink('2026-01-26T08:00:00.000Z', 500, 'water'),
    makeDrink('2026-01-26T10:00:00.000Z', 400, 'water'),
    makeDrink('2026-01-26T12:00:00.000Z', 300, 'carbonated'),
    makeDrink('2026-01-26T14:30:00.000Z', 500, 'water'),
    makeDrink('2026-01-26T17:00:00.000Z', 350, 'water'),
    makeDrink('2026-01-26T19:30:00.000Z', 400, 'water'),
    makeDrink('2026-01-26T21:30:00.000Z', 300, 'alcohol', 'Beer'),
    // Day 3
    makeDrink('2026-01-27T06:45:00.000Z', 350, 'coffee'),
    makeDrink('2026-01-27T08:00:00.000Z', 500, 'water'),
    makeDrink('2026-01-27T10:00:00.000Z', 400, 'water'),
    makeDrink('2026-01-27T12:00:00.000Z', 350, 'juice'),
    makeDrink('2026-01-27T14:30:00.000Z', 500, 'water'),
    makeDrink('2026-01-27T17:00:00.000Z', 350, 'tea'),
    makeDrink('2026-01-27T19:30:00.000Z', 400, 'water'),
    makeDrink('2026-01-27T21:30:00.000Z', 250, 'water'),
  ],
};

// ─── Generate and save all CSVs ───

const scenarios = [
  { name: 'normal-healthy', data: scenario1 },
  { name: 'overactive-bladder', data: scenario2 },
  { name: 'night-shift-worker', data: scenario3 },
  { name: 'elderly-nocturia', data: scenario4 },
  { name: 'stress-incontinence', data: scenario5 },
];

const outDir = join(process.cwd(), 'test-csvs');
mkdirSync(outDir, { recursive: true });

for (const s of scenarios) {
  const csv = generateCsv(s.data);
  const filename = `my-flow-check-${s.data.startDate}.csv`;
  const filepath = join(outDir, filename);
  writeFileSync(filepath, csv, 'utf-8');
  console.log(`✅ ${s.name} → ${filename}`);
}

console.log(`\nAll 5 CSVs saved to: ${outDir}`);
