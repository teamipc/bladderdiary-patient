'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useDiaryStore } from '@/lib/store';
import { getDayDate, formatDate, formatTime, mlToDisplayVolume } from '@/lib/utils';
import { Droplets, Coffee, Moon, Sun, CloudDrizzle } from 'lucide-react';

interface DaySummaryCardProps {
  dayNumber: 1 | 2 | 3;
}

export default function DaySummaryCard({ dayNumber }: DaySummaryCardProps) {
  const t = useTranslations('daySummary');
  const tc = useTranslations('common');
  const locale = useLocale();
  const { startDate, volumeUnit, getVoidsForDay, getDrinksForDay, getLeaksForDay, getBedtimeForDay, getWakeTimeForDay } = useDiaryStore();

  const voids = getVoidsForDay(dayNumber);
  const drinks = getDrinksForDay(dayNumber);
  const standaloneLeaks = getLeaksForDay(dayNumber);
  const bedtime = getBedtimeForDay(dayNumber);
  const wakeTime = getWakeTimeForDay(dayNumber);

  const totalFluids = drinks.reduce((sum, d) => sum + d.volumeMl, 0);
  const totalVoids = voids.reduce((sum, v) => sum + v.volumeMl + (v.doubleVoidMl ?? 0), 0);
  const leaks = voids.filter((v) => v.leak).length;

  const dayDateStr = getDayDate(startDate, dayNumber);
  const dayLabel = formatDate(dayDateStr + 'T12:00:00', locale);

  const hasAnyData = voids.length > 0 || drinks.length > 0 || bedtime;

  return (
    <div className="rounded-2xl bg-white border border-ipc-100 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 bg-ipc-50 border-b border-ipc-100">
        <h3 className="text-base font-bold text-ipc-950">
          {tc('day', { number: dayNumber })}
          <span className="text-ipc-500 font-medium ml-2">{dayLabel}</span>
        </h3>
      </div>

      {/* Stats */}
      {hasAnyData ? (
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Fluid intake */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-drink/10 flex items-center justify-center">
                <Coffee size={20} className="text-drink" />
              </div>
              <div>
                <p className="text-xl font-bold text-ipc-950">
                  {mlToDisplayVolume(totalFluids, volumeUnit).toLocaleString()}
                  <span className="text-sm font-medium text-ipc-400 ml-0.5">{volumeUnit}</span>
                </p>
                <p className="text-xs text-ipc-500">{t('drinks', { count: drinks.length })}</p>
              </div>
            </div>

            {/* Void total */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-void/10 flex items-center justify-center">
                <Droplets size={20} className="text-void" />
              </div>
              <div>
                <p className="text-xl font-bold text-ipc-950">
                  {mlToDisplayVolume(totalVoids, volumeUnit).toLocaleString()}
                  <span className="text-sm font-medium text-ipc-400 ml-0.5">{volumeUnit}</span>
                </p>
                <p className="text-xs text-ipc-500">{t('voids', { count: voids.length })}</p>
              </div>
            </div>
          </div>

          {/* Wake-up / Bedtime / Leaks */}
          <div className="flex items-center gap-4 text-sm flex-wrap">
            {wakeTime && (
              <div className="flex items-center gap-1.5 text-warning">
                <Sun size={14} />
                <span className="font-medium">{t('wake', { time: formatTime(wakeTime.timestampIso, locale) })}</span>
              </div>
            )}
            {bedtime && (
              <div className="flex items-center gap-1.5 text-bedtime">
                <Moon size={14} />
                <span className="font-medium">{t('bed', { time: formatTime(bedtime.timestampIso, locale) })}</span>
              </div>
            )}
            {leaks > 0 && (
              <div className="flex items-center gap-1.5 text-danger">
                <span className="font-medium">{leaks > 1 ? t('voidLeaksPlural', { count: leaks }) : t('voidLeaks', { count: leaks })}</span>
              </div>
            )}
            {standaloneLeaks.length > 0 && (
              <div className="flex items-center gap-1.5 text-leak">
                <CloudDrizzle size={14} />
                <span className="font-medium">{standaloneLeaks.length > 1 ? t('leaksPlural', { count: standaloneLeaks.length }) : t('leaks', { count: standaloneLeaks.length })}</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-5 text-center">
          <p className="text-base text-ipc-400">{t('noEntries')}</p>
        </div>
      )}
    </div>
  );
}
