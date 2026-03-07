'use client';

import { useCallback, useState } from 'react';
import Button from '@/components/ui/Button';
import { useDiaryStore } from '@/lib/store';
import { downloadCsv } from '@/lib/exportCsv';
import { generatePdf } from '@/lib/exportPdf';
import { FileText, FileSpreadsheet, Share2 } from 'lucide-react';

export default function ExportActions() {
  const store = useDiaryStore();
  const [exporting, setExporting] = useState<string | null>(null);

  const handleCsv = useCallback(() => {
    setExporting('csv');
    try {
      downloadCsv(store);
    } finally {
      setTimeout(() => setExporting(null), 1000);
    }
  }, [store]);

  const handlePdf = useCallback(() => {
    setExporting('pdf');
    try {
      generatePdf(store);
    } finally {
      setTimeout(() => setExporting(null), 1000);
    }
  }, [store]);

  const handleShare = useCallback(async () => {
    if (!navigator.share) {
      // Fallback: download PDF
      handlePdf();
      return;
    }

    setExporting('share');
    try {
      // Generate a CSV blob for sharing
      const { generateCsv } = await import('@/lib/exportCsv');
      const csv = generateCsv(store);
      const file = new File(
        [csv],
        `bladder-diary-${store.startDate}.csv`,
        { type: 'text/csv' },
      );

      await navigator.share({
        title: 'Bladder Diary',
        text: 'My 3-day bladder diary data',
        files: [file],
      });
    } catch {
      // User cancelled share or share not supported for files
    } finally {
      setExporting(null);
    }
  }, [store, handlePdf]);

  const hasData = store.hasData();

  return (
    <div className="space-y-3">
      <Button
        onClick={handlePdf}
        fullWidth
        variant="primary"
        disabled={!hasData || exporting === 'pdf'}
      >
        <FileText size={20} />
        {exporting === 'pdf' ? 'Generating...' : 'Download PDF'}
      </Button>

      <Button
        onClick={handleCsv}
        fullWidth
        variant="secondary"
        disabled={!hasData || exporting === 'csv'}
      >
        <FileSpreadsheet size={20} />
        {exporting === 'csv' ? 'Generating...' : 'Download CSV'}
      </Button>

      {typeof navigator !== 'undefined' && 'share' in navigator && (
        <Button
          onClick={handleShare}
          fullWidth
          variant="ghost"
          disabled={!hasData || exporting === 'share'}
        >
          <Share2 size={20} />
          Share
        </Button>
      )}

      {!hasData && (
        <p className="text-center text-sm text-ipc-400 mt-2">
          Start logging entries to enable export
        </p>
      )}
    </div>
  );
}
