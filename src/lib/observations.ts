/**
 * Generate gentle, plain-English observations from a patient's diary data
 * for the summary page. Goal: educational, non-threatening, behavioral-design
 * friendly. Patient sees their own pattern; clinician sees the metrics.
 *
 * Constraints:
 *   - Never diagnostic. No "your bladder is overactive". Just description.
 *   - Never prescriptive. No "you should drink less". Just observation.
 *   - Boomer-safe wording. Soft, warm, no jargon.
 *   - Skip if data is too sparse to be honest about a pattern.
 *   - Cap at 2 observations max (decision fatigue).
 *
 * The generator returns translation keys + interpolation values. The actual
 * sentence assembly happens in the React component via next-intl, so all
 * three locales (en/fr/es) read naturally.
 */

import type { DiaryState, VoidEntry, DrinkEntry, DrinkType } from './types';

export type ObservationKey =
  | 'caffeineToBathroom'   // coffee/tea typically followed by void within ~2h
  | 'eveningFluids'        // most fluids in late afternoon/evening
  | 'morningFluids'        // most fluids in morning (positive frame)
  | 'oneNightWaking'       // got up once at night, gentle frame
  | 'consistentPattern'    // similar void count each day (positive frame)
  | 'goodHydration'        // solid hydration across 3 days (positive frame)
  ;

export interface Observation {
  key: ObservationKey;
  values?: Record<string, string | number>;
}

/** Hour-of-day in user tz, simple buckets without jargon. */
function hourBucket(hour: number): 'morning' | 'midday' | 'afternoon' | 'evening' | 'night' {
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 14) return 'midday';
  if (hour >= 14 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 22) return 'evening';
  return 'night';
}

/** Caffeine drinks that the patient might recognize as "coffee/tea". */
const CAFFEINE_TYPES: ReadonlyArray<DrinkType> = ['coffee', 'tea'];

/**
 * Did this drink get followed by a void within the window? Used for the
 * "caffeine nudges you to the bathroom" observation.
 */
function drinkFollowedByVoid(
  drink: DrinkEntry,
  voids: VoidEntry[],
  windowMinutes: number,
): boolean {
  const drinkMs = new Date(drink.timestampIso).getTime();
  const windowEnd = drinkMs + windowMinutes * 60_000;
  return voids.some((v) => {
    const vMs = new Date(v.timestampIso).getTime();
    return vMs > drinkMs && vMs <= windowEnd;
  });
}

/**
 * Compute observations for the patient summary. Pure function for
 * easy unit testing. Locale-agnostic; returns keys for the UI to render.
 */
