'use client';

import { useTranslations } from 'next-intl';
import { useDiaryStore } from '@/lib/store';
import { computeMetrics } from '@/lib/calculations';
import { mlToDisplayVolume } from '@/lib/utils';
import AnimatedMetric from './AnimatedMetric';

/**
 * IPC clinical metrics block for /summary. Renders 4 staggered count-up
 * tiles (24HV, NPi, AVV, MVV) using Period 0 = Night 1 / Day 2 (Day 1 is
 * the IPC adaptation period and excluded from these calculations per the
 * standing IPC-calculations memory). MVV is top-level (cross-day max).
 *
 * Phase 13 D-02 + Phase 16 D-02: NBC was dropped from the surface; this
 * block intentionally renders 4 metrics, not 5.
 *
 * aria-live polite wrapper means screen readers hear the FINAL values once
 * the count-up settles; the brief interim values are absorbed by the
 * polite announcement queue (SR holds the announcement until the user is
 * idle, so intermediate rAF ticks coalesce into one settled announcement).
 *
 * Stagger schedule: 0 / 150 / 300 / 450 ms delays with 800ms count-up
 * each. Total reveal time = 450 + 800 = 1250 ms from first paint to last
 * tile settling.
 */
export default function IpcMetricsBlock() {
  const t = useTranslations('summary.ipcMetrics');
  const state = useDiaryStore();
  const metrics = computeMetrics(state);
  const volumeUnit = state.volumeUnit;

  // Period 0 = first scoreable period (Day 1 excluded as IPC adaptation).
  const period0 = metrics.periods[0];
  const twentyFourHvRaw = period0?.twentyFourHV ?? 0;
  const nPiRaw = period0?.nPi ?? 0;
  const avvRaw = period0?.avv ?? 0;
  const mvvRaw = metrics.mvv;

  // Volume metrics convert mL -> user's display unit (mL or oz).
  // NPi is a percentage and stays as-is.
  const twentyFourHv = mlToDisplayVolume(twentyFourHvRaw, volumeUnit);
  const avv = mlToDisplayVolume(avvRaw, volumeUnit);
  const mvv = mlToDisplayVolume(mvvRaw, volumeUnit);

  return (
    <section aria-live="polite" aria-label={t('regionLabel')}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <AnimatedMetric
          value={twentyFourHv}
          label={t('twentyFourHV')}
          unit={volumeUnit}
          delayMs={0}
        />
        <AnimatedMetric
          value={nPiRaw}
          label={t('nPi')}
          unit="%"
          precision={1}
          delayMs={150}
        />
        <AnimatedMetric
          value={avv}
          label={t('avv')}
          unit={volumeUnit}
          delayMs={300}
        />
        <AnimatedMetric
          value={mvv}
          label={t('mvv')}
          unit={volumeUnit}
          delayMs={450}
        />
      </div>
    </section>
  );
}
