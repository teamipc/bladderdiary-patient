/**
 * Clinical PDF export — generates a multi-page bladder diary report.
 *
 * Pages:
 *   1       Results overview with clinical metrics
 *   2-4     Daily bladder diary (24-hour hourly grid per day)
 *   5       Combined 3-day diary (landscape, side-by-side)
 *   6       Clinical analysis graphs
 *   7       Machine-readable structured data page
 *
 * Branding: IPC gold logo top-right, footer with tagline + disclaimer.
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO } from 'date-fns';
import { enUS, fr, es } from 'date-fns/locale';
import type { Locale as DateFnsLocale } from 'date-fns';
import { getDayNumber, getDayDate, formatTime, mlToDisplayVolume, getHoursInTz } from './utils';
import { getDrinkLabel, SENSATION_LABELS, PREMIUM_FEATURES_ENABLED, getLeakTriggerLabel } from './constants';
import { computeMetrics, type DiaryMetrics, type DayMetrics } from './calculations';
import { IPC_LOGO_BASE64, IPC_LOGO_ASPECT } from './ipcLogoBase64';
import type { DiaryState, DrinkType, LeakTrigger } from './types';

/* ================================================================== */
/*  PDF translation strings                                            */
/* ================================================================== */

const DATE_LOCALES: Record<string, DateFnsLocale> = { en: enUS, fr, es };
function getDateLocale(locale: string): DateFnsLocale {
  return DATE_LOCALES[locale] || enUS;
}

interface PdfStrings {
  appName: string;
  reportSubtitle: string;
  startDate: string;
  age: string;
  clinicCode: string;
  generated: string;
  clinicalMetrics: string;
  metric: string;
  night1Day2: string;
  night2Day3: string;
  overall: string;
  nocturnalVol: string;
  totalIntake: string;
  totalOutput: string;
  voidCount: string;
  voidLeakCount: string;
  standaloneLeaks: string;
  continence: string;
  continent: string;
  incontinent: string;
  dailySummary: string;
  fluidIntake: string;
  voidVolume: string;
  drinkCount: string;
  voidLeaks: string;
  wakeTime: string;
  bedtime: string;
  day: (n: number) => string;
  wake: string;
  bed: string;
  fluidIn: string;
  voided: string;
  sens: string;
  leak: string;
  intake: string;
  output: string;
  voids: string;
  leaks: string;
  voidWord: string;
  standaloneWord: string;
  threeDayTitle: string;
  started: string;
  name: string;
  time: string;
  drinks: string;
  urine: string;
  sensationLegend: string;
  clinicalAnalysis: string;
  dailyFluidBalance: string;
  fluidIntakeLabel: string;
  voidedOutput: string;
  freqVolChart: string;
  freqVolDesc: string;
  voidLeakLegend: string;
  standaloneLeakLegend: string;
  urgencyDistribution: string;
  notRecorded: string;
  footerTagline: string;
  footerDisclaimer: string;
  page: (n: number, total: number) => string;
  yes: string;
  morningPee: string;
  doubleVoid: string;
  sensLabels: Record<number, string>;
  drinkLabels: Record<string, string>;
  leakTriggerLabels: Record<string, string>;
}

