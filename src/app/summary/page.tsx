'use client';

import { useRouter } from 'next/navigation';
import { useDiaryStore } from '@/lib/store';
import DaySummaryCard from '@/components/export/DaySummaryCard';
import ExportActions from '@/components/export/ExportActions';
import Button from '@/components/ui/Button';
import { HelpCircle, Lock, AlertTriangle, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { getCurrentDay } from '@/lib/utils';
import Image from 'next/image';
import IpcInfoModal from '@/components/ui/IpcInfoModal';

export default function SummaryPage() {
  const router = useRouter();
  const { diaryStarted, startDate, getBedtimeForDay, getVoidsForDay, getDrinksForDay } = useDiaryStore();
  const isComplete = diaryStarted && !!getBedtimeForDay(3);

  // Data consistency check — warn if any completed day has very few entries
  const dataWarnings: string[] = [];
  if (isComplete) {
    for (const d of [1, 2, 3] as const) {
      const voids = getVoidsForDay(d);
      const drinks = getDrinksForDay(d);
      if (voids.length === 0) dataWarnings.push(`Day ${d} has no pee entries`);
      if (drinks.length === 0) dataWarnings.push(`Day ${d} has no drink entries — your report will still work but fluid intake data will be missing`);
    }
  }

  // Redirect to landing if diary not started
  if (!diaryStarted) {
    router.replace('/');
    return null;
  }

  // Tracking not complete — show locked message
  if (!isComplete) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-12 text-center">
        <div className="w-16 h-16 rounded-full bg-ipc-100 flex items-center justify-center mx-auto mb-4">
          <Lock size={28} className="text-ipc-400" />
        </div>
        <h2 className="text-xl font-bold text-ipc-950 mb-2">Results Locked</h2>
        <p className="text-base text-ipc-500 leading-relaxed">
          Complete your 3-day tracking period to unlock your results and export your data.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 space-y-6">
      {/* Back arrow + Page title */}
      <div>
        <Link
          href={`/diary/day/${getCurrentDay(startDate)}`}
          className="inline-flex items-center gap-1 text-ipc-600 hover:text-ipc-800 transition-colors mb-2"
        >
          <ChevronLeft size={20} />
          <span className="text-sm font-medium">Back to tracking</span>
        </Link>
        <h2 className="text-xl font-bold text-ipc-950">Results</h2>
        <p className="text-base text-ipc-500 mt-1">
          Your 3-day tracking overview
        </p>
      </div>

      {/* Data consistency warning */}
      {dataWarnings.length > 0 && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800 mb-1">
                Please review your data
              </p>
              <p className="text-xs text-amber-700 leading-relaxed">
                {dataWarnings.join('. ')}. You can still generate your report, but for the most accurate results consider going back to add any missing entries.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Day summary cards */}
      <div className="space-y-3">
        <DaySummaryCard dayNumber={1} />
        <DaySummaryCard dayNumber={2} />
        <DaySummaryCard dayNumber={3} />
      </div>

      {/* IPC info */}
      <div className="rounded-2xl bg-ipc-50 border border-ipc-100 p-4">
        <div className="flex items-start gap-3">
          <Image src="/ipc-logo.png" alt="IPC" width={28} height={28} className="mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-ipc-800 mb-1">Integrated Pelvic Care</p>
            <p className="text-xs text-ipc-500 leading-relaxed">
              Better data leads to better care. Share these results with your health professional at your next appointment.
            </p>
            <IpcInfoModal>
              <span className="inline-block text-xs font-semibold text-ipc-600 mt-1.5 underline underline-offset-2">
                Learn more about IPC
              </span>
            </IpcInfoModal>
          </div>
        </div>
      </div>

      {/* Export section */}
      <div className="pt-2">
        <h3 className="text-lg font-semibold text-ipc-950 mb-3">
          Export for your health professional
        </h3>
        <ExportActions />
      </div>

      {/* Help */}
      <div className="pt-4 border-t border-ipc-100">
        <Link href="/help">
          <Button variant="ghost" fullWidth size="md">
            <HelpCircle size={18} />
            Help & FAQ
          </Button>
        </Link>
      </div>
    </div>
  );
}
