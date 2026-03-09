/**
 * Test script: generates a PDF with multiple same-hour voids and double voids
 * to visually verify the hourly grid display.
 *
 * Run: npx tsx scripts/test-pdf-multi-void.ts
 */

// Polyfill browser APIs needed by jsPDF
import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
(globalThis as any).window = dom.window;
(globalThis as any).document = dom.window.document;
Object.defineProperty(globalThis, 'navigator', {
  value: dom.window.navigator,
  writable: true,
  configurable: true,
});
(globalThis as any).HTMLElement = dom.window.HTMLElement;
(globalThis as any).Node = dom.window.Node;

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { writeFileSync } from 'fs';

// Import our functions
import { format, parseISO } from 'date-fns';
import { getDayNumber, getDayDate, formatTime, mlToDisplayVolume } from '../src/lib/utils';
import { getDrinkLabel, SENSATION_LABELS, PREMIUM_FEATURES_ENABLED } from '../src/lib/constants';
import { computeMetrics } from '../src/lib/calculations';
import { IPC_LOGO_BASE64, IPC_LOGO_ASPECT } from '../src/lib/ipcLogoBase64';
import type { DiaryState } from '../src/lib/types';

// ── Test data with multi-void hours and double voids ──
const testState: DiaryState = {
  startDate: '2026-03-07',
  age: 45,
  volumeUnit: 'mL',
  diaryStarted: true,
  clinicCode: null,
  wakeTimes: [
    { id: 'w1', timestampIso: '2026-03-07T06:00:00.000Z', dayNumber: 1 },
    { id: 'w2', timestampIso: '2026-03-08T06:30:00.000Z', dayNumber: 2 },
    { id: 'w3', timestampIso: '2026-03-09T07:00:00.000Z', dayNumber: 3 },
  ],
  bedtimes: [
    { id: 'b1', timestampIso: '2026-03-07T22:00:00.000Z', dayNumber: 1 },
    { id: 'b2', timestampIso: '2026-03-08T22:30:00.000Z', dayNumber: 2 },
    { id: 'b3', timestampIso: '2026-03-09T23:00:00.000Z', dayNumber: 3 },
  ],
  voids: [
    // Day 1: THREE voids in 6 AM hour (6:13, 6:30, 6:50)
    { id: 'v1', timestampIso: '2026-03-07T06:13:00.000Z', volumeMl: 250, sensation: 2, leak: false, note: '', isFirstMorningVoid: true },
    { id: 'v2', timestampIso: '2026-03-07T06:30:00.000Z', volumeMl: 150, sensation: 1, leak: false, note: '', isFirstMorningVoid: false },
    { id: 'v3', timestampIso: '2026-03-07T06:50:00.000Z', volumeMl: 200, sensation: 3, leak: false, note: '', isFirstMorningVoid: false },
    // Day 1: Single double void at 9 AM
    { id: 'v4', timestampIso: '2026-03-07T09:15:00.000Z', volumeMl: 300, doubleVoidMl: 80, sensation: 2, leak: false, note: '', isFirstMorningVoid: false },
    // Day 1: Normal single void at 12 PM
    { id: 'v5', timestampIso: '2026-03-07T12:00:00.000Z', volumeMl: 350, sensation: 2, leak: false, note: '', isFirstMorningVoid: false },
    // Day 1: TWO voids in 3 PM hour, one with leak
    { id: 'v6', timestampIso: '2026-03-07T15:10:00.000Z', volumeMl: 200, sensation: 3, leak: true, note: '', isFirstMorningVoid: false },
    { id: 'v7', timestampIso: '2026-03-07T15:45:00.000Z', volumeMl: 180, sensation: 2, leak: false, note: '', isFirstMorningVoid: false },
    // Day 1: Double void + another void in SAME 6 PM hour
    { id: 'v8', timestampIso: '2026-03-07T18:05:00.000Z', volumeMl: 280, doubleVoidMl: 60, sensation: 1, leak: false, note: '', isFirstMorningVoid: false },
    { id: 'v9', timestampIso: '2026-03-07T18:40:00.000Z', volumeMl: 220, sensation: 2, leak: false, note: '', isFirstMorningVoid: false },
    // Day 1: Night void
    { id: 'v10', timestampIso: '2026-03-07T23:30:00.000Z', volumeMl: 300, sensation: 3, leak: false, note: '', isFirstMorningVoid: false },

    // Day 2: simpler
    { id: 'v11', timestampIso: '2026-03-08T06:45:00.000Z', volumeMl: 280, sensation: 2, leak: false, note: '', isFirstMorningVoid: true },
    { id: 'v12', timestampIso: '2026-03-08T10:00:00.000Z', volumeMl: 320, doubleVoidMl: 100, sensation: 2, leak: false, note: '', isFirstMorningVoid: false },
    { id: 'v13', timestampIso: '2026-03-08T14:30:00.000Z', volumeMl: 250, sensation: 1, leak: false, note: '', isFirstMorningVoid: false },
    { id: 'v14', timestampIso: '2026-03-08T19:00:00.000Z', volumeMl: 300, sensation: 2, leak: false, note: '', isFirstMorningVoid: false },

    // Day 3
    { id: 'v15', timestampIso: '2026-03-09T07:15:00.000Z', volumeMl: 260, sensation: 2, leak: false, note: '', isFirstMorningVoid: true },
    { id: 'v16', timestampIso: '2026-03-09T11:00:00.000Z', volumeMl: 300, sensation: 2, leak: false, note: '', isFirstMorningVoid: false },
    { id: 'v17', timestampIso: '2026-03-09T16:00:00.000Z', volumeMl: 280, sensation: 3, leak: false, note: '', isFirstMorningVoid: false },
  ],
  drinks: [
    // Day 1: TWO drinks in same 6 AM hour
    { id: 'd1', timestampIso: '2026-03-07T06:05:00.000Z', volumeMl: 250, drinkType: 'water', note: '' },
    { id: 'd2', timestampIso: '2026-03-07T06:20:00.000Z', volumeMl: 200, drinkType: 'coffee', note: '' },
    { id: 'd3', timestampIso: '2026-03-07T08:00:00.000Z', volumeMl: 300, drinkType: 'water', note: '' },
    { id: 'd4', timestampIso: '2026-03-07T12:00:00.000Z', volumeMl: 350, drinkType: 'juice', note: '' },
    { id: 'd5', timestampIso: '2026-03-07T15:00:00.000Z', volumeMl: 250, drinkType: 'tea', note: '' },
    { id: 'd6', timestampIso: '2026-03-07T18:00:00.000Z', volumeMl: 200, drinkType: 'water', note: '' },
    // Day 2
    { id: 'd7', timestampIso: '2026-03-08T07:00:00.000Z', volumeMl: 300, drinkType: 'coffee', note: '' },
    { id: 'd8', timestampIso: '2026-03-08T10:00:00.000Z', volumeMl: 250, drinkType: 'water', note: '' },
    { id: 'd9', timestampIso: '2026-03-08T13:00:00.000Z', volumeMl: 400, drinkType: 'water', note: '' },
    // Day 3
    { id: 'd10', timestampIso: '2026-03-09T07:30:00.000Z', volumeMl: 250, drinkType: 'coffee', note: '' },
    { id: 'd11', timestampIso: '2026-03-09T12:00:00.000Z', volumeMl: 300, drinkType: 'water', note: '' },
  ],
};