const PDF_STRINGS: Record<string, PdfStrings> = {
  en: {
    appName: 'My Flow Check',
    reportSubtitle: '3-Day Bladder Diary Report',
    startDate: 'Start date',
    age: 'Age',
    clinicCode: 'Clinic code',
    generated: 'Generated',
    clinicalMetrics: 'Clinical Metrics',
    metric: 'Metric',
    night1Day2: 'Night 1 / Day 2',
    night2Day3: 'Night 2 / Day 3',
    overall: 'Overall',
    nocturnalVol: 'Nocturnal Vol',
    totalIntake: 'Total Intake',
    totalOutput: 'Total Output',
    voidCount: 'Void Count',
    voidLeakCount: 'Void Leak Count',
    standaloneLeaks: 'Standalone Leaks',
    continence: 'Continence',
    continent: 'Continent',
    incontinent: 'Incontinent',
    dailySummary: 'Daily Summary',
    fluidIntake: 'Fluid Intake',
    voidVolume: 'Void Volume',
    drinkCount: 'Drink Count',
    voidLeaks: 'Void Leaks',
    wakeTime: 'Wake Time',
    bedtime: 'Bedtime',
    day: (n) => `Day ${n}`,
    wake: 'Wake',
    bed: 'Bed',
    fluidIn: 'Fluid In',
    voided: 'Voided',
    sens: 'Sens',
    leak: 'Leak',
    intake: 'Intake',
    output: 'Output',
    voids: 'voids',
    leaks: 'Leaks',
    voidWord: 'void',
    standaloneWord: 'standalone',
    threeDayTitle: '3-Day Bladder Diary',
    started: 'Started',
    name: 'Name',
    time: 'TIME',
    drinks: 'Drinks',
    urine: 'Urine',
    sensationLegend: 'Bladder sensation codes:  0 = No urge (went just in case)  |  1 = Mild (normal desire)  |  2 = Moderate (urgency, but passed)  |  3 = Strong (barely made it)  |  4 = Leaked (couldn\'t make it)',
    clinicalAnalysis: 'Clinical Analysis',
    dailyFluidBalance: 'Daily Fluid Balance',
    fluidIntakeLabel: 'Fluid Intake',
    voidedOutput: 'Voided Output',
    freqVolChart: 'Frequency-Volume Chart',
    freqVolDesc: 'Each dot = one void, positioned by time of day. Red circle = leak. Dashed line = MVV.',
    voidLeakLegend: '= Void leak',
    standaloneLeakLegend: '= Standalone leak',
    urgencyDistribution: 'Urgency Distribution',
    notRecorded: 'Not recorded',
    footerTagline: 'IPC \u2014 Integrated Pelvic Care believes that better data leads to better care.',
    footerDisclaimer: 'This report is for informational purposes only and does not replace medical advice. Always consult your health professional.',
    page: (n, total) => `Page ${n} / ${total}`,
    yes: 'Yes',
    morningPee: 'FMV',
    doubleVoid: 'DV',
    sensLabels: { 0: 'No urge', 1: 'Mild', 2: 'Moderate', 3: 'Strong', 4: 'Leaked' },
    drinkLabels: { water: 'Water', coffee: 'Coffee', tea: 'Tea', juice: 'Juice', carbonated: 'Soda', alcohol: 'Alcohol', milk: 'Milk', other: 'Other' },
    leakTriggerLabels: { cough: 'Coughing', sneeze: 'Sneezing', laugh: 'Laughing', lifting: 'Lifting', exercise: 'Exercise', toilet_way: 'On the way', other: 'Other', not_sure: 'Not sure' },
  },
  fr: {
    appName: 'My Flow Check',
    reportSubtitle: 'Journal urinaire de 3 jours',
    startDate: 'Date de début',
    age: 'Âge',
    clinicCode: 'Code clinique',
    generated: 'Généré le',
    clinicalMetrics: 'Mesures cliniques',
    metric: 'Mesure',
    night1Day2: 'Nuit 1 / Jour 2',
    night2Day3: 'Nuit 2 / Jour 3',
    overall: 'Total',
    nocturnalVol: 'Vol. nocturne',
    totalIntake: 'Apport total',
    totalOutput: 'Volume total',
    voidCount: 'Nb de mictions',
    voidLeakCount: 'Escapes lors de miction',
    standaloneLeaks: 'Escapes isolés',
    continence: 'Continence',
    continent: 'Continent',
    incontinent: 'Incontinent',
    dailySummary: 'Résumé quotidien',
    fluidIntake: 'Apport liquidien',
    voidVolume: 'Volume uriné',
    drinkCount: 'Nb de boissons',
    voidLeaks: 'Escapes lors de miction',
    wakeTime: 'Réveil',
    bedtime: 'Coucher',
    day: (n) => `Jour ${n}`,
    wake: 'Réveil',
    bed: 'Coucher',
    fluidIn: 'Boissons',
    voided: 'Uriné',
    sens: 'Envie',
    leak: 'Escape',
    intake: 'Apport',
    output: 'Uriné',
    voids: 'mictions',
    leaks: 'Escapes',
    voidWord: 'miction',
    standaloneWord: 'isolé',
    threeDayTitle: 'Journal urinaire de 3 jours',
    started: 'Début',
    name: 'Nom',
    time: 'HEURE',
    drinks: 'Boissons',
    urine: 'Urine',
    sensationLegend: 'Codes d\'envie :  0 = Aucune envie (précaution)  |  1 = Légère (normale)  |  2 = Modérée (envie passée)  |  3 = Forte (de justesse)  |  4 = Escape (pas eu le temps)',
    clinicalAnalysis: 'Analyse clinique',
    dailyFluidBalance: 'Bilan liquidien quotidien',
    fluidIntakeLabel: 'Apport liquidien',
    voidedOutput: 'Volume uriné',
    freqVolChart: 'Graphique fréquence-volume',
    freqVolDesc: 'Chaque point = une miction, positionnée par heure. Cercle rouge = escape. Ligne pointillée = VMM.',
    voidLeakLegend: '= Escape lors de miction',
    standaloneLeakLegend: '= Escape isolé',
    urgencyDistribution: 'Distribution de l\'envie',
    notRecorded: 'Non enregistré',
    footerTagline: 'IPC \u2014 Integrated Pelvic Care croit que de meilleures données mènent à de meilleurs soins.',
    footerDisclaimer: 'Ce rapport est fourni à titre informatif et ne remplace pas un avis médical. Consultez toujours votre professionnel de santé.',
    page: (n, total) => `Page ${n} / ${total}`,
    yes: 'Oui',
    morningPee: 'PMU',
    doubleVoid: 'DV',
    sensLabels: { 0: 'Aucune envie', 1: 'Légère', 2: 'Modérée', 3: 'Forte', 4: 'Escape' },
    drinkLabels: { water: 'Eau', coffee: 'Café', tea: 'Thé', juice: 'Jus', carbonated: 'Boisson gazeuse', alcohol: 'Alcool', milk: 'Lait', other: 'Autre' },
    leakTriggerLabels: { cough: 'Toux', sneeze: 'Éternuement', laugh: 'Rire', lifting: 'Port de charge', exercise: 'Exercice', toilet_way: 'En chemin', other: 'Autre', not_sure: 'Pas sûr' },
  },
  es: {
    appName: 'My Flow Check',
    reportSubtitle: 'Diario urinario de 3 días',
    startDate: 'Fecha de inicio',
    age: 'Edad',
    clinicCode: 'Código de clínica',
    generated: 'Generado el',
    clinicalMetrics: 'Medidas clínicas',
    metric: 'Medida',
    night1Day2: 'Noche 1 / Día 2',
    night2Day3: 'Noche 2 / Día 3',
    overall: 'Total',
    nocturnalVol: 'Vol. nocturno',
    totalIntake: 'Ingesta total',
    totalOutput: 'Volumen total',
    voidCount: 'N.º de micciones',
    voidLeakCount: 'Escapes al orinar',
    standaloneLeaks: 'Escapes aislados',
    continence: 'Continencia',
    continent: 'Continente',
    incontinent: 'Incontinente',
    dailySummary: 'Resumen diario',
    fluidIntake: 'Ingesta de líquidos',
    voidVolume: 'Volumen orinado',
    drinkCount: 'N.º de bebidas',
    voidLeaks: 'Escapes al orinar',
    wakeTime: 'Despertar',
    bedtime: 'Acostarse',
    day: (n) => `Día ${n}`,
    wake: 'Despertar',
    bed: 'Acostarse',
    fluidIn: 'Bebidas',
    voided: 'Orinado',
    sens: 'Ganas',
    leak: 'Escape',
    intake: 'Ingesta',
    output: 'Orinado',
    voids: 'micciones',
    leaks: 'Escapes',
    voidWord: 'micción',
    standaloneWord: 'aislado',
    threeDayTitle: 'Diario urinario de 3 días',
    started: 'Inicio',
    name: 'Nombre',
    time: 'HORA',
    drinks: 'Bebidas',
    urine: 'Orina',
    sensationLegend: 'Códigos de ganas:  0 = Sin ganas (por precaución)  |  1 = Leve (normal)  |  2 = Moderada (ganas pasaron)  |  3 = Fuerte (por poco)  |  4 = Escape (no llegó a tiempo)',
    clinicalAnalysis: 'Análisis clínico',
    dailyFluidBalance: 'Balance de líquidos diario',
    fluidIntakeLabel: 'Ingesta de líquidos',
    voidedOutput: 'Volumen orinado',
    freqVolChart: 'Gráfico frecuencia-volumen',
    freqVolDesc: 'Cada punto = una micción, posicionada por hora. Círculo rojo = escape. Línea punteada = VMM.',
    voidLeakLegend: '= Escape al orinar',
    standaloneLeakLegend: '= Escape aislado',
    urgencyDistribution: 'Distribución de ganas',
    notRecorded: 'No registrado',
    footerTagline: 'IPC \u2014 Integrated Pelvic Care cree que mejores datos llevan a mejor atención.',
    footerDisclaimer: 'Este informe es solo informativo y no reemplaza el consejo médico. Consulte siempre a su profesional de salud.',
    page: (n, total) => `Página ${n} / ${total}`,
    yes: 'Sí',
    morningPee: 'PMO',
    doubleVoid: 'DV',
    sensLabels: { 0: 'Sin ganas', 1: 'Leve', 2: 'Moderada', 3: 'Fuerte', 4: 'Escape' },
    drinkLabels: { water: 'Agua', coffee: 'Café', tea: 'Té', juice: 'Jugo', carbonated: 'Refresco', alcohol: 'Alcohol', milk: 'Leche', other: 'Otro' },
    leakTriggerLabels: { cough: 'Tos', sneeze: 'Estornudo', laugh: 'Risa', lifting: 'Levantar peso', exercise: 'Ejercicio', toilet_way: 'De camino', other: 'Otro', not_sure: 'No sé' },
  },
};

function getPdfStrings(locale: string): PdfStrings {
  return PDF_STRINGS[locale] || PDF_STRINGS.en;
}

/** Get translated drink label for PDF. */
function pdfDrinkLabel(type: DrinkType, locale: string): string {
  const s = getPdfStrings(locale);
  return s.drinkLabels[type] ?? getPdfStrings('en').drinkLabels[type] ?? 'Other';
}

/** Get translated leak trigger label for PDF. */
function pdfLeakTriggerLabel(trigger: LeakTrigger, locale: string): string {
  const s = getPdfStrings(locale);
  return s.leakTriggerLabels[trigger] ?? getPdfStrings('en').leakTriggerLabels[trigger] ?? 'Other';
}

/** Format a date string for human-readable PDF pages using the correct locale. */
function pdfFormatDate(isoString: string, pattern: string, locale: string): string {
  return format(parseISO(isoString), pattern, { locale: getDateLocale(locale) });
}

/* ================================================================== */
/*  Colour palette                                                     */
/* ================================================================== */

