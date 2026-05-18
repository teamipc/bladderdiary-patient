// Font families for the clinical PDF:
//   helvetica → en, fr, es, pt (Latin script, built-in to jsPDF)
//   NotoSansSC → zh (Simplified Chinese, lazy-loaded via fonts/zh.ts)
//   NotoSansArabic → ar (Arabic script, RTL, lazy-loaded via fonts/ar.ts)
// Use currentFontFamily(locale) from ./fonts to resolve the right family at runtime.
// machineData.ts intentionally keeps `font: 'courier'` for its schema tables
// (English-only by design, monospace machine-parseable look).
import { IPC_LOGO_ASPECT } from '../ipcLogoBase64';

export const C = {
  // IPC brand
  gold:       [196, 152, 74]  as [number, number, number],
  goldLight:  [253, 248, 239] as [number, number, number],
  dark:       [60,  33,  15]  as [number, number, number],
  muted:      [140, 120, 100] as [number, number, number],
  mutedLight: [200, 185, 170] as [number, number, number],

  // Functional
  inputHdr:   [0,   150, 199] as [number, number, number],  // teal
  inputCell:  [224, 242, 254] as [number, number, number],  // light blue
  outputHdr:  [196, 152, 74]  as [number, number, number],  // gold
  outputCell: [254, 243, 199] as [number, number, number],  // light amber
  wakeRow:    [237, 233, 254] as [number, number, number],  // light indigo
  bedRow:     [237, 233, 254] as [number, number, number],
  leakNote:   [180, 130, 90]  as [number, number, number],  // soft warm brown (not alarming)
  leakTerracotta: [184, 92, 74] as [number, number, number], // standalone leak events
  white:      [255, 255, 255] as [number, number, number],

  // Chart palette
  chartBlue:  [59,  130, 246] as [number, number, number],
  chartAmber: [245, 158, 11]  as [number, number, number],
  chartTeal:  [20,  184, 166] as [number, number, number],
  chartRose:  [244, 63,  94]  as [number, number, number],
  chartPurple:[139, 92,  246] as [number, number, number],
  chartGray:  [156, 163, 175] as [number, number, number],
};

export const MARGIN = 14;
export const PAGE_W = 210; // A4 portrait
export const PAGE_H = 297;
export const CONTENT_W = PAGE_W - 2 * MARGIN;
export const FOOTER_Y = PAGE_H - 18;

export const LOGO_H = 14; // mm
export const LOGO_W = LOGO_H * IPC_LOGO_ASPECT;
