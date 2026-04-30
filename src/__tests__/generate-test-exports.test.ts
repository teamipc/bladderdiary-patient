/**
 * Generate 3 test PDF + CSV exports with diverse schedules.
 *
 * Run: npx vitest run scripts/generate-test-exports.ts
 *
 * Outputs to ~/Desktop:
 *   1. Early riser (5 AM wake) — normal day worker
 *   2. Night shift (8 PM wake) — night shift worker
 *   3. Normal schedule (7 AM wake) — with leaks, double voids, varied drinks
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { generateCsv } from '@/lib/exportCsv';
import { generatePdfBlob } from '@/lib/exportPdf';
import { computeMetrics } from '@/lib/calculations';
import { useDiaryStore } from '@/lib/store';
import { getDayNumber } from '@/lib/utils';
import type { DiaryState } from '@/lib/types';

const DESKTOP = join('/Users/zhen/Desktop');

function uid(prefix: string, n: number): string {
  return `${prefix}-${String(n).padStart(3, '0')}`;
}

/* ================================================================== */
/*  Dataset 1: Early Riser (5 AM wake, 9:30 PM bed)                    */
/* ================================================================== */

const earlyRiser: DiaryState = {
  startDate: '2026-03-10',
  age: 58,
  volumeUnit: 'mL',
  diaryStarted: true,
  clinicCode: null,
  timeZone: 'UTC',
    morningAnchor: null,
    day1CelebrationShown: false,
  leaks: [
    // Standalone leak on Day 2
    {
      id: uid('l', 1),
      timestampIso: '2026-03-11T15:30:00.000Z', // 3:30 PM
      trigger: 'cough',
      urgencyBeforeLeak: false,
      amount: 'drops',
    },
  ],
  voids: [
    // Day 1
    { id: uid('v', 1), timestampIso: '2026-03-10T05:10:00.000Z', volumeMl: 350, sensation: 1, leak: false, note: '', isFirstMorningVoid: true },
    { id: uid('v', 2), timestampIso: '2026-03-10T08:00:00.000Z', volumeMl: 200, sensation: 0, leak: false, note: '', isFirstMorningVoid: false },
    { id: uid('v', 3), timestampIso: '2026-03-10T11:30:00.000Z', volumeMl: 250, sensation: 2, leak: false, note: '', isFirstMorningVoid: false },
    { id: uid('v', 4), timestampIso: '2026-03-10T14:00:00.000Z', volumeMl: 300, sensation: 1, leak: false, note: '', isFirstMorningVoid: false },
    { id: uid('v', 5), timestampIso: '2026-03-10T17:30:00.000Z', volumeMl: 180, sensation: 1, leak: false, note: '', isFirstMorningVoid: false },
    { id: uid('v', 6), timestampIso: '2026-03-10T20:00:00.000Z', volumeMl: 220, sensation: 2, leak: false, note: '', isFirstMorningVoid: false },
    // Night 1 void
    { id: uid('v', 7), timestampIso: '2026-03-11T02:00:00.000Z', volumeMl: 300, sensation: 3, leak: false, note: 'woke up to pee', isFirstMorningVoid: false },
    // Day 2
    { id: uid('v', 8), timestampIso: '2026-03-11T05:15:00.000Z', volumeMl: 400, sensation: 2, leak: false, note: '', isFirstMorningVoid: true },
    { id: uid('v', 9), timestampIso: '2026-03-11T09:00:00.000Z', volumeMl: 150, sensation: 0, leak: false, note: '', isFirstMorningVoid: false },
    { id: uid('v', 10), timestampIso: '2026-03-11T12:00:00.000Z', volumeMl: 250, doubleVoidMl: 50, sensation: 2, leak: false, note: 'double void', isFirstMorningVoid: false },
    { id: uid('v', 11), timestampIso: '2026-03-11T16:00:00.000Z', volumeMl: 200, sensation: 1, leak: true, note: '', isFirstMorningVoid: false },
    { id: uid('v', 12), timestampIso: '2026-03-11T19:30:00.000Z', volumeMl: 280, sensation: 2, leak: false, note: '', isFirstMorningVoid: false },
    // Night 2 void
    { id: uid('v', 13), timestampIso: '2026-03-12T03:00:00.000Z', volumeMl: 350, sensation: 3, leak: false, note: '', isFirstMorningVoid: false },
    // Day 3
    { id: uid('v', 14), timestampIso: '2026-03-12T05:05:00.000Z', volumeMl: 380, sensation: 2, leak: false, note: '', isFirstMorningVoid: true },
    { id: uid('v', 15), timestampIso: '2026-03-12T08:30:00.000Z', volumeMl: 200, sensation: 0, leak: false, note: '', isFirstMorningVoid: false },
    { id: uid('v', 16), timestampIso: '2026-03-12T12:00:00.000Z', volumeMl: 250, sensation: 1, leak: false, note: '', isFirstMorningVoid: false },
    { id: uid('v', 17), timestampIso: '2026-03-12T15:30:00.000Z', volumeMl: 300, sensation: 2, leak: false, note: '', isFirstMorningVoid: false },
    { id: uid('v', 18), timestampIso: '2026-03-12T19:00:00.000Z', volumeMl: 220, sensation: 1, leak: false, note: '', isFirstMorningVoid: false },
  ],
  drinks: [
    // Day 1
    { id: uid('d', 1), timestampIso: '2026-03-10T05:30:00.000Z', volumeMl: 300, drinkType: 'coffee', note: '' },
    { id: uid('d', 2), timestampIso: '2026-03-10T07:00:00.000Z', volumeMl: 250, drinkType: 'water', note: '' },
    { id: uid('d', 3), timestampIso: '2026-03-10T10:00:00.000Z', volumeMl: 200, drinkType: 'tea', note: '' },
    { id: uid('d', 4), timestampIso: '2026-03-10T13:00:00.000Z', volumeMl: 350, drinkType: 'water', note: '' },
    { id: uid('d', 5), timestampIso: '2026-03-10T16:00:00.000Z', volumeMl: 200, drinkType: 'juice', note: '' },
    { id: uid('d', 6), timestampIso: '2026-03-10T19:00:00.000Z', volumeMl: 250, drinkType: 'water', note: '' },
    // Day 2
    { id: uid('d', 7), timestampIso: '2026-03-11T05:30:00.000Z', volumeMl: 300, drinkType: 'coffee', note: '' },
    { id: uid('d', 8), timestampIso: '2026-03-11T08:00:00.000Z', volumeMl: 400, drinkType: 'water', note: '' },
    { id: uid('d', 9), timestampIso: '2026-03-11T11:00:00.000Z', volumeMl: 250, drinkType: 'tea', note: '' },
    { id: uid('d', 10), timestampIso: '2026-03-11T14:00:00.000Z', volumeMl: 350, drinkType: 'water', note: '' },
    { id: uid('d', 11), timestampIso: '2026-03-11T18:00:00.000Z', volumeMl: 200, drinkType: 'carbonated', note: '' },
    // Day 3
    { id: uid('d', 12), timestampIso: '2026-03-12T05:30:00.000Z', volumeMl: 300, drinkType: 'coffee', note: '' },
    { id: uid('d', 13), timestampIso: '2026-03-12T09:00:00.000Z', volumeMl: 350, drinkType: 'water', note: '' },
    { id: uid('d', 14), timestampIso: '2026-03-12T12:30:00.000Z', volumeMl: 200, drinkType: 'juice', note: '' },
    { id: uid('d', 15), timestampIso: '2026-03-12T16:00:00.000Z', volumeMl: 300, drinkType: 'water', note: '' },
  ],
  bedtimes: [
    { id: uid('bt', 1), timestampIso: '2026-03-10T21:30:00.000Z', dayNumber: 1 },
    { id: uid('bt', 2), timestampIso: '2026-03-11T21:00:00.000Z', dayNumber: 2 },
    { id: uid('bt', 3), timestampIso: '2026-03-12T21:30:00.000Z', dayNumber: 3 },
  ],
  wakeTimes: [
    { id: uid('wt', 1), timestampIso: '2026-03-10T05:00:00.000Z', dayNumber: 1 },
    { id: uid('wt', 2), timestampIso: '2026-03-11T05:00:00.000Z', dayNumber: 2 },
    { id: uid('wt', 3), timestampIso: '2026-03-12T05:00:00.000Z', dayNumber: 3 },
  ],
};