const C = {
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

/* ================================================================== */
/*  Layout constants                                                   */
/* ================================================================== */

const MARGIN = 14;
const PAGE_W = 210; // A4 portrait
const PAGE_H = 297;
const CONTENT_W = PAGE_W - 2 * MARGIN;
const FOOTER_Y = PAGE_H - 18;

const LOGO_H = 14; // mm
const LOGO_W = LOGO_H * IPC_LOGO_ASPECT;

/* ================================================================== */
/*  Shared helpers                                                     */
/* ================================================================== */

function addLogo(doc: jsPDF) {
  doc.addImage(
    IPC_LOGO_BASE64,
    'PNG',
    PAGE_W - MARGIN - LOGO_W,
    8,
    LOGO_W,
    LOGO_H,
  );
}

function addFooter(doc: jsPDF, pageNum: number, totalPages: number, locale: string) {
  const s = getPdfStrings(locale);
  // Detect page dimensions (handles both portrait and landscape pages)
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const y = pageH - 18;
  doc.setDrawColor(...C.mutedLight);
  doc.line(MARGIN, y, pageW - MARGIN, y);

  doc.setFontSize(6.5);
  doc.setTextColor(...C.muted);
  doc.text(s.footerTagline, MARGIN, y + 4);
  doc.text(s.footerDisclaimer, MARGIN, y + 7.5);
  doc.text('myflowcheck.com', MARGIN, y + 11);
  doc.text(s.page(pageNum, totalPages), pageW - MARGIN, y + 11, { align: 'right' });
}

function sectionTitle(doc: jsPDF, text: string, y: number): number {
  doc.setFontSize(13);
  doc.setTextColor(...C.dark);
  doc.setFont('helvetica', 'bold');
  doc.text(text, MARGIN, y);
  doc.setFont('helvetica', 'normal');
  return y + 6;
}

/* ================================================================== */
/*  Page 1: Results Overview                                           */
/* ================================================================== */

function dv(ml: number, state: DiaryState): number {
  return mlToDisplayVolume(ml, state.volumeUnit);
}

function pageResultsOverview(doc: jsPDF, state: DiaryState, metrics: DiaryMetrics, locale: string) {
  const s = getPdfStrings(locale);
  doc.addPage('a4', 'portrait');
  addLogo(doc);

  // Title block
  doc.setFontSize(22);
  doc.setTextColor(...C.dark);
  doc.setFont('helvetica', 'bold');
  doc.text(s.appName, MARGIN, 22);
  doc.setFont('helvetica', 'normal');

  doc.setFontSize(11);
  doc.setTextColor(...C.muted);
  doc.text(s.reportSubtitle, MARGIN, 28);

  // Patient info
  let y = 36;
  doc.setFontSize(9);
  doc.setTextColor(...C.dark);
  const startLabel = pdfFormatDate(state.startDate + 'T12:00:00', 'PPPP', locale);
  const infoLines = [
    `${s.startDate}: ${startLabel}`,
    state.age ? `${s.age}: ${state.age}` : '',
    state.clinicCode ? `${s.clinicCode}: ${state.clinicCode}` : '',
    `${s.generated}: ${format(new Date(), 'PPp', { locale: getDateLocale(locale) })}`,
  ].filter(Boolean);

  for (const line of infoLines) {
    doc.text(line, MARGIN, y);
    y += 4.5;
  }
  y += 4;

  const u = state.volumeUnit;
  const fmtV = (v: number | null) => (v !== null && v !== undefined ? `${v.toLocaleString()}` : '\u2014');
  const fmtVol = (ml: number | null) => (ml !== null && ml !== undefined ? `${dv(ml, state).toLocaleString()}` : '\u2014');

  // ── Clinical Metrics table (premium only) ──
  if (PREMIUM_FEATURES_ENABLED) {
    y = sectionTitle(doc, s.clinicalMetrics, y);

    const p1 = metrics.periods[0];
    const p2 = metrics.periods[1];
    const fmtPct = (v: number | null) => (v !== null && v !== undefined ? `${v.toFixed(1)}%` : '\u2014');

    autoTable(doc, {
      startY: y,
      head: [[s.metric, s.night1Day2, s.night2Day3, s.overall]],
      body: [
        [`24HV (${u})`, fmtVol(p1?.twentyFourHV), fmtVol(p2?.twentyFourHV), '\u2014'],
        ['NPi (%)', fmtPct(p1?.nPi), fmtPct(p2?.nPi), '\u2014'],
        [`AVV (${u})`, fmtVol(p1?.avv), fmtVol(p2?.avv), '\u2014'],
        [`${s.nocturnalVol} (${u})`, fmtVol(metrics.nights[0]?.nocturnalVolumeMl), fmtVol(metrics.nights[1]?.nocturnalVolumeMl), '\u2014'],
        [`MVV (${u})`, '\u2014', '\u2014', fmtVol(metrics.mvv)],
        [`${s.totalIntake} (${u})`, '\u2014', '\u2014', fmtVol(metrics.totalFluidIntakeMl)],
        [`${s.totalOutput} (${u})`, '\u2014', '\u2014', fmtVol(metrics.totalVoidVolumeMl)],
        [s.voidCount, '\u2014', '\u2014', fmtV(metrics.totalVoidCount)],
        [s.voidLeakCount, '\u2014', '\u2014', fmtV(metrics.totalLeaks)],
        [s.standaloneLeaks, '\u2014', '\u2014', fmtV(metrics.totalStandaloneLeaks)],
        [s.continence, '\u2014', '\u2014', metrics.isContinent ? s.continent : s.incontinent],
      ],
      margin: { left: MARGIN, right: MARGIN },
      styles: { fontSize: 8, cellPadding: 2.5, textColor: C.dark },
      headStyles: { fillColor: C.gold, textColor: C.white, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: C.goldLight },
    });

    // @ts-expect-error jspdf-autotable adds lastAutoTable
    y = doc.lastAutoTable.finalY + 6;
  }

  // ── Per-Day Summary ──
  y = sectionTitle(doc, s.dailySummary, y);

  autoTable(doc, {
    startY: y,
    head: [['', s.day(1), s.day(2), s.day(3)]],
    body: [
      [`${s.fluidIntake} (${u})`, ...metrics.dayMetrics.map((d) => fmtVol(d.totalFluidIntakeMl))],
      [`${s.voidVolume} (${u})`,  ...metrics.dayMetrics.map((d) => fmtVol(d.totalVoidVolumeMl))],
      [s.voidCount,        ...metrics.dayMetrics.map((d) => fmtV(d.voidCount))],
      [s.drinkCount,       ...metrics.dayMetrics.map((d) => fmtV(d.drinkCount))],
      [s.voidLeaks,        ...metrics.dayMetrics.map((d) => fmtV(d.leakCount))],
      [s.standaloneLeaks,  ...metrics.dayMetrics.map((d) => fmtV(d.standaloneLeakCount))],
      [s.wakeTime,         ...metrics.dayMetrics.map((d) => d.wakeTimeIso ? formatTime(d.wakeTimeIso, locale, state.timeZone) : '\u2014')],
      [s.bedtime,          ...metrics.dayMetrics.map((d) => d.bedtimeIso ? formatTime(d.bedtimeIso, locale, state.timeZone) : '\u2014')],
    ],
    margin: { left: MARGIN, right: MARGIN },
    styles: { fontSize: 8, cellPadding: 2.5, textColor: C.dark },
    headStyles: { fillColor: C.gold, textColor: C.white, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: C.goldLight },
  });
}

/* ================================================================== */
/*  Pages 2-4: Daily Bladder Diary (hourly grid)                       */
/* ================================================================== */

interface HourSlot {
  label: string;
  drinks: string;
  voids: string;
  urgency: string;
  leak: string;
  hasDrink: boolean;
  hasVoid: boolean;
  isWake: boolean;
  isBed: boolean;
}

function buildHourSlots(state: DiaryState, dayNum: 1 | 2 | 3, locale: string = 'en'): { slots: HourSlot[]; startHour: number } {
  const dayVoids = state.voids
    .filter((v) => getDayNumber(v.timestampIso, state.startDate, state.bedtimes, state.timeZone) === dayNum)
    .sort((a, b) => a.timestampIso.localeCompare(b.timestampIso));

  const dayDrinks = state.drinks
    .filter((d) => getDayNumber(d.timestampIso, state.startDate, state.bedtimes, state.timeZone) === dayNum)
    .sort((a, b) => a.timestampIso.localeCompare(b.timestampIso));

  const dayLeaks = (state.leaks ?? [])
    .filter((l) => getDayNumber(l.timestampIso, state.startDate, state.bedtimes, state.timeZone) === dayNum)
    .sort((a, b) => a.timestampIso.localeCompare(b.timestampIso));

  const bedtime = state.bedtimes.find((b) => b.dayNumber === dayNum);
  const wakeTime = (state.wakeTimes ?? []).find((w) => w.dayNumber === dayNum);

  const bedHour = bedtime ? getHoursInTz(bedtime.timestampIso, state.timeZone) : -1;
  const wakeHour = wakeTime ? getHoursInTz(wakeTime.timestampIso, state.timeZone) : -1;

  // Start the 24-hour grid from the actual wake hour (default 6 AM)
  const startHour = wakeHour >= 0 ? wakeHour : 6;

  const slots: HourSlot[] = [];
  for (let i = 0; i < 24; i++) {
    const hour = (startHour + i) % 24;
    const hourStr = hour.toString().padStart(2, '0') + ':00';
    const ampm = hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`;

    // Drinks in this hour
    const hourDrinks = dayDrinks.filter((d) => getHoursInTz(d.timestampIso, state.timeZone) === hour);
    const u = state.volumeUnit;
    const ps = getPdfStrings(locale);
    const multiDrink = hourDrinks.length > 1;
    const drinksText = hourDrinks.map((d) => {
      const prefix = multiDrink ? `${formatTime(d.timestampIso, locale, state.timeZone)} ` : '';
      return `${prefix}${dv(d.volumeMl, state)} ${u} ${pdfDrinkLabel(d.drinkType, locale)}`;
    }).join('\n');

    // Voids in this hour
    const hourVoids = dayVoids.filter((v) => getHoursInTz(v.timestampIso, state.timeZone) === hour);
    const multiVoid = hourVoids.length > 1;
    const voidsText = hourVoids
      .map((v) => {
        const prefix = multiVoid ? `${formatTime(v.timestampIso, locale, state.timeZone)} ` : '';
        let txt = `${prefix}${dv(v.volumeMl, state)} ${u}`;
        if (v.doubleVoidMl) txt += `\n  ${ps.doubleVoid}: +${dv(v.doubleVoidMl, state)} ${u}`;
        if (v.isFirstMorningVoid) txt += ` *${ps.morningPee}`;
        return txt;
      })
      .join('\n');

    const urgText = hourVoids.map((v) => v.sensation !== null ? `${v.sensation}` : '-').join('\n');

    // Standalone leaks in this hour
    const hourLeaks = dayLeaks.filter((l) => getHoursInTz(l.timestampIso, state.timeZone) === hour);
    const leakParts: string[] = [];
    if (hourVoids.some((v) => v.leak)) leakParts.push(ps.yes);
    for (const l of hourLeaks) {
      leakParts.push(pdfLeakTriggerLabel(l.trigger, locale));
    }
    const leakText = leakParts.join('\n');

    slots.push({
      label: `${hourStr}\n${ampm}`,
      drinks: drinksText,
      voids: voidsText,
      urgency: urgText,
      leak: leakText,
      hasDrink: hourDrinks.length > 0,
      hasVoid: hourVoids.length > 0,
      isWake: hour === wakeHour,
      isBed: hour === bedHour,
    });
  }

  return { slots, startHour };
}

interface HalfHourSlot {
  label: string;
  drinks: string;
  voids: string;
  urgency: string;
  leak: string;
  hasDrink: boolean;
  hasVoid: boolean;
  hasLeak: boolean;
  isWake: boolean;
  isBed: boolean;
}

function buildHalfHourSlots(state: DiaryState, dayNum: 1 | 2 | 3, locale: string = 'en'): { slots: HalfHourSlot[]; startHour: number } {
  const dayVoids = state.voids
    .filter((v) => getDayNumber(v.timestampIso, state.startDate, state.bedtimes, state.timeZone) === dayNum)
    .sort((a, b) => a.timestampIso.localeCompare(b.timestampIso));

  const dayDrinks = state.drinks
    .filter((d) => getDayNumber(d.timestampIso, state.startDate, state.bedtimes, state.timeZone) === dayNum)
    .sort((a, b) => a.timestampIso.localeCompare(b.timestampIso));

  const dayLeaks = (state.leaks ?? [])
    .filter((l) => getDayNumber(l.timestampIso, state.startDate, state.bedtimes, state.timeZone) === dayNum)
    .sort((a, b) => a.timestampIso.localeCompare(b.timestampIso));

  const bedtime = state.bedtimes.find((b) => b.dayNumber === dayNum);
  const wakeTime = (state.wakeTimes ?? []).find((w) => w.dayNumber === dayNum);

  const bedHour = bedtime ? getHoursInTz(bedtime.timestampIso, state.timeZone) : -1;
  const wakeHour = wakeTime ? getHoursInTz(wakeTime.timestampIso, state.timeZone) : -1;

  const startHour = wakeHour >= 0 ? wakeHour : 6;
  const u = state.volumeUnit;

  const slots: HalfHourSlot[] = [];
  for (let i = 0; i < 48; i++) {
    const hour = (startHour + Math.floor(i / 2)) % 24;
    const isSecondHalf = i % 2 === 1;
    const minStart = isSecondHalf ? 30 : 0;
    const minEnd = isSecondHalf ? 59 : 29;

    // Label: AM/PM only on :00 rows
    const hourStr = `${hour.toString().padStart(2, '0')}:${isSecondHalf ? '30' : '00'}`;
    let label: string;
    if (!isSecondHalf) {
      const ampm = hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`;
      label = `${hourStr}\n${ampm}`;
    } else {
      label = hourStr;
    }

    // Filter events in this 30-min window
    const inSlot = (iso: string) => {
      const d = parseISO(iso);
      return getHoursInTz(iso, state.timeZone) === hour && d.getMinutes() >= minStart && d.getMinutes() <= minEnd;
    };

    const ps = getPdfStrings(locale);
    const slotDrinks = dayDrinks.filter((d) => inSlot(d.timestampIso));
    const multiDrink = slotDrinks.length > 1;
    const drinksText = slotDrinks.map((d) => {
      const prefix = multiDrink ? `${formatTime(d.timestampIso, locale, state.timeZone)} ` : '';
      return `${prefix}${dv(d.volumeMl, state)} ${u} ${pdfDrinkLabel(d.drinkType, locale)}`;
    }).join('\n');

    const slotVoids = dayVoids.filter((v) => inSlot(v.timestampIso));
    const multiVoid = slotVoids.length > 1;
    const voidsText = slotVoids
      .map((v) => {
        const prefix = multiVoid ? `${formatTime(v.timestampIso, locale, state.timeZone)} ` : '';
        let txt = `${prefix}${dv(v.volumeMl, state)} ${u}`;
        if (v.doubleVoidMl) txt += `\n  ${ps.doubleVoid}: +${dv(v.doubleVoidMl, state)} ${u}`;
        if (v.isFirstMorningVoid) txt += ` *${ps.morningPee}`;
        return txt;
      })
      .join('\n');

    const urgText = slotVoids.map((v) => v.sensation !== null ? `${v.sensation}` : '-').join('\n');

    const slotLeaks = dayLeaks.filter((l) => inSlot(l.timestampIso));
    const leakParts: string[] = [];
    if (slotVoids.some((v) => v.leak)) leakParts.push(ps.yes);
    for (const l of slotLeaks) {
      leakParts.push(pdfLeakTriggerLabel(l.trigger, locale));
    }
    const leakText = leakParts.join('\n');

    slots.push({
      label,
      drinks: drinksText,
      voids: voidsText,
      urgency: urgText,
      leak: leakText,
      hasDrink: slotDrinks.length > 0,
      hasVoid: slotVoids.length > 0,
      hasLeak: leakText !== '',
      isWake: hour === wakeHour && !isSecondHalf,
      isBed: hour === bedHour && !isSecondHalf,
    });
  }

  return { slots, startHour };
}

