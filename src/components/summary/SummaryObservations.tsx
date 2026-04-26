'use client';

/**
 * SummaryObservations: renders gentle, plain-English patterns from the
 * patient's own data. Educational, never diagnostic. The observation
 * generator (lib/observations.ts) decides which patterns are honest enough
 * to surface; this component just renders them with the right copy.
 */

import { useTranslations } from 'next-intl';
import { useDiaryStore } from '@/lib/store';
import { generateObservations } from '@/lib/observations';
import { Sparkles } from 'lucide-react';

export default function SummaryObservations() {
  const t = useTranslations('summary');
  const state = useDiaryStore();
  const observations = generateObservations(state);

  if (observations.length === 0) return null;

  return (
    <div className="rounded-2xl bg-ipc-50 border border-ipc-100 p-4">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-ipc-500/15 flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles size={16} className="text-ipc-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-ipc-800 mb-2">{t('observationsTitle')}</p>
          <ul className="space-y-2">
            {observations.map((o) => (
              <li key={o.key} className="text-sm text-ipc-700 leading-relaxed">
                {keyToCopy(o, t)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function keyToCopy(o: ReturnType<typeof generateObservations>[number], t: ReturnType<typeof useTranslations<'summary'>>): string {
  switch (o.key) {
    case 'caffeineToBathroom': return t('obsCaffeine');
    case 'eveningFluids': return t('obsEveningFluids');
    case 'morningFluids': return t('obsMorningFluids');
    case 'oneNightWaking': return t('obsOneNightWaking', { day: Number(o.values?.day ?? 2) });
    case 'consistentPattern': return t('obsConsistent');
    default: return '';
  }
}