/* ================================================================== */
/*  Dataset 2: Night Shift (8 PM wake, 10 AM bed)                      */
/* ================================================================== */

const nightShift: DiaryState = {
  startDate: '2026-03-10',
  age: 42,
  volumeUnit: 'mL',
  diaryStarted: true,
  clinicCode: null,
  timeZone: 'UTC',
    morningAnchor: null,
    day1CelebrationShown: false,
  leaks: [
    // Standalone leaks
    {
      id: uid('l', 10),
      timestampIso: '2026-03-11T03:00:00.000Z', // 3 AM during Night 1 shift
      trigger: 'lifting',
      urgencyBeforeLeak: true,
      amount: 'small',
    },
    {
      id: uid('l', 11),
      timestampIso: '2026-03-12T01:30:00.000Z', // 1:30 AM during Night 2 shift
      trigger: 'toilet_way',
      urgencyBeforeLeak: true,
      amount: 'medium',
      notes: 'couldn\'t find toilet fast enough',
    },
    {
      id: uid('l', 12),
      timestampIso: '2026-03-12T22:00:00.000Z',
      trigger: 'sneeze',
      urgencyBeforeLeak: false,
      amount: 'drops',
    },
  ],
  voids: [
    // Day 1 (wake 8 PM Mar 10)
    { id: uid('v', 20), timestampIso: '2026-03-10T20:15:00.000Z', volumeMl: 400, sensation: 2, leak: false, note: '', isFirstMorningVoid: true },
    { id: uid('v', 21), timestampIso: '2026-03-10T23:00:00.000Z', volumeMl: 250, sensation: 1, leak: false, note: '', isFirstMorningVoid: false },
    { id: uid('v', 22), timestampIso: '2026-03-11T02:00:00.000Z', volumeMl: 300, sensation: 2, leak: true, note: '', isFirstMorningVoid: false },
    { id: uid('v', 23), timestampIso: '2026-03-11T05:00:00.000Z', volumeMl: 200, sensation: 1, leak: false, note: '', isFirstMorningVoid: false },
    { id: uid('v', 24), timestampIso: '2026-03-11T08:00:00.000Z', volumeMl: 350, sensation: 2, leak: false, note: '', isFirstMorningVoid: false },
    // Night 1 void (sleeping during day)
    { id: uid('v', 25), timestampIso: '2026-03-11T14:00:00.000Z', volumeMl: 250, sensation: 3, leak: false, note: '', isFirstMorningVoid: false },
    // Day 2 (wake 8 PM Mar 11)
    { id: uid('v', 26), timestampIso: '2026-03-11T20:10:00.000Z', volumeMl: 380, sensation: 2, leak: false, note: '', isFirstMorningVoid: true },
    { id: uid('v', 27), timestampIso: '2026-03-11T23:30:00.000Z', volumeMl: 200, doubleVoidMl: 80, sensation: 1, leak: false, note: 'double void', isFirstMorningVoid: false },
    { id: uid('v', 28), timestampIso: '2026-03-12T02:30:00.000Z', volumeMl: 280, sensation: 2, leak: false, note: '', isFirstMorningVoid: false },
    { id: uid('v', 29), timestampIso: '2026-03-12T06:00:00.000Z', volumeMl: 220, sensation: 1, leak: false, note: '', isFirstMorningVoid: false },
    { id: uid('v', 30), timestampIso: '2026-03-12T09:00:00.000Z', volumeMl: 300, sensation: 2, leak: false, note: '', isFirstMorningVoid: false },
    // Night 2 void
    { id: uid('v', 31), timestampIso: '2026-03-12T15:00:00.000Z', volumeMl: 200, sensation: 2, leak: false, note: '', isFirstMorningVoid: false },
    // Day 3 (wake 8 PM Mar 12)
    { id: uid('v', 32), timestampIso: '2026-03-12T20:05:00.000Z', volumeMl: 420, sensation: 2, leak: false, note: '', isFirstMorningVoid: true },
    { id: uid('v', 33), timestampIso: '2026-03-13T00:00:00.000Z', volumeMl: 200, sensation: 0, leak: false, note: '', isFirstMorningVoid: false },
    { id: uid('v', 34), timestampIso: '2026-03-13T03:30:00.000Z', volumeMl: 350, sensation: 2, leak: true, note: 'slight leak', isFirstMorningVoid: false },
    { id: uid('v', 35), timestampIso: '2026-03-13T07:00:00.000Z', volumeMl: 250, sensation: 1, leak: false, note: '', isFirstMorningVoid: false },
  ],
  drinks: [
    // Day 1
    { id: uid('d', 20), timestampIso: '2026-03-10T20:30:00.000Z', volumeMl: 350, drinkType: 'coffee', note: '' },
    { id: uid('d', 21), timestampIso: '2026-03-11T00:00:00.000Z', volumeMl: 500, drinkType: 'water', note: '' },
    { id: uid('d', 22), timestampIso: '2026-03-11T04:00:00.000Z', volumeMl: 300, drinkType: 'carbonated', note: '' },
    { id: uid('d', 23), timestampIso: '2026-03-11T07:00:00.000Z', volumeMl: 250, drinkType: 'water', note: '' },
    // Day 2
    { id: uid('d', 24), timestampIso: '2026-03-11T21:00:00.000Z', volumeMl: 300, drinkType: 'coffee', note: '' },
    { id: uid('d', 25), timestampIso: '2026-03-12T00:30:00.000Z', volumeMl: 400, drinkType: 'water', note: '' },
    { id: uid('d', 26), timestampIso: '2026-03-12T04:00:00.000Z', volumeMl: 200, drinkType: 'tea', note: '' },
    { id: uid('d', 27), timestampIso: '2026-03-12T07:30:00.000Z', volumeMl: 350, drinkType: 'water', note: '' },
    // Day 3
    { id: uid('d', 28), timestampIso: '2026-03-12T21:00:00.000Z', volumeMl: 300, drinkType: 'coffee', note: '' },
    { id: uid('d', 29), timestampIso: '2026-03-13T01:00:00.000Z', volumeMl: 500, drinkType: 'water', note: '' },
    { id: uid('d', 30), timestampIso: '2026-03-13T05:00:00.000Z', volumeMl: 200, drinkType: 'alcohol', note: 'beer after shift' },
  ],
  bedtimes: [
    { id: uid('bt', 10), timestampIso: '2026-03-11T10:00:00.000Z', dayNumber: 1 },
    { id: uid('bt', 11), timestampIso: '2026-03-12T10:30:00.000Z', dayNumber: 2 },
    { id: uid('bt', 12), timestampIso: '2026-03-13T09:00:00.000Z', dayNumber: 3 },
  ],
  wakeTimes: [
    { id: uid('wt', 10), timestampIso: '2026-03-10T20:00:00.000Z', dayNumber: 1 },
    { id: uid('wt', 11), timestampIso: '2026-03-11T20:00:00.000Z', dayNumber: 2 },
    { id: uid('wt', 12), timestampIso: '2026-03-12T20:00:00.000Z', dayNumber: 3 },
  ],
};