function pageDailyDiary(doc: jsPDF, state: DiaryState, dayNum: 1 | 2 | 3, dm: DayMetrics, locale: string) {
  const s = getPdfStrings(locale);
  doc.addPage('a4', 'portrait');
  addLogo(doc);

  const dayDateStr = getDayDate(state.startDate, dayNum);
  const dayLabel = pdfFormatDate(dayDateStr + 'T12:00:00', 'PPPP', locale);

  // Title
  doc.setFontSize(16);
  doc.setTextColor(...C.dark);
  doc.setFont('helvetica', 'bold');
  doc.text(s.day(dayNum), MARGIN, 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...C.muted);
  doc.text(dayLabel, MARGIN, 26);

  // Wake / Bed summary
  let subY = 32;
  doc.setFontSize(8);
  doc.setTextColor(100, 80, 200);
  const wakeBedParts: string[] = [];
  if (dm.wakeTimeIso) wakeBedParts.push(`${s.wake}: ${formatTime(dm.wakeTimeIso, locale, state.timeZone)}`);
  if (dm.bedtimeIso) wakeBedParts.push(`${s.bed}: ${formatTime(dm.bedtimeIso, locale, state.timeZone)}`);
  if (wakeBedParts.length > 0) {
    doc.text(wakeBedParts.join('    |    '), MARGIN, subY);
    subY += 4;
  }
  subY += 1;

  // Build 30-min grid — 48 rows starting from the actual wake hour
  const { slots, startHour } = buildHalfHourSlots(state, dayNum, locale);

  // Determine sleep hours for shading
  const bedtime = state.bedtimes.find((b) => b.dayNumber === dayNum);
  const wakeTime = (state.wakeTimes ?? []).find((w) => w.dayNumber === dayNum);
  const bedHour = bedtime ? getHoursInTz(bedtime.timestampIso, state.timeZone) : -1;
  const wakeHour = wakeTime ? getHoursInTz(wakeTime.timestampIso, state.timeZone) : -1;

  const body = slots.map((s) => [s.label, s.drinks || '\u2014', s.voids || '\u2014', s.urgency || '\u2014', s.leak || '']);

  autoTable(doc, {
    startY: subY,
    head: [['Time', `${s.fluidIn} (${state.volumeUnit})`, `${s.voided} (${state.volumeUnit})`, s.sens, s.leak]],
    body,
    margin: { left: MARGIN, right: MARGIN },
    styles: {
      fontSize: 5.5,
      cellPadding: 0.8,
      textColor: C.dark,
      minCellHeight: 4.2,
      valign: 'middle',
      lineWidth: 0.1,
      lineColor: [220, 220, 220],
      overflow: 'ellipsize',
    },
    headStyles: { fillColor: C.gold, textColor: C.white, fontStyle: 'bold', fontSize: 6 },
    columnStyles: {
      0: { cellWidth: 18, fontStyle: 'bold', halign: 'center', fontSize: 5 },
      1: { cellWidth: 68 },
      2: { cellWidth: 46 },
      3: { cellWidth: 22, halign: 'center' },
      4: { cellWidth: 28, halign: 'center' },
    },
    didParseCell: (data) => {
      if (data.section !== 'body') return;
      const slot = slots[data.row.index];
      if (!slot) return;
      const hour = (startHour + Math.floor(data.row.index / 2)) % 24;

      // Sleep hours: shade with light indigo
      const isSleepHour = (() => {
        if (bedHour < 0) return false;
        const wk = wakeHour >= 0 ? wakeHour : startHour;
        if (bedHour > wk) {
          return hour >= bedHour || hour < wk;
        }
        return hour >= bedHour && hour < wk;
      })();

      if (isSleepHour && !slot.hasDrink && !slot.hasVoid) {
        data.cell.styles.fillColor = [245, 243, 255];
        if (data.column.index === 0) {
          data.cell.styles.textColor = [130, 120, 190];
        }
      }

      // Color-code cells with actual data
      if (data.column.index === 1 && slot.hasDrink) {
        data.cell.styles.fillColor = C.inputCell;
        data.cell.styles.textColor = [0, 100, 160];
      }
      if (data.column.index === 2 && slot.hasVoid) {
        data.cell.styles.fillColor = C.outputCell;
        data.cell.styles.textColor = [140, 100, 20];
      }
      if (data.column.index === 4 && slot.hasLeak) {
        data.cell.styles.fillColor = [255, 240, 235];
        data.cell.styles.textColor = C.leakTerracotta;
      }

      // Empty cells: lighter text color for the dash
      if (!slot.hasDrink && data.column.index === 1) {
        data.cell.styles.textColor = [210, 210, 210];
      }
      if (!slot.hasVoid && data.column.index === 2) {
        data.cell.styles.textColor = [210, 210, 210];
      }
      if (!slot.hasVoid && data.column.index === 3) {
        data.cell.styles.textColor = [210, 210, 210];
      }

      // Wake / Bed hour highlight — full row
      if (slot.isWake || slot.isBed) {
        data.cell.styles.fillColor = C.wakeRow;
        if (data.column.index === 0) {
          data.cell.styles.textColor = [80, 60, 180];
        }
      }
    },
  });

  // @ts-expect-error jspdf-autotable adds lastAutoTable
  const tableEndY: number = doc.lastAutoTable.finalY;

  // Day totals summary box
  const totY = Math.min(tableEndY + 3, FOOTER_Y - 12);
  doc.setFillColor(250, 248, 245);
  doc.roundedRect(MARGIN, totY, CONTENT_W, 8, 1.5, 1.5, 'F');

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.dark);
  const leakSummary = dm.standaloneLeakCount > 0
    ? `${s.leaks}: ${dm.leakCount} ${s.voidWord} + ${dm.standaloneLeakCount} ${s.standaloneWord}`
    : `${s.leaks}: ${dm.leakCount}`;
  const totText = `${s.intake}: ${dv(dm.totalFluidIntakeMl, state).toLocaleString()} ${state.volumeUnit}    ${s.output}: ${dv(dm.totalVoidVolumeMl, state).toLocaleString()} ${state.volumeUnit} (${dm.voidCount} ${s.voids})    ${leakSummary}`;
  doc.text(totText, PAGE_W / 2, totY + 5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
}

