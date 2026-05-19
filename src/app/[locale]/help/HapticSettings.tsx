'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useDiaryStore } from '@/lib/store';

/**
 * HapticSettings. Phase 15 MI-02 toggle for the haptic-on-save pulse.
 *
 * Lives inside the /help page (no dedicated /settings route per plan D-10).
 * Renders a single labelled switch that flips `hapticEnabled` in the diary
 * store; the persisted preference is read by `fireSaveHaptic()` in
 * src/lib/haptic.ts on every void/drink/leak save.
 *
 * Returns `null` when the device does not expose `navigator.vibrate`:
 * showing a toggle that does nothing would be misleading. The check runs
 * post-mount because `navigator` is undefined during SSR (static export).
 *
 * When the user turns the toggle ON, we fire a confirmation vibration so
 * they immediately feel what they enabled. We never fire one when turning
 * it OFF (a goodbye buzz would be weird).
 */
export default function HapticSettings() {
  const t = useTranslations('hapticToggle');
  const hapticEnabled = useDiaryStore((s) => s.hapticEnabled);
  const setHapticEnabled = useDiaryStore((s) => s.setHapticEnabled);
  const [capable, setCapable] = useState<boolean>(false);

  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    if (typeof navigator.vibrate !== 'function') return;
    // Same pattern as IpcInfoModal's post-mount capability flag: a single
    // setState in an effect with [] deps. The lint rule warns about
    // cascading renders, but this fires exactly once on mount and is the
    // standard way to gate hydration-sensitive UI in React 19.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCapable(true);
  }, []);

  if (!capable) return null;

  const handleToggle = () => {
    const next = !hapticEnabled;
    setHapticEnabled(next);
    // Fire a direct confirmation pulse when turning ON so the user feels
    // what they just enabled. The store update we dispatched above may
    // not have flushed by the time fireSaveHaptic reads it, so we call
    // navigator.vibrate(15) directly here for the opt-in feedback.
    if (next) {
      navigator.vibrate(15);
    }
  };

  return (
    <section className="mb-6 rounded-2xl bg-white border border-ipc-100 px-5 py-4 flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="text-base font-semibold text-ipc-950">
          {t('label')}
        </div>
        <div className="text-sm text-ipc-600 mt-1 leading-relaxed">
          {t('help')}
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={hapticEnabled}
        aria-label={t('label')}
        onClick={handleToggle}
        className={`relative w-12 h-7 rounded-full transition-colors shrink-0 mt-1 ${
          hapticEnabled ? 'bg-ipc-500' : 'bg-ipc-200'
        }`}
      >
        <span
          className={`absolute top-1 start-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
            hapticEnabled ? 'translate-x-5 rtl:-translate-x-5' : 'translate-x-0'
          }`}
          aria-hidden="true"
        />
      </button>
    </section>
  );
}