// ── Import and call generatePdf but save to file instead of browser download ──
// We replicate the generatePdf logic but output to a file.

// Import the actual generatePdf but patch the download
import { generatePdf as _orig } from '../src/lib/exportPdf';

// Monkey-patch document for the download part
const origCreateElement = document.createElement.bind(document);
let capturedBlob: Blob | null = null;

// Override URL.createObjectURL
(globalThis as any).URL = {
  createObjectURL: (blob: Blob) => {
    capturedBlob = blob;
    return 'blob:test';
  },
  revokeObjectURL: () => {},
};

// Override document.body.appendChild / removeChild
document.body.appendChild = (() => {}) as any;
document.body.removeChild = (() => {}) as any;

// Override link click
const origLink = origCreateElement('a');
const mockCreateElement = (tag: string) => {
  if (tag === 'a') {
    return {
      href: '',
      download: '',
      style: { display: '' },
      click: () => {},
    } as any;
  }
  return origCreateElement(tag);
};
(document as any).createElement = mockCreateElement;

console.log('Generating PDF with test data...');
_orig(testState);

if (capturedBlob) {
  // Convert blob to buffer and write to file
  capturedBlob.arrayBuffer().then((buf) => {
    const pdfPath = '/Users/zhen/bladderdiary-patient/test-multi-void.pdf';
    writeFileSync(pdfPath, Buffer.from(buf));
    console.log(`PDF written to: ${pdfPath}`);
    console.log('Open with: open test-multi-void.pdf');
  });
} else {
  console.error('No PDF blob captured!');
}