/* ================================================================== */
/*  Combined 3-Day Bladder Diary (landscape, side-by-side)             */
/* ================================================================== */

function pageCombinedDiary(doc: jsPDF, state: DiaryState, locale: string, useCurrentPage = false) {
  const s = getPdfStrings(locale);
  // Add landscape page (unless we're using the initial page)
  if (!useCurrentPage) doc.addPage('a4', 'landscape');

  const LW = 297; // A4 landscape width
  const LH = 210; // A4 landscape height
  const M = 10;   // tighter margins for landscape

  // Logo — smaller for landscape
  const logoH = 10;
  const logoW = logoH * IPC_LOGO_ASPECT;
  doc.addImage(IPC_LOGO_BASE64, 'PNG', LW - M - logoW, 6, logoW, logoH);

  // Title
  doc.setFontSize(14);
  doc.setTextColor(...C.dark);
  doc.setFont('helvetica', 'bold');
  doc.text(s.threeDayTitle, M, 13);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...C.muted);
  const startLabel = pdfFormatDate(state.startDate + 'T12:00:00', 'PPP', locale);
  doc.text(`${s.started}: ${startLabel}  |  ${s.name}: _________________`, M, 18);

  // Build per-hour data for all 3 days
  const allSlots = [1, 2, 3].map((d) => buildHourSlots(state, d as 1 | 2 | 3, locale));
  const u = state.volumeUnit;

  // Use 24 rows from 6 AM (standard diary convention)
  const baseHour = allSlots[0].startHour;
  const rows: string[][] = [];

  for (let i = 0; i < 24; i++) {
    const hour = (baseHour + i) % 24;
    const ampm = hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`;
    const timeLabel = `${hour.toString().padStart(2, '0')}:00`;
    const row: string[] = [timeLabel];

    for (let d = 0; d < 3; d++) {
      const slot = allSlots[d].slots[i];
      // Drinks: compact "amount type"
      const drinks = slot ? slot.drinks : '';
      // Voids: volume
      const voids = slot ? slot.voids : '';
      // Sensation
      const sens = slot ? slot.urgency : '';
      // Other: leak + notes (includes standalone leaks from buildHourSlots)
      const other: string[] = [];
      if (slot?.leak) other.push(slot.leak);
      row.push(drinks || '', voids || '', sens || '', other.join(', '));
    }

    rows.push(row);
  }

  // Column headers: TIME | Day 1 (4 cols) | Day 2 (4 cols) | Day 3 (4 cols) = 13 cols
  const dayHeaders = [1, 2, 3].map((d) => {
    const dateStr = getDayDate(state.startDate, d as 1 | 2 | 3);
    return pdfFormatDate(dateStr + 'T12:00:00', 'EEE, PP', locale);
  });

  // We use autoTable with custom column spans simulated via styling
  const contentW = LW - 2 * M;
  const timeW = 14;
  const dayW = (contentW - timeW) / 3;
  const drinkW = dayW * 0.32;
  const voidW = dayW * 0.30;
  const sensW = dayW * 0.16;
  const otherW = dayW * 0.22;

  autoTable(doc, {
    startY: 22,
    head: [
      // Row 1: Day headers spanning 4 cols each
      [
        { content: '', colSpan: 1 },
        { content: `${s.day(1)} — ${dayHeaders[0]}`, colSpan: 4, styles: { halign: 'center' as const } },
        { content: `${s.day(2)} — ${dayHeaders[1]}`, colSpan: 4, styles: { halign: 'center' as const } },
        { content: `${s.day(3)} — ${dayHeaders[2]}`, colSpan: 4, styles: { halign: 'center' as const } },
      ],
      // Row 2: Sub-headers
      [
        s.time,
        s.drinks, `${s.urine}\n(${u})`, s.sens, s.leak,
        s.drinks, `${s.urine}\n(${u})`, s.sens, s.leak,
        s.drinks, `${s.urine}\n(${u})`, s.sens, s.leak,
      ],
    ],
    body: rows,
    margin: { left: M, right: M },
    styles: {
      fontSize: 5,
      cellPadding: 0.8,
      textColor: C.dark,
      minCellHeight: 5.8,
      valign: 'middle',
      lineWidth: 0.1,
      lineColor: [210, 210, 210],
      overflow: 'ellipsize',
    },
    headStyles: {
      fillColor: C.gold,
      textColor: C.white,
      fontStyle: 'bold',
      fontSize: 5.5,
      halign: 'center',
    },
    columnStyles: {
      0:  { cellWidth: timeW, fontStyle: 'bold', halign: 'center', fontSize: 5 },
      // Day 1
      1:  { cellWidth: drinkW },
      2:  { cellWidth: voidW },
      3:  { cellWidth: sensW, halign: 'center' },
      4:  { cellWidth: otherW },
      // Day 2
      5:  { cellWidth: drinkW },
      6:  { cellWidth: voidW },
      7:  { cellWidth: sensW, halign: 'center' },
      8:  { cellWidth: otherW },
      // Day 3
      9:  { cellWidth: drinkW },
      10: { cellWidth: voidW },
      11: { cellWidth: sensW, halign: 'center' },
      12: { cellWidth: otherW },
    },
    didParseCell: (data) => {
      if (data.section !== 'body') return;
      const col = data.column.index;

      // Color-code drink columns (1, 5, 9)
      if ((col === 1 || col === 5 || col === 9) && data.cell.raw && data.cell.raw !== '') {
        data.cell.styles.fillColor = C.inputCell;
        data.cell.styles.textColor = [0, 100, 160];
      }

      // Color-code void columns (2, 6, 10)
      if ((col === 2 || col === 6 || col === 10) && data.cell.raw && data.cell.raw !== '') {
        data.cell.styles.fillColor = C.outputCell;
        data.cell.styles.textColor = [140, 100, 20];
      }

      // Color-code leak columns (4, 8, 12)
      if ((col === 4 || col === 8 || col === 12) && data.cell.raw && data.cell.raw !== '') {
        data.cell.styles.fillColor = [255, 240, 235];
        data.cell.styles.textColor = C.leakTerracotta;
      }

      // Day separators: thicker left border on day start cols (1, 5, 9)
      if (col === 1 || col === 5 || col === 9) {
        data.cell.styles.lineWidth = { left: 0.4, right: 0.1, top: 0.1, bottom: 0.1 };
        data.cell.styles.lineColor = [180, 180, 180];
      }
    },
  });

  // Sensation code legend at bottom
  // @ts-expect-error jspdf-autotable adds lastAutoTable
  const tableEndY: number = doc.lastAutoTable.finalY;
  const legendY = Math.min(tableEndY + 3, LH - 18);
  doc.setFontSize(5.5);
  doc.setTextColor(...C.muted);
  doc.text(s.sensationLegend, M, legendY);
}

/* ================================================================== */
/*  Page 5: Clinical Graphs                                            */
/* ================================================================== */

/** Pick a "nice" round step for axis ticks. Safe against 0/NaN/Infinity. */
function niceStep(range: number, approxTicks: number): number {
  if (!range || !isFinite(range) || range <= 0) return 1; // safety fallback
  const rough = range / approxTicks;
  if (!rough || !isFinite(rough) || rough <= 0) return 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rough)));
  if (!magnitude || !isFinite(magnitude) || magnitude <= 0) return 1;
  const residual = rough / magnitude;
  const nice = residual <= 1.5 ? 1 : residual <= 3 ? 2 : residual <= 7 ? 5 : 10;
  return nice * magnitude;
}

/**
 * Draw axes with smart tick labels, gridlines, and proper margins.
 * Returns nothing — draws directly on the doc.
 */
function drawAxis(
  doc: jsPDF,
  x: number, y: number, w: number, h: number,
  yLabel: string, maxVal: number,
  options?: { gridlines?: boolean; xLabels?: string[]; xLabelEvery?: number },
) {
  const { gridlines = true, xLabels, xLabelEvery = 1 } = options ?? {};

  doc.setDrawColor(...C.mutedLight);
  doc.setLineWidth(0.2);

  // Y-axis
  doc.line(x, y, x, y + h);
  // X-axis
  doc.line(x, y + h, x + w, y + h);

  // Y ticks — use smart step with safety guard
  const safeMax = maxVal > 0 ? maxVal : 100;
  const step = Math.max(niceStep(safeMax, 4), 1); // Never zero
  doc.setFontSize(5.5);
  doc.setTextColor(...C.muted);

  for (let val = 0; val <= safeMax; val += step) {
    const ty = y + h - (val / safeMax) * h;
    doc.line(x - 1, ty, x, ty);
    doc.text(val.toLocaleString(), x - 2, ty + 1.2, { align: 'right' });

    // Gridlines
    if (gridlines && val > 0) {
      doc.setDrawColor(230, 230, 230);
      doc.setLineWidth(0.1);
      doc.line(x, ty, x + w, ty);
      doc.setDrawColor(...C.mutedLight);
      doc.setLineWidth(0.2);
    }
  }

  // Y label (rotated)
  doc.setFontSize(6);
  doc.text(yLabel, x - 12, y + h / 2, { angle: 90 });

  // X labels
  if (xLabels) {
    const spacing = w / xLabels.length;
    doc.setFontSize(5.5);
    doc.setTextColor(...C.muted);
    for (let i = 0; i < xLabels.length; i++) {
      if (i % xLabelEvery !== 0) continue;
      const lx = x + i * spacing + spacing / 2;
      doc.text(xLabels[i], lx, y + h + 3.5, { align: 'center' });
    }
  }
}

function pageGraphs(doc: jsPDF, state: DiaryState, metrics: DiaryMetrics, locale: string) {
  const s = getPdfStrings(locale);
  doc.addPage('a4', 'portrait');
  addLogo(doc);

  doc.setFontSize(16);
  doc.setTextColor(...C.dark);
  doc.setFont('helvetica', 'bold');
  doc.text(s.clinicalAnalysis, MARGIN, 20);
  doc.setFont('helvetica', 'normal');

  // ── Chart 1: Daily Fluid Balance (top) ──
  const chart1Y = 28;
  const chartH = 50;
  const chartW = CONTENT_W - 22;
  const chartX = MARGIN + 18;

  doc.setFontSize(9);
  doc.setTextColor(...C.dark);
  doc.setFont('helvetica', 'bold');
  doc.text(s.dailyFluidBalance, MARGIN, chart1Y);
  doc.setFont('helvetica', 'normal');

  const u = state.volumeUnit;
  const maxBalanceDisplay = Math.max(
    ...metrics.dayMetrics.map((d) => Math.max(dv(d.totalFluidIntakeMl, state), dv(d.totalVoidVolumeMl, state))),
    u === 'oz' ? 7 : 200,
  );
  // Round up to nice number with 20% headroom
  const headroom = maxBalanceDisplay * 1.15;
  const balanceStep = niceStep(headroom, 4);
  const roundedMax = Math.max(Math.ceil(headroom / balanceStep) * balanceStep, u === 'oz' ? 5 : 100);

  drawAxis(doc, chartX, chart1Y + 4, chartW, chartH, u, roundedMax, {
    xLabels: [s.day(1), s.day(2), s.day(3)],
  });

  const groupW = chartW / 3;
  const barW = groupW * 0.28;
  const barGap = 3;

  for (let i = 0; i < 3; i++) {
    const dm = metrics.dayMetrics[i];
    const gCenter = chartX + (i + 0.5) * groupW;

    // Intake bar (left)
    const intakeDisplay = dv(dm.totalFluidIntakeMl, state);
    const intakeH = Math.max((intakeDisplay / roundedMax) * chartH, 0.5);
    doc.setFillColor(...C.chartBlue);
    doc.rect(gCenter - barW - barGap / 2, chart1Y + 4 + chartH - intakeH, barW, intakeH, 'F');

    // Value label on top of intake bar
    if (intakeDisplay > 0) {
      doc.setFontSize(5);
      doc.setTextColor(...C.chartBlue);
      doc.text(
        intakeDisplay.toLocaleString(),
        gCenter - barGap / 2 - barW / 2,
        chart1Y + 4 + chartH - intakeH - 1.5,
        { align: 'center' },
      );
    }

    // Output bar (right)
    const outputDisplay = dv(dm.totalVoidVolumeMl, state);
    const outputH = Math.max((outputDisplay / roundedMax) * chartH, 0.5);
    doc.setFillColor(...C.chartAmber);
    doc.rect(gCenter + barGap / 2, chart1Y + 4 + chartH - outputH, barW, outputH, 'F');

    // Value label on top of output bar
    if (outputDisplay > 0) {
      doc.setFontSize(5);
      doc.setTextColor(...C.chartAmber);
      doc.text(
        outputDisplay.toLocaleString(),
        gCenter + barGap / 2 + barW / 2,
        chart1Y + 4 + chartH - outputH - 1.5,
        { align: 'center' },
      );
    }
  }

  // Legend
  const legY = chart1Y + 4 + chartH + 8;
  doc.setFillColor(...C.chartBlue);
  doc.rect(chartX, legY, 4, 2.5, 'F');
  doc.setFontSize(6);
  doc.setTextColor(...C.dark);
  doc.text(s.fluidIntakeLabel, chartX + 5.5, legY + 2);
  doc.setFillColor(...C.chartAmber);
  doc.rect(chartX + 30, legY, 4, 2.5, 'F');
  doc.text(s.voidedOutput, chartX + 35.5, legY + 2);

  // ── Chart 2: Frequency-Volume (time-based scatter plot) ──
  const chart2Y = legY + 12;
  doc.setFontSize(9);
  doc.setTextColor(...C.dark);
  doc.setFont('helvetica', 'bold');
  doc.text(s.freqVolChart, MARGIN, chart2Y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(...C.muted);
  doc.text(s.freqVolDesc, MARGIN, chart2Y + 4);

  const chart2Top = chart2Y + 7;
  const chart2H = 50;

  const allVoids = [...state.voids].sort((a, b) => a.timestampIso.localeCompare(b.timestampIso));
  const maxVoid = Math.max(...allVoids.map((v) => dv(v.volumeMl, state)), u === 'oz' ? 4 : 100);
  const voidHeadroom = maxVoid * 1.15;
  const voidStep = niceStep(voidHeadroom, 4);
  const roundedMaxVoid = Math.max(Math.ceil(voidHeadroom / voidStep) * voidStep, u === 'oz' ? 4 : 100);

  // X-axis: 24h time from 6am to 5am (clinical convention)
  const timeLabels = ['6am', '8am', '10am', '12pm', '2pm', '4pm', '6pm', '8pm', '10pm', '12am', '2am', '4am'];
  // Show every label but use 12 slots for 24 hours (every 2 hours)
  drawAxis(doc, chartX, chart2Top, chartW, chart2H, u, roundedMaxVoid, {
    gridlines: true,
    xLabels: timeLabels,
    xLabelEvery: 1,
  });

  // Map void timestamps to x position (0-24 on a 6am-based clock)
  if (allVoids.length > 0) {
    const dayColors = [C.chartBlue, C.chartAmber, C.chartTeal] as const;

    allVoids.forEach((v) => {
      const dayNum = getDayNumber(v.timestampIso, state.startDate, state.bedtimes, state.timeZone);
      const color = dayColors[(dayNum - 1) as 0 | 1 | 2];
      const dt = parseISO(v.timestampIso);
      const hourOfDay = getHoursInTz(v.timestampIso, state.timeZone) + dt.getMinutes() / 60;
      // Shift so 6am = 0, 5am = 23
      const shifted = hourOfDay >= 6 ? hourOfDay - 6 : hourOfDay + 18;
      const dotX = chartX + (shifted / 24) * chartW;
      const dotH = (dv(v.volumeMl, state) / roundedMaxVoid) * chart2H;
      const dotY = chart2Top + chart2H - dotH;

      doc.setFillColor(...color);
      doc.circle(dotX, dotY, 1.8, 'F');

      // Mark leaks with red ring
      if (v.leak) {
        doc.setDrawColor(...C.leakNote);
        doc.setLineWidth(0.6);
        doc.circle(dotX, dotY, 3, 'S');
        doc.setLineWidth(0.2);
      }
    });
  }

  // MVV dashed line
  if (metrics.mvv > 0) {
    const mvvDisplay = dv(metrics.mvv, state);
    const mvvY = chart2Top + chart2H - (mvvDisplay / roundedMaxVoid) * chart2H;
    doc.setDrawColor(...C.leakNote);
    doc.setLineWidth(0.3);
    doc.setLineDashPattern([2, 1], 0);
    doc.line(chartX, mvvY, chartX + chartW, mvvY);
    doc.setLineDashPattern([], 0);
    doc.setFontSize(5.5);
    doc.setTextColor(...C.leakNote);
    doc.text(`MVV ${mvvDisplay} ${u}`, chartX + chartW - 1, mvvY - 1.5, { align: 'right' });
  }

  // Legend
  const leg2Y = chart2Top + chart2H + 7;
  const dayColors2 = [C.chartBlue, C.chartAmber, C.chartTeal];
  for (let i = 0; i < 3; i++) {
    const lx = chartX + i * 25;
    doc.setFillColor(...dayColors2[i]);
    doc.circle(lx + 1.5, leg2Y + 1, 1.5, 'F');
    doc.setFontSize(5.5);
    doc.setTextColor(...C.dark);
    doc.text(s.day(i + 1), lx + 4, leg2Y + 2);
  }
  // Leak indicator in legend
  doc.setDrawColor(...C.leakNote);
  doc.setLineWidth(0.6);
  doc.circle(chartX + 78, leg2Y + 1, 2, 'S');
  doc.setFontSize(5.5);
  doc.setTextColor(...C.dark);
  doc.text(s.voidLeakLegend, chartX + 81, leg2Y + 2);
  doc.setLineWidth(0.2);

  // Standalone leak markers on chart (terracotta diamonds at bottom)
  const standaloneLeaks = (state.leaks ?? []);
  if (standaloneLeaks.length > 0) {
    standaloneLeaks.forEach((l) => {
      const dt = parseISO(l.timestampIso);
      const hourOfDay = getHoursInTz(l.timestampIso, state.timeZone) + dt.getMinutes() / 60;
      const shifted = hourOfDay >= 6 ? hourOfDay - 6 : hourOfDay + 18;
      const lx = chartX + (shifted / 24) * chartW;
      const ly = chart2Top + chart2H - 2; // Near bottom of chart

      // Diamond marker
      doc.setFillColor(...C.leakTerracotta);
      doc.setDrawColor(...C.leakTerracotta);
      doc.setLineWidth(0.3);
      const size = 1.8;
      // Draw diamond as polygon path
      doc.lines(
        [[size, -size], [size, size], [-size, size], [-size, -size]],
        lx - size, ly,
        [1, 1],
        'F',
      );
    });

    // Standalone leak legend entry
    doc.setFillColor(...C.leakTerracotta);
    doc.rect(chartX + 95, leg2Y - 0.5, 3, 3, 'F');
    doc.setFontSize(5.5);
    doc.setTextColor(...C.dark);
    doc.text(s.standaloneLeakLegend, chartX + 99.5, leg2Y + 2);
  }

  // ── Chart 3: Urgency Distribution (bottom) ──
  const chart3Y = leg2Y + 10;
  doc.setFontSize(9);
  doc.setTextColor(...C.dark);
  doc.setFont('helvetica', 'bold');
  doc.text(s.urgencyDistribution, MARGIN, chart3Y);
  doc.setFont('helvetica', 'normal');

  const sensCount = [0, 0, 0, 0, 0];
  let notRecordedCount = 0;
  state.voids.forEach((v) => {
    if (v.sensation !== null) sensCount[v.sensation]++;
    else notRecordedCount++;
  });
  const totalSens = sensCount.reduce((s, c) => s + c, 0) + notRecordedCount || 1;
  const maxSens = Math.max(...sensCount, notRecordedCount, 1);

  const barsX = chartX + 28; // Leave space for labels
  const barsW = chartW - 32;
  const barH2 = 7;
  const sensColors = [C.chartTeal, C.chartTeal, C.chartBlue, C.chartAmber, C.chartRose] as const;

  for (let i = 0; i < 5; i++) {
    const by = chart3Y + 5 + i * (barH2 + 2.5);
    const sensLabel = s.sensLabels[i] ?? SENSATION_LABELS[i as 0 | 1 | 2 | 3 | 4].short;

    // Label on the left
    doc.setFontSize(5.5);
    doc.setTextColor(...C.muted);
    doc.text(`${i} - ${sensLabel}`, barsX - 2, by + barH2 / 2 + 1, { align: 'right' });

    // Bar background
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(barsX, by, barsW, barH2, 1, 1, 'F');

    // Bar fill
    const fillW = Math.max((sensCount[i] / maxSens) * barsW, sensCount[i] > 0 ? 3 : 0);
    doc.setFillColor(...sensColors[i]);
    if (fillW > 0) {
      doc.roundedRect(barsX, by, fillW, barH2, 1, 1, 'F');
    }

    // Count and percentage
    const pct = Math.round((sensCount[i] / totalSens) * 100);
    doc.setFontSize(5.5);
    doc.setTextColor(...C.dark);
    doc.text(`${sensCount[i]}  (${pct}%)`, barsX + fillW + 2, by + barH2 / 2 + 1);
  }

  // "Not recorded" row
  if (notRecordedCount > 0) {
    const by = chart3Y + 5 + 5 * (barH2 + 2.5);
    doc.setFontSize(5.5);
    doc.setTextColor(...C.muted);
    doc.text(s.notRecorded, barsX - 2, by + barH2 / 2 + 1, { align: 'right' });
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(barsX, by, barsW, barH2, 1, 1, 'F');
    const fillW = Math.max((notRecordedCount / maxSens) * barsW, 3);
    doc.setFillColor(180, 180, 180);
    doc.roundedRect(barsX, by, fillW, barH2, 1, 1, 'F');
    const pct = Math.round((notRecordedCount / totalSens) * 100);
    doc.setTextColor(...C.dark);
    doc.text(`${notRecordedCount}  (${pct}%)`, barsX + fillW + 2, by + barH2 / 2 + 1);
  }
}

/* ================================================================== */
/*  Page 6: Machine-Readable Data                                      */
/* ================================================================== */

function pageMachineData(doc: jsPDF, state: DiaryState, metrics: DiaryMetrics) {
  doc.addPage('a4', 'portrait');
  addLogo(doc);

  doc.setFontSize(13);
  doc.setTextColor(...C.dark);
  doc.setFont('helvetica', 'bold');
  doc.text('Structured Data', MARGIN, 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...C.muted);
  doc.text('For clinical software ingestion. This page may be scanned or parsed electronically.', MARGIN, 25);

  // ── Metadata table ──
  let y = 30;
  const metadataRows: string[][] = [
    ['patient_age', state.age?.toString() ?? ''],
    ['start_date', state.startDate],
    ['clinic_code', state.clinicCode ?? ''],
    ['timezone', state.timeZone ?? ''],
    ['volume_unit', state.volumeUnit],
  ];

  if (PREMIUM_FEATURES_ENABLED) {
    metadataRows.push(
      ['mvv_ml', metrics.mvv.toString()],
      ['total_intake_ml', metrics.totalFluidIntakeMl.toString()],
      ['total_output_ml', metrics.totalVoidVolumeMl.toString()],
      ['total_voids', metrics.totalVoidCount.toString()],
      ['total_leaks', metrics.totalLeaks.toString()],
      ['total_standalone_leaks', metrics.totalStandaloneLeaks.toString()],
      ['continent', metrics.isContinent ? 'true' : 'false'],
      ['24hv_period1_ml', metrics.periods[0]?.twentyFourHV.toString() ?? ''],
      ['npi_period1_pct', metrics.periods[0]?.nPi?.toFixed(1) ?? ''],
      ['avv_period1_ml', metrics.periods[0]?.avv?.toString() ?? ''],
      ['nocturnal_vol_night1_ml', metrics.nights[0]?.nocturnalVolumeMl.toString() ?? ''],
      ['24hv_period2_ml', metrics.periods[1]?.twentyFourHV.toString() ?? ''],
      ['npi_period2_pct', metrics.periods[1]?.nPi?.toFixed(1) ?? ''],
      ['avv_period2_ml', metrics.periods[1]?.avv?.toString() ?? ''],
      ['nocturnal_vol_night2_ml', metrics.nights[1]?.nocturnalVolumeMl.toString() ?? ''],
    );
  }

  autoTable(doc, {
    startY: y,
    head: [['Field', 'Value']],
    body: metadataRows,
    margin: { left: MARGIN, right: MARGIN },
    styles: { fontSize: 7, cellPadding: 1.5, textColor: C.dark, font: 'courier' },
    headStyles: { fillColor: [80, 80, 80], textColor: C.white, fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 55 }, 1: { cellWidth: 50 } },
  });

  // @ts-expect-error jspdf-autotable adds lastAutoTable
  y = doc.lastAutoTable.finalY + 6;

  // ── Events table ──
  doc.setFontSize(8);
  doc.setTextColor(...C.dark);
  doc.setFont('helvetica', 'bold');
  doc.text('Events', MARGIN, y);
  doc.setFont('helvetica', 'normal');
  y += 3;

  // Merge all events into one sorted list
  // 9-column row. The trailing `woke` column is new (carries wokeBy for nocturnal
  // voids: 'urge' or 'awake'). Older clinician parsers ignore unknown columns.
  type EventRow = [string, string, string, string, string, string, string, string, string];
  const rows: EventRow[] = [];

  for (const w of (state.wakeTimes ?? [])) {
    rows.push(['wake', w.timestampIso, w.dayNumber.toString(), '', '', '', '', '', '']);
  }
  for (const v of state.voids) {
    const day = getDayNumber(v.timestampIso, state.startDate, state.bedtimes, state.timeZone);
    const wokeShort = v.wokeBy === 'urge' ? 'urge' : v.wokeBy === 'awake_anyway' ? 'awake' : '';
    rows.push([
      'void',
      v.timestampIso,
      day.toString(),
      dv(v.volumeMl, state).toString(),
      v.doubleVoidMl ? dv(v.doubleVoidMl, state).toString() : '',
      v.sensation !== null ? v.sensation.toString() : '',
      v.isFirstMorningVoid ? 'Y' : '',
      v.leak ? 'Y' : '',
      wokeShort,
    ]);
  }
  for (const d of state.drinks) {
    const day = getDayNumber(d.timestampIso, state.startDate, state.bedtimes, state.timeZone);
    rows.push([
      'drink',
      d.timestampIso,
      day.toString(),
      dv(d.volumeMl, state).toString(),
      '',
      '',
      '',
      d.drinkType,
      '',
    ]);
  }
  for (const l of (state.leaks ?? [])) {
    const day = getDayNumber(l.timestampIso, state.startDate, state.bedtimes, state.timeZone);
    rows.push([
      'leak',
      l.timestampIso,
      day.toString(),
      '',
      '',
      '',
      l.urgencyBeforeLeak === true ? 'Y' : l.urgencyBeforeLeak === false ? 'N' : '',
      `${l.trigger}${l.amount ? ' ' + l.amount : ''}`,
      '',
    ]);
  }
  for (const b of state.bedtimes) {
    rows.push(['bedtime', b.timestampIso, b.dayNumber.toString(), '', '', '', '', '', '']);
  }

  // Sort by timestamp
  rows.sort((a, b) => a[1].localeCompare(b[1]));

  autoTable(doc, {
    startY: y,
    head: [['type', 'timestamp', 'day', 'vol', 'dbl', 'sens', 'fmv', 'extra', 'woke']],
    body: rows,
    margin: { left: MARGIN, right: MARGIN },
    styles: { fontSize: 5.5, cellPadding: 1, textColor: C.dark, font: 'courier', overflow: 'ellipsize' },
    headStyles: { fillColor: [80, 80, 80], textColor: C.white, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 12 },
      1: { cellWidth: 50 },
      2: { cellWidth: 7 },
      3: { cellWidth: 12 },
      4: { cellWidth: 10 },
      5: { cellWidth: 8 },
      6: { cellWidth: 8 },
      7: { cellWidth: 14 },
      8: { cellWidth: 11 },
    },
  });
}

/* ================================================================== */
/*  Main entry point                                                   */
/* ================================================================== */

/** Generate the PDF blob without triggering a download. */
export function generatePdfBlob(state: DiaryState, locale: string = 'en'): { blob: Blob; filename: string } {
  // Start landscape — the combined 3-day diary is the first page
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const metrics = computeMetrics(state);

  // Page 1: Combined 3-day diary (landscape) — uses the initial page
  pageCombinedDiary(doc, state, locale, true);

  // Page 2: Results overview
  pageResultsOverview(doc, state, metrics, locale);

  // Pages 3-5: Daily diary grids
  for (const dayNum of [1, 2, 3] as const) {
    pageDailyDiary(doc, state, dayNum, metrics.dayMetrics[dayNum - 1], locale);
  }

  // Page 6: Graphs
  pageGraphs(doc, state, metrics, locale);

  // Page 7: Machine-readable data (always English for clinical software)
  pageMachineData(doc, state, metrics);

  // Add footers to all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    addFooter(doc, i, pageCount, locale);
  }

  return {
    blob: doc.output('blob'),
    filename: `my-flow-check-${state.startDate}.pdf`,
  };
}

/** Generate and download the PDF (desktop fallback). */
export function generatePdf(state: DiaryState, locale: string = 'en'): void {
  const { blob, filename } = generatePdfBlob(state, locale);
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();

  // Cleanup after a short delay
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 500);
}
