'use client';

import { useCallback, useState, useMemo } from 'react';
import Button from '@/components/ui/Button';
import { useDiaryStore } from '@/lib/store';
import { downloadCsv, generateCsvBlob } from '@/lib/exportCsv';
import { generatePdf, generatePdfBlob } from '@/lib/exportPdf';
import { FileText, FileSpreadsheet, Share2 } from 'lucide-react';
import { track } from '@vercel/analytics';

/** Check if the Web Share API supports sharing files. */
function canShareFiles(): boolean {
  if (typeof navigator === 'undefined' || !navigator.share || !navigator.canShare) {
    return false;
  }
  try {
    const testFile = new File(['test'], 'test.txt', { type: 'text/plain' });
    return navigator.canShare({ files: [testFile] });
  } catch {
    return false;
  }
}

export default function ExportActions() {
  const store = useDiaryStore();
  const [exporting, setExporting] = useState<string | null>(null);

  // Detect share capability once on mount (stable across renders)
  const shareSupported = useMemo(() => canShareFiles(), []);

  // ── PDF ──
  const handlePdf = useCallback(async () => {
    setExporting('pdf');
    const method = shareSupported ? 'share' : 'download';
    track('export_pdf', { method });
    try {
      if (shareSupported) {
        const { blob, filename } = generatePdfBlob(store);
        const file = new File([blob], filename, { type: 'application/pdf' });
        await navigator.share({
          title: 'My Flow Check — Bladder Diary',
          files: [file],
        });
      } else {
        generatePdf(store);
      }
    } catch (err) {
      // Ignore user-cancelled share (AbortError)
      if (err instanceof Error && err.name === 'AbortError') return;
      console.error('PDF export failed:', err);
      const msg = err instanceof Error ? err.message : String(err);
      alert(`PDF error: ${msg}`);
    } finally {
      setTimeout(() => setExporting(null), 1000);
    }
  }, [store, shareSupported]);

  // ── CSV ──
  const handleCsv = useCallback(async () => {
    setExporting('csv');
    const method = shareSupported ? 'share' : 'download';
    track('export_csv', { method });
    try {
      if (shareSupported) {
        const { blob, filename } = generateCsvBlob(store);
        const file = new File([blob], filename, { type: 'text/csv' });
        await navigator.share({
          title: 'My Flow Check — Bladder Diary',
          files: [file],
        });
      } else {
        downloadCsv(store);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      console.error('CSV export failed:', err);
      alert('Something went wrong generating the CSV. Please try again.');
    } finally {
      setTimeout(() => setExporting(null), 1000);
    }
  }, [store, shareSupported]);

  const hasData = store.hasData();
  const pdfLabel = shareSupported ? 'Share PDF' : 'Download PDF';
  const csvLabel = shareSupported ? 'Share CSV' : 'Download CSV';
  const Icon = shareSupported ? Share2 : FileText;

  return (
    <div className="space-y-3">
      <Button
        onClick={handlePdf}
        fullWidth
        variant="primary"
        disabled={!hasData || exporting === 'pdf'}
      >
        <Icon size={20} />
        {exporting === 'pdf' ? 'Generating...' : pdfLabel}
      </Button>

      <Button
        onClick={handleCsv}
        fullWidth
        variant="secondary"
        disabled={!hasData || exporting === 'csv'}
      >
        {shareSupported ? <Share2 size={20} /> : <FileSpreadsheet size={20} />}
        {exporting === 'csv' ? 'Generating...' : csvLabel}
      </Button>

      {!hasData && (
        <p className="text-center text-sm text-ipc-400 mt-2">
          Start adding entries to enable export
        </p>
      )}
    </div>
  );
}
