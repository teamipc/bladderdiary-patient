import { getDayNumber, getHoursInTz, getMinutesInTz, formatTime } from '../utils';
import type { DiaryState } from '../types';
import { getPdfStrings, pdfDrinkLabel, pdfLeakTriggerLabel } from './strings';
import { dv } from './shared';

export interface HourSlot {
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

export function buildHourSlots(state: DiaryState, dayNum: 1 | 2 | 3, locale: string = 'en'): { slots: HourSlot[]; startHour: number } {
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

export interface HalfHourSlot {
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

export function buildHalfHourSlots(state: DiaryState, dayNum: 1 | 2 | 3, locale: string = 'en'): { slots: HalfHourSlot[]; startHour: number } {
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
      return getHoursInTz(iso, state.timeZone) === hour && getMinutesInTz(iso, state.timeZone) >= minStart && getMinutesInTz(iso, state.timeZone) <= minEnd;
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
