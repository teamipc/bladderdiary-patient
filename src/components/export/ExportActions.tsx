'use client';

import { useCallback, useState, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Button from '@/components/ui/Button';
import Toast from '@/components/ui/Toast';
import { useDiaryStore } from '@/lib/store';
import { downloadCsv, generateCsvBlob } from '@/lib/exportCsv';
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

interface ExportActionsProps {
  /** Show only the primary PDF button — used for the top-of-page reward CTA. */
  pdfOnly?: boolean;
  /** Run a one-pass Pavlovian shimmer across the PDF button on mount. */
  shimmer?: boolean;
}

export default function ExportActions({ pdfOnly = false, shimmer = false }: ExportActionsProps = {}) {
  const store = useDiaryStore();
  const t = useTranslations('export');
  const ts = useTranslations('summary');
  const locale = useLocale();
  const [exporting, setExporting] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  // Detect share capability once on mount (stable across renders)
  const shareSupported = useMemo(() => canShareFiles(), []);

  // ── PDF ──
  const handlePdf = useCallback(async () => {
    setExporting('pdf');
    try {
      // Dynamic-import: jsPDF + jspdf-autotable are ~80KB gzipped and only
      // needed when the patient finishes day 3 and exports. Keeping them out
      // of the main bundle improves initial-load performance for everyone
      // who never reaches the export step.
      const { generatePdf, generatePdfBlob } = await import('@/lib/exportPdf');
      if (shareSupported) {
        const { blob, filename } = generatePdfBlob(store, locale);
        track('pdf_generated', { method: 'share' });
        const file = new File([blob], filename, { type: 'application/pdf' });
        await navigator.share({
          title: 'My Flow Check — Bladder Diary',
          files: [file],
        });
        track('pdf_shared');
      } else {
        generatePdf(store, locale);
        track('pdf_generated', { method: 'download' });
      }
    } catch (err) {
      // Ignore user-cancelled share (AbortError)
      if (err instanceof Error && err.name === 'AbortError') return;
      console.error('PDF export failed:', err);
      const msg = err instanceof Error ? err.message : String(err);
      setErrorToast(t('pdfError', { msg }));
    } finally {
      setTimeout(() => setExporting(null), 1000);
    }
  }, [store, shareSupported, locale]);

  // ── PDF download (always-download alternative when share IS supported) ──
  // Patient asked for an explicit save-to-device option even on share-capable
  // devices, so they aren't forced through the OS share sheet to keep a copy.
  const handlePdfDownload = useCallback(async () => {
    setExporting('pdf');
    try {
      const { generatePdf } = await import('@/lib/exportPdf');
      generatePdf(store, locale);
      track('pdf_generated', { method: 'download_alt' });
    } catch (err) {
      console.error('PDF download failed:', err);
      const msg = err instanceof Error ? err.message : String(err);
      setErrorToast(t('pdfError', { msg }));
    } finally {
      setTimeout(() => setExporting(null), 1000);
    }
  }, [store, locale, t]);

  // ── CSV ──
  const handleCsv = useCallback(async () => {
    setExporting('csv');
    try {
      if (shareSupported) {
        const { blob, filename } = generateCsvBlob(store);
        track('csv_generated', { method: 'share' });
        const file = new File([blob], filename, { type: 'text/csv' });
        await navigator.share({
          title: 'My Flow Check — Bladder Diary',
          files: [file],
        });
        track('csv_shared');
      } else {
        downloadCsv(store);
        track('csv_generated', { method: 'download' });
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      console.error('CSV export failed:', err);
      setErrorToast(t('csvError'));
    } finally {
      setTimeout(() => setExporting(null), 1000);
    }
  }, [store, shareSupported]);

  // ── CSV download (always-download alternative when share IS supported) ──
  const handleCsvDownload = useCallback(() => {
    setExporting('csv');
    try {
      downloadCsv(store);
      track('csv_generated', { method: 'download_alt' });
    } catch (err) {
      console.error('CSV download failed:', err);
      setErrorToast(t('csvError'));
    } finally {
      setTimeout(() => setExporting(null), 1000);
    }
  }, [store, t]);

  const hasData = store.hasData();
  // Alliance framing on the summary page: "Send to your healthcare team"
  // (when sharing is supported) reads as collaboration, not data submission.
  const pdfLabel = shareSupported ? ts('exportSendPdf') : ts('exportSavePdf');
  const csvLabel = shareSupported ? ts('exportSendCsv') : ts('exportSaveCsv');
  const Icon = shareSupported ? Share2 : FileText;

  return (
    <div className="space-y-3 md:max-w-2xl md:mx-auto">
      <Button
        onClick={handlePdf}
        fullWidth
        variant="primary"
        disabled={!hasData || exporting === 'pdf'}
        className={`${shimmer ? 'animate-cta-shimmer ' : ''}md:hover:-translate-y-px md:transition-all md:duration-150`}
      >
        <Icon size={20} />
        {exporting === 'pdf' ? t('generating') : pdfLabel}
      </Button>

      {/* Secondary "save to this device" affordance — rendered only when the
          OS-level share sheet is the primary path (mobile / iPadOS). Lets the
          patient keep a copy locally without going through share. Text-link
          weight (not full Button) preserves visual hierarchy: share stays the
          primary CTA, download is the quieter alternative. */}
      {shareSupported && hasData && (
        <button
          type="button"
          onClick={handlePdfDownload}
          disabled={exporting === 'pdf'}
          data-testid="export-pdf-download-alt"
          className="block w-full text-center text-sm text-ipc-700 hover:text-ipc-950 underline underline-offset-4 decoration-ipc-300 hover:decoration-ipc-500 disabled:opacity-50 disabled:cursor-not-allowed py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ipc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface rounded"
        >
          {ts('exportSavePdf')}
        </button>
      )}

      {!pdfOnly && (
        <Button
          onClick={handleCsv}
          fullWidth
          variant="secondary"
          disabled={!hasData || exporting === 'csv'}
          className="md:hover:-translate-y-px md:transition-all md:duration-150"
        >
          {shareSupported ? <Share2 size={20} /> : <FileSpreadsheet size={20} />}
          {exporting === 'csv' ? t('generating') : csvLabel}
        </Button>
      )}

      {!pdfOnly && shareSupported && hasData && (
        <button
          type="button"
          onClick={handleCsvDownload}
          disabled={exporting === 'csv'}
          data-testid="export-csv-download-alt"
          className="block w-full text-center text-sm text-ipc-700 hover:text-ipc-950 underline underline-offset-4 decoration-ipc-300 hover:decoration-ipc-500 disabled:opacity-50 disabled:cursor-not-allowed py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ipc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface rounded"
        >
          {ts('exportSaveCsv')}
        </button>
      )}

      {!hasData && (
        <p className="text-center text-sm text-ipc-400 mt-2">
          {t('noDataYet')}
        </p>
      )}

      <Toast
        message={errorToast ?? ''}
        emoji="⚠️"
        visible={errorToast !== null}
        onDismiss={() => setErrorToast(null)}
        duration={5000}
      />
    </div>
  );
}