/* ================================================================== */
/*  Dataset 3: Normal Schedule (7 AM wake, 11 PM bed) + lots of events */
/* ================================================================== */

const normalFull: DiaryState = {
  startDate: '2026-03-10',
  age: 72,
  volumeUnit: 'oz',
  diaryStarted: true,
  clinicCode: 'IPC-2026',
  timeZone: 'UTC',
    morningAnchor: null,
    day1CelebrationShown: false,
  leaks: [
    {
      id: uid('l', 20),
      timestampIso: '2026-03-10T10:00:00.000Z',
      trigger: 'laugh',
      urgencyBeforeLeak: false,
      amount: 'drops',
    },
    {
      id: uid('l', 21),
      timestampIso: '2026-03-11T14:30:00.000Z',
      trigger: 'exercise',
      urgencyBeforeLeak: true,
      amount: 'small',
      notes: 'during walk',
    },
    {
      id: uid('l', 22),
      timestampIso: '2026-03-12T09:00:00.000Z',
      trigger: 'sneeze',
      urgencyBeforeLeak: false,
      amount: 'drops',
    },
    {
      id: uid('l', 23),
      timestampIso: '2026-03-12T16:00:00.000Z',
      trigger: 'not_sure',
      urgencyBeforeLeak: true,
      amount: 'medium',
    },
  ],
  voids: [
    // Day 1
    { id: uid('v', 40), timestampIso: '2026-03-10T07:10:00.000Z', volumeMl: 300, sensation: 2, leak: false, note: '', isFirstMorningVoid: true },
    { id: uid('v', 41), timestampIso: '2026-03-10T09:30:00.000Z', volumeMl: 150, doubleVoidMl: 40, sensation: 1, leak: false, note: 'double void', isFirstMorningVoid: false },
    { id: uid('v', 42), timestampIso: '2026-03-10T11:45:00.000Z', volumeMl: 200, sensation: 2, leak: true, note: '', isFirstMorningVoid: false },
    { id: uid('v', 43), timestampIso: '2026-03-10T14:00:00.000Z', volumeMl: 250, sensation: 1, leak: false, note: '', isFirstMorningVoid: false },
    { id: uid('v', 44), timestampIso: '2026-03-10T16:30:00.000Z', volumeMl: 180, sensation: 0, leak: false, note: '', isFirstMorningVoid: false },
    { id: uid('v', 45), timestampIso: '2026-03-10T19:00:00.000Z', volumeMl: 220, sensation: 2, leak: false, note: '', isFirstMorningVoid: false },
    { id: uid('v', 46), timestampIso: '2026-03-10T22:00:00.000Z', volumeMl: 280, sensation: 3, leak: true, note: '', isFirstMorningVoid: false },
    // Night 1
    { id: uid('v', 47), timestampIso: '2026-03-11T01:30:00.000Z', volumeMl: 200, sensation: 3, leak: false, note: '', isFirstMorningVoid: false },
    { id: uid('v', 48), timestampIso: '2026-03-11T04:00:00.000Z', volumeMl: 250, sensation: 2, leak: false, note: '', isFirstMorningVoid: false },
    // Day 2
    { id: uid('v', 49), timestampIso: '2026-03-11T07:05:00.000Z', volumeMl: 350, sensation: 2, leak: false, note: '', isFirstMorningVoid: true },
    { id: uid('v', 50), timestampIso: '2026-03-11T10:00:00.000Z', volumeMl: 180, sensation: 1, leak: false, note: '', isFirstMorningVoid: false },
    { id: uid('v', 51), timestampIso: '2026-03-11T12:30:00.000Z', volumeMl: 200, doubleVoidMl: 60, sensation: 2, leak: false, note: '', isFirstMorningVoid: false },
    { id: uid('v', 52), timestampIso: '2026-03-11T15:00:00.000Z', volumeMl: 220, sensation: 4, leak: true, note: 'urgency leak', isFirstMorningVoid: false },
    { id: uid('v', 53), timestampIso: '2026-03-11T18:00:00.000Z', volumeMl: 250, sensation: 1, leak: false, note: '', isFirstMorningVoid: false },
    { id: uid('v', 54), timestampIso: '2026-03-11T21:00:00.000Z', volumeMl: 300, sensation: 2, leak: false, note: '', isFirstMorningVoid: false },
    // Night 2
    { id: uid('v', 55), timestampIso: '2026-03-12T02:00:00.000Z', volumeMl: 280, sensation: 3, leak: false, note: '', isFirstMorningVoid: false },
    { id: uid('v', 56), timestampIso: '2026-03-12T05:00:00.000Z', volumeMl: 200, sensation: 2, leak: false, note: '', isFirstMorningVoid: false },
    // Day 3
    { id: uid('v', 57), timestampIso: '2026-03-12T07:00:00.000Z', volumeMl: 320, sensation: 2, leak: false, note: '', isFirstMorningVoid: true },
    { id: uid('v', 58), timestampIso: '2026-03-12T10:00:00.000Z', volumeMl: 180, doubleVoidMl: 50, sensation: 1, leak: false, note: '', isFirstMorningVoid: false },
    { id: uid('v', 59), timestampIso: '2026-03-12T13:00:00.000Z', volumeMl: 250, sensation: 2, leak: true, note: '', isFirstMorningVoid: false },
    { id: uid('v', 60), timestampIso: '2026-03-12T16:30:00.000Z', volumeMl: 200, sensation: 1, leak: false, note: '', isFirstMorningVoid: false },
    { id: uid('v', 61), timestampIso: '2026-03-12T19:30:00.000Z', volumeMl: 280, sensation: 2, leak: false, note: '', isFirstMorningVoid: false },
    { id: uid('v', 62), timestampIso: '2026-03-12T22:00:00.000Z', volumeMl: 300, sensation: 3, leak: false, note: '', isFirstMorningVoid: false },
  ],
  drinks: [
    // Day 1
    { id: uid('d', 40), timestampIso: '2026-03-10T07:30:00.000Z', volumeMl: 240, drinkType: 'coffee', note: '' },
    { id: uid('d', 41), timestampIso: '2026-03-10T09:00:00.000Z', volumeMl: 350, drinkType: 'water', note: '' },
    { id: uid('d', 42), timestampIso: '2026-03-10T11:00:00.000Z', volumeMl: 200, drinkType: 'tea', note: '' },
    { id: uid('d', 43), timestampIso: '2026-03-10T13:00:00.000Z', volumeMl: 300, drinkType: 'water', note: '' },
    { id: uid('d', 44), timestampIso: '2026-03-10T15:30:00.000Z', volumeMl: 250, drinkType: 'juice', note: '' },
    { id: uid('d', 45), timestampIso: '2026-03-10T18:00:00.000Z', volumeMl: 200, drinkType: 'water', note: '' },
    { id: uid('d', 46), timestampIso: '2026-03-10T20:00:00.000Z', volumeMl: 150, drinkType: 'milk', note: '' },
    // Day 2
    { id: uid('d', 47), timestampIso: '2026-03-11T07:30:00.000Z', volumeMl: 240, drinkType: 'coffee', note: '' },
    { id: uid('d', 48), timestampIso: '2026-03-11T09:30:00.000Z', volumeMl: 400, drinkType: 'water', note: '' },
    { id: uid('d', 49), timestampIso: '2026-03-11T12:00:00.000Z', volumeMl: 200, drinkType: 'carbonated', note: '' },
    { id: uid('d', 50), timestampIso: '2026-03-11T14:30:00.000Z', volumeMl: 300, drinkType: 'water', note: '' },
    { id: uid('d', 51), timestampIso: '2026-03-11T17:00:00.000Z', volumeMl: 200, drinkType: 'tea', note: '' },
    { id: uid('d', 52), timestampIso: '2026-03-11T19:30:00.000Z', volumeMl: 250, drinkType: 'water', note: '' },
    // Day 3
    { id: uid('d', 53), timestampIso: '2026-03-12T07:30:00.000Z', volumeMl: 240, drinkType: 'coffee', note: '' },
    { id: uid('d', 54), timestampIso: '2026-03-12T10:00:00.000Z', volumeMl: 350, drinkType: 'water', note: '' },
    { id: uid('d', 55), timestampIso: '2026-03-12T12:30:00.000Z', volumeMl: 200, drinkType: 'juice', note: '' },
    { id: uid('d', 56), timestampIso: '2026-03-12T15:00:00.000Z', volumeMl: 300, drinkType: 'water', note: '' },
    { id: uid('d', 57), timestampIso: '2026-03-12T18:00:00.000Z', volumeMl: 250, drinkType: 'alcohol', note: 'wine with dinner' },
    { id: uid('d', 58), timestampIso: '2026-03-12T20:30:00.000Z', volumeMl: 200, drinkType: 'water', note: '' },
  ],
  bedtimes: [
    { id: uid('bt', 20), timestampIso: '2026-03-10T23:00:00.000Z', dayNumber: 1 },
    { id: uid('bt', 21), timestampIso: '2026-03-11T23:00:00.000Z', dayNumber: 2 },
    { id: uid('bt', 22), timestampIso: '2026-03-12T23:00:00.000Z', dayNumber: 3 },
  ],
  wakeTimes: [
    { id: uid('wt', 20), timestampIso: '2026-03-10T07:00:00.000Z', dayNumber: 1 },
    { id: uid('wt', 21), timestampIso: '2026-03-11T07:00:00.000Z', dayNumber: 2 },
    { id: uid('wt', 22), timestampIso: '2026-03-12T07:00:00.000Z', dayNumber: 3 },
  ],
};