export function generateObservations(state: DiaryState): Observation[] {
  const out: Observation[] = [];
  const voids = state.voids;
  const drinks = state.drinks;
  if (voids.length === 0 && drinks.length === 0) return out;

  // ── Caffeine to bathroom ──────────────────────────────────────────────
  const caffeineDrinks = drinks.filter((d) => CAFFEINE_TYPES.includes(d.drinkType));
  if (caffeineDrinks.length >= 2) {
    const followed = caffeineDrinks.filter((d) => drinkFollowedByVoid(d, voids, 120)).length;
    // Show the observation only if the pattern is real (≥half of caffeine drinks)
    if (followed >= 2 && followed / caffeineDrinks.length >= 0.5) {
      out.push({
        key: 'caffeineToBathroom',
        values: { count: followed },
      });
    }
  }

  // ── Fluid timing ─────────────────────────────────────────────────────
  // Sum drinks by bucket; if one bucket dominates (>40%), surface it.
  if (drinks.length >= 4) {
    const buckets: Record<string, number> = {};
    let total = 0;
    for (const d of drinks) {
      const hr = getHourInTz(d.timestampIso, state.timeZone);
      const b = hourBucket(hr);
      buckets[b] = (buckets[b] ?? 0) + d.volumeMl;
      total += d.volumeMl;
    }
    const top = Object.entries(buckets).sort((a, b) => b[1] - a[1])[0];
    if (top && total > 0 && top[1] / total > 0.4) {
      const [bucket] = top;
      if (bucket === 'evening' || bucket === 'afternoon') {
        out.push({ key: 'eveningFluids', values: { bucket } });
      } else if (bucket === 'morning') {
        out.push({ key: 'morningFluids' });
      }
    }
  }

  // ── Night wakings ────────────────────────────────────────────────────
  // Count voids that are nocturnal (between any bedtime and that day's wake).
  // We use a soft threshold: surface only if exactly 1 nocturnal void on any
  // single day. Multiple per night might indicate something the doctor should
  // weigh in on, so we let the export speak for itself there.
  for (const dayNumber of [1, 2, 3] as const) {
    const wake = state.wakeTimes.find((w) => w.dayNumber === dayNumber);
    const prevBed = dayNumber > 1
      ? state.bedtimes.find((b) => b.dayNumber === (dayNumber - 1))
      : undefined;
    if (!wake || !prevBed) continue;
    const nocturnal = voids.filter(
      (v) => v.timestampIso > prevBed.timestampIso && v.timestampIso < wake.timestampIso,
    );
    if (nocturnal.length === 1 && out.length < 2) {
      out.push({ key: 'oneNightWaking', values: { day: dayNumber } });
      break; // only mention once
    }
  }

  // ── Consistency (positive frame) ─────────────────────────────────────
  // If there's room for one more, and void counts across days are within ±1,
  // surface a positive observation about consistency. This rewards completion
  // and reinforces the value of tracking.
  if (out.length < 2) {
    const voidsByDay = [1, 2, 3].map(
      (d) => voids.filter((v) => isVoidOnDay(v, d, state)).length,
    );
    if (voidsByDay.every((c) => c >= 3)) {
      const max = Math.max(...voidsByDay);
      const min = Math.min(...voidsByDay);
      if (max - min <= 1) {
        out.push({ key: 'consistentPattern' });
      }
    }
  }

  return out.slice(0, 2);
}

/** Lightweight tz hour extraction without pulling utils.ts circular dep. */
function getHourInTz(iso: string, tz?: string): number {
  if (!tz) return new Date(iso).getHours();
  const parts = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    hour12: false,
    timeZone: tz,
  }).formatToParts(new Date(iso));
  const h = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10);
  return h === 24 ? 0 : h;
}

/**
 * Quick day-attribution check using the same model as getDayNumber but
 * inline-friendly. We re-derive instead of importing to keep this module
 * dependency-light.
 */
function isVoidOnDay(v: VoidEntry, dayNumber: 1 | 2 | 3, state: DiaryState): boolean {
  const startMs = Date.parse(state.startDate + 'T00:00:00');
  const eventMs = Date.parse(getDateInTz(v.timestampIso, state.timeZone) + 'T00:00:00');
  const diff = Math.round((eventMs - startMs) / 86_400_000);
  let dayNum = Math.max(1, Math.min(3, diff + 1));
  // Bedtime-aware bump
  if (dayNum < 3) {
    const dayBed = state.bedtimes.find((b) => b.dayNumber === dayNum);
    if (dayBed && v.timestampIso > dayBed.timestampIso) dayNum = Math.min(3, dayNum + 1);
  }
  // Early-AM pull-back (matches utils.getDayNumber)
  const hour = getHourInTz(v.timestampIso, state.timeZone);
  if (hour <= 5 && dayNum > 1) {
    const prevDay = dayNum - 1;
    const prevBed = state.bedtimes.find((b) => b.dayNumber === prevDay);
    if (!prevBed || v.timestampIso < prevBed.timestampIso) dayNum = prevDay;
  }
  return dayNum === dayNumber;
}

function getDateInTz(iso: string, tz?: string): string {
  const d = new Date(iso);
  if (!tz) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit', timeZone: tz,
  }).formatToParts(d);
  return `${parts.find((p) => p.type === 'year')?.value}-${parts.find((p) => p.type === 'month')?.value}-${parts.find((p) => p.type === 'day')?.value}`;
}
