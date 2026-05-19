'use client';

import { useCallback, useState, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Button from '@/components/ui/Button';
import Toast from '@/components/ui/Toast';
import { useDiaryStore } from '@/lib/store';
import { downloadCsv, generateCsvBlob } from '@/lib/exportCsv';
import { FileText, FileSpreadsheet, Share2, ChevronLeft } from 'lucide-react';
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
  /** Show only the primary hero CTA (no disclosure) -- used for the top-of-page reward CTA. */
  pdfOnly?: boolean;
  /** Run a one-pass Pavlovian shimmer across the PDF button on mount. */
  shimmer?: boolean;
}

export default function ExportActions({ pdfOnly = false, shimmer = false }: ExportActionsProps = {}) {
  const store = useDiaryStore();
  const t = useTranslations('export');
  const ts = useTranslations('summary');
  const tReadme = useTranslations('exportPackage.readme');
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
        const { blob, filename } = await generatePdfBlob(store, locale);
        track('pdf_generated', { method: 'share' });
        const file = new File([blob], filename, { type: 'application/pdf' });
        await navigator.share({
          title: 'My Flow Check: Bladder Diary',
          files: [file],
        });
        track('pdf_shared');
      } else {
        await generatePdf(store, locale);
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
      await generatePdf(store, locale);
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
          title: 'My Flow Check: Bladder Diary',
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

  // -- Hero package (PKG-01) --
  // Composes the 4-file zip (PDF + CSV + FHIR + README) and triggers the
  // OS share sheet on mobile, or falls back to direct download elsewhere.
  // Two-stage Web Share probe per RESEARCH section Pitfall 5: stage 1 is
  // the existing boot-time canShareFiles() probe (shareSupported); stage 2
  // re-probes at click time with the real zip File.
  const handleHeroPackage = useCallback(async () => {
    setExporting('package');
    try {
      const { generatePackageBlob } = await import('@/lib/exportPackage');
      const { blob, filename } = await generatePackageBlob(store, locale, tReadme);

      if (shareSupported) {
        const file = new File([blob], filename, { type: 'application/zip' });
        // Stage 2: re-probe with the real zip File per RESEARCH section Pitfall 5.
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          track('package_generated', { method: 'share' });
          await navigator.share({
            title: 'My Flow Check: 3-Day Bladder Diary',
            files: [file],
          });
          track('package_shared');
          return;
        }
        // Stage 2 failed (iOS zip-MIME edge case). Fall through to download.
      }

      track('package_generated', { method: 'download' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 500);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      console.error('Package export failed:', err);
      const msg = err instanceof Error ? err.message : String(err);
      setErrorToast(t('packageError', { msg }));
    } finally {
      setTimeout(() => setExporting(null), 1000);
    }
  }, [store, locale, shareSupported, t, tReadme]);

  const hasData = store.hasData();
  // Alliance framing on the summary page: "Send to your healthcare team"
  // (when sharing is supported) reads as collaboration, not data submission.
  const pdfLabel = shareSupported ? ts('exportSendPdf') : ts('exportSavePdf');
  const csvLabel = shareSupported ? ts('exportSendCsv') : ts('exportSaveCsv');
  const Icon = shareSupported ? Share2 : FileText;

  const heroLabel = shareSupported ? ts('exportSendPdf') : ts('exportSavePackage');

  // shimmer animation migrates from old PDF button to new hero CTA; disclosed
  // PDF button no longer shimmers (single Pavlovian draw on the most-impactful
  // surface).
  return (
    <div className="space-y-3 md:max-w-2xl md:mx-auto">
      {/* -- Hero CTA (PKG-01) -- */}
      <Button
        onClick={handleHeroPackage}
        fullWidth
        variant="primary"
        disabled={!hasData || exporting === 'package'}
        className={`${shimmer ? 'animate-cta-shimmer ' : ''}md:hover:-translate-y-px md:transition-all md:duration-150`}
      >
        <Share2 size={20} />
        {exporting === 'package' ? t('packageGenerating') : heroLabel}
      </Button>

      {/* -- More options disclosure (PKG-05 backward compatibility) --
          When pdfOnly is true, the summary's top-of-page reward CTA renders
          only the hero (one action). The disclosure with the legacy
          3-button flow is suppressed. */}
      {!pdfOnly && hasData && (
        <details className="group rounded-2xl bg-white border border-ipc-100 overflow-hidden">
          <summary className="flex items-center justify-between px-5 py-4 cursor-pointer list-none text-base font-semibold text-ipc-950 [&::-webkit-details-marker]:hidden">
            {ts('exportMoreOptions')}
            <ChevronLeft
              size={18}
              className="text-ipc-400 transition-transform -rotate-90 group-open:rotate-[-270deg] shrink-0 ml-2 rtl:scale-x-[-1]"
            />
          </summary>
          <div className="px-5 pb-4 space-y-3">
            {/* Existing PDF button -- unchanged behavior, demoted visual weight */}
            <Button
              onClick={handlePdf}
              fullWidth
              variant="secondary"
              disabled={!hasData || exporting === 'pdf'}
              className="md:hover:-translate-y-px md:transition-all md:duration-150"
            >
              <Icon size={20} />
              {exporting === 'pdf' ? t('generating') : pdfLabel}
            </Button>

            {/* PDF download-alt link -- unchanged */}
            {shareSupported && (
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

            {/* Existing CSV button -- unchanged behavior */}
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

            {/* CSV download-alt link -- unchanged */}
            {shareSupported && (
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
          </div>
        </details>
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