/* ================================================================== */
/*  Generate exports                                                   */
/* ================================================================== */

const datasets = [
  { name: 'early-riser-5am', state: earlyRiser },
  { name: 'night-shift-8pm', state: nightShift },
  { name: 'normal-full-7am', state: normalFull },
];

describe('generate test exports', () => {
  for (const { name, state } of datasets) {
    it(`generates CSV for ${name}`, () => {
      const csv = generateCsv(state);
      const path = join(DESKTOP, `${name}.csv`);
      writeFileSync(path, csv, 'utf-8');
      console.log(`  ✓ CSV: ${path}`);
    });

    it(`generates PDF for ${name}`, async () => {
      const { blob } = generatePdfBlob(state);
      // jsdom Blob: read via FileReader
      const buffer = await new Promise<Buffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(Buffer.from(reader.result as ArrayBuffer));
        reader.onerror = reject;
        reader.readAsArrayBuffer(blob);
      });
      const path = join(DESKTOP, `${name}.pdf`);
      writeFileSync(path, buffer);
      console.log(`  ✓ PDF: ${path}`);
    });
  }
});

/* ================================================================== */
/*  Validate datasets can be loaded in the store without errors        */
/* ================================================================== */

describe('datasets load correctly in store', () => {
  beforeEach(() => {
    useDiaryStore.getState().resetDiary();
  });

  for (const { name, state } of datasets) {
    it(`${name}: all events assigned to correct days`, () => {
      // Load state into store
      useDiaryStore.setState(state);
      const s = useDiaryStore.getState();

      // Verify every void is assigned to a valid day
      for (const v of s.voids) {
        const day = getDayNumber(v.timestampIso, s.startDate, s.bedtimes);
        expect(day).toBeGreaterThanOrEqual(1);
        expect(day).toBeLessThanOrEqual(3);
      }

      // Verify every drink is assigned to a valid day
      for (const d of s.drinks) {
        const day = getDayNumber(d.timestampIso, s.startDate, s.bedtimes);
        expect(day).toBeGreaterThanOrEqual(1);
        expect(day).toBeLessThanOrEqual(3);
      }

      // Verify every leak is assigned to a valid day
      for (const l of (s.leaks ?? [])) {
        const day = getDayNumber(l.timestampIso, s.startDate, s.bedtimes);
        expect(day).toBeGreaterThanOrEqual(1);
        expect(day).toBeLessThanOrEqual(3);
      }

      // Verify selectors return data for all 3 days
      for (const dayNum of [1, 2, 3] as const) {
        expect(s.getVoidsForDay(dayNum).length).toBeGreaterThanOrEqual(0);
        expect(s.getDrinksForDay(dayNum).length).toBeGreaterThanOrEqual(0);
        expect(s.getBedtimeForDay(dayNum)).toBeDefined();
        expect(s.getWakeTimeForDay(dayNum)).toBeDefined();
      }

      expect(s.hasData()).toBe(true);
    });

    it(`${name}: computeMetrics runs without error`, () => {
      const metrics = computeMetrics(state);
      expect(metrics).toBeDefined();
      expect(metrics.totalVoidCount).toBeGreaterThan(0);
      expect(metrics.dayMetrics).toHaveLength(3);
    });

    it(`${name}: CSV generation produces valid output`, () => {
      const csv = generateCsv(state);
      expect(csv).toContain('## METADATA');
      expect(csv).toContain('## EVENTS');
      expect(csv).toContain('type,timestamp');
      // Verify all event types present
      expect(csv).toContain('void,');
      expect(csv).toContain('drink,');
      expect(csv).toContain('bedtime,');
      expect(csv).toContain('wake,');
      if ((state.leaks ?? []).length > 0) {
        expect(csv).toContain('leak,');
      }
    });
  }
});
