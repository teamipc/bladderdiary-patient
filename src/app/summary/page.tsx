'use client';

import { useRouter } from 'next/navigation';
import { useDiaryStore } from '@/lib/store';
import DaySummaryCard from '@/components/export/DaySummaryCard';
import ExportActions from '@/components/export/ExportActions';
import Button from '@/components/ui/Button';
import { HelpCircle, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export default function SummaryPage() {
  const router = useRouter();
  const { diaryStarted, resetDiary, hasData } = useDiaryStore();
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Redirect to landing if diary not started
  if (!diaryStarted) {
    router.replace('/');
    return null;
  }

  const handleReset = () => {
    resetDiary();
    router.replace('/');
  };

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <h2 className="text-xl font-bold text-ipc-950">Summary</h2>
        <p className="text-base text-ipc-500 mt-1">
          Your 3-day bladder diary overview
        </p>
      </div>

      {/* Day summary cards */}
      <div className="space-y-3">
        <DaySummaryCard dayNumber={1} />
        <DaySummaryCard dayNumber={2} />
        <DaySummaryCard dayNumber={3} />
      </div>

      {/* Export section */}
      <div className="pt-2">
        <h3 className="text-lg font-semibold text-ipc-950 mb-3">
          Export for your clinician
        </h3>
        <ExportActions />
      </div>

      {/* Help & Reset */}
      <div className="pt-4 space-y-3 border-t border-ipc-100">
        <Link href="/help">
          <Button variant="ghost" fullWidth size="md">
            <HelpCircle size={18} />
            Help & FAQ
          </Button>
        </Link>

        {/* Reset with confirmation */}
        {!showResetConfirm ? (
          <Button
            variant="ghost"
            fullWidth
            size="md"
            onClick={() => setShowResetConfirm(true)}
            className="text-ipc-400"
          >
            <RotateCcw size={18} />
            Start a New Diary
          </Button>
        ) : (
          <div className="p-4 rounded-2xl bg-danger-light border border-danger/20 space-y-3">
            <p className="text-base font-semibold text-danger">
              Are you sure?
            </p>
            <p className="text-sm text-ipc-700">
              This will delete all your current diary entries. Make sure you have exported your data first.
            </p>
            <div className="flex gap-2">
              <Button
                variant="danger"
                size="md"
                onClick={handleReset}
                className="flex-1"
              >
                Yes, Reset
              </Button>
              <Button
                variant="secondary"
                size="md"
                onClick={() => setShowResetConfirm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
