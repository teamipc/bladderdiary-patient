import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import ExportActions from '@/components/export/ExportActions';
import { useDiaryStore } from '@/lib/store';
import enMessages from '../../messages/en.json';

// Must mock before module resolution so the dynamic import() in handlePdf is intercepted.
// generatePdf and generatePdfBlob are async (LP-02 — must await ensureLocaleFontRegistered
// for ZH/AR), so the mocks return rejected promises rather than throwing synchronously.
vi.mock('@/lib/exportPdf', () => ({
  generatePdf: vi.fn(() => Promise.reject(new Error('mock-pdf-fail'))),
  generatePdfBlob: vi.fn(() => Promise.reject(new Error('mock-pdf-fail'))),
}));

vi.mock('@/lib/exportCsv', () => ({
  downloadCsv: vi.fn(() => { throw new Error('mock-csv-fail'); }),
  generateCsvBlob: vi.fn(() => { throw new Error('mock-csv-fail'); }),
}));

vi.mock('@vercel/analytics', () => ({ track: vi.fn() }));

const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
afterEach(() => alertSpy.mockClear());

function wrapper(ui: React.ReactElement) {
  return (
    <NextIntlClientProvider locale="en" messages={enMessages} timeZone="UTC">
      {ui}
    </NextIntlClientProvider>
  );
}

describe('ExportActions — error toast (STAB-07)', () => {
  beforeEach(() => {
    useDiaryStore.getState().resetDiary();
    // Seed one void so hasData() returns true and buttons are enabled.
    useDiaryStore.setState({
      diaryStarted: true,
      startDate: '2026-05-17',
      voids: [
        {
          id: 'v1',
          timestampIso: new Date().toISOString(),
          volumeMl: 200,
          sensation: 2,
          leak: false,
          note: '',
          isFirstMorningVoid: false,
        },
      ],
    });
  });

  it('PDF export failure renders the Toast (not window.alert)', async () => {
    const user = userEvent.setup();
    render(wrapper(<ExportActions />));

    const pdfButton = screen.getByRole('button', { name: /pdf/i });
    await user.click(pdfButton);

    // Wait for the catch block + setErrorToast to flush.
    await screen.findByText(/PDF error|mock-pdf-fail/i);

    // Critical assertion: alert was NOT called.
    expect(alertSpy).not.toHaveBeenCalled();

    // Toast container should be present in the DOM (fixed bottom-24 div from Toast.tsx line 25).
    expect(document.querySelector('.fixed.bottom-24')).toBeTruthy();
  });

  it('CSV export failure renders the Toast (not window.alert)', async () => {
    const user = userEvent.setup();
    render(wrapper(<ExportActions />));

    const csvButton = screen.getByRole('button', { name: /csv|spreadsheet/i });
    await user.click(csvButton);

    // Wait for the catch block + setErrorToast to flush.
    await screen.findByText(/csv|went wrong/i);

    // Critical assertion: alert was NOT called.
    expect(alertSpy).not.toHaveBeenCalled();

    // Toast container should be present in the DOM.
    expect(document.querySelector('.fixed.bottom-24')).toBeTruthy();
  });

  it('Toast dismisses when onDismiss is called (testing the wiring, not the wall clock)', async () => {
    // This test verifies that calling onDismiss clears errorToast from the
    // component state, making the Toast invisible. The 5000ms wall-clock timing
    // is an implementation detail of Toast.tsx's useEffect; what matters for
    // ExportActions is that passing duration={5000} + onDismiss={() => setErrorToast(null)}
    // means the state is cleared when onDismiss fires.
    const user = userEvent.setup();
    render(wrapper(<ExportActions />));

    const pdfButton = screen.getByRole('button', { name: /pdf/i });
    await user.click(pdfButton);

    // Wait for the toast to appear.
    const toastText = await screen.findByText(/PDF error|mock-pdf-fail/i);
    expect(toastText).toBeTruthy();

    // Find the X button inside the Toast — it has no accessible label, so locate
    // it within the fixed toast container and click it to trigger onDismiss.
    const toastContainer = document.querySelector('.fixed.bottom-24');
    expect(toastContainer).toBeTruthy();
    const dismissButton = toastContainer!.querySelector('button');
    expect(dismissButton).toBeTruthy();

    await user.click(dismissButton!);

    // After onDismiss, errorToast is null → Toast visible={false} → Toast returns null.
    expect(screen.queryByText(/PDF error|mock-pdf-fail/i)).toBeNull();
  });
});

describe('ExportActions — Download alternative when Web Share is supported', () => {
  beforeEach(() => {
    useDiaryStore.getState().resetDiary();
    useDiaryStore.setState({
      diaryStarted: true,
      startDate: '2026-05-17',
      voids: [
        {
          id: 'v1',
          timestampIso: new Date().toISOString(),
          volumeMl: 200,
          sensation: 2,
          leak: false,
          note: '',
          isFirstMorningVoid: false,
        },
      ],
    });
    // Stub Web Share API so canShareFiles() returns true.
    Object.defineProperty(global.navigator, 'share', {
      value: vi.fn().mockResolvedValue(undefined),
      configurable: true,
      writable: true,
    });
    Object.defineProperty(global.navigator, 'canShare', {
      value: vi.fn().mockReturnValue(true),
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    // Restore: delete the stubs so canShareFiles() returns false in other tests.
    // @ts-expect-error — deleting at runtime, types don't allow
    delete (global.navigator as Navigator).share;
    // @ts-expect-error — same
    delete (global.navigator as Navigator).canShare;
  });

  it('renders hero CTA + demoted PDF share button + PDF download-alt text-link when shareSupported (post-13-04 reshape)', () => {
    render(wrapper(<ExportActions />));
    // After 13-04 reshape: both the hero CTA and the disclosed PDF button reuse the
    // "Send to your healthcare team" label per RESEARCH §Open Questions #2 (D-01).
    // DOM hierarchy disambiguates: hero is top-level, demoted PDF is nested in <details>.
    // getAllByRole returns both; we assert exactly 2 matches.
    expect(screen.getAllByRole('button', { name: /send to your healthcare team/i })).toHaveLength(2);
    // PDF download-alt rendered inside the disclosure body.
    expect(screen.getByTestId('export-pdf-download-alt')).toBeTruthy();
    expect(screen.getByText(/save the pdf for me/i)).toBeTruthy();
  });

  it('renders disclosed CSV share button + CSV download-alt text-link when shareSupported', () => {
    render(wrapper(<ExportActions />));
    expect(screen.getByRole('button', { name: /send a spreadsheet/i })).toBeTruthy();
    expect(screen.getByTestId('export-csv-download-alt')).toBeTruthy();
    expect(screen.getByText(/save the spreadsheet/i)).toBeTruthy();
  });

  it('hides the More options disclosure entirely when pdfOnly=true (top-of-page reward CTA, D-08)', () => {
    render(wrapper(<ExportActions pdfOnly />));
    // Per 13-04 D-08: pdfOnly renders ONLY the hero CTA. The disclosure (and all its
    // children: demoted PDF, PDF download-alt, demoted CSV, CSV download-alt) is suppressed.
    expect(screen.queryByTestId('export-pdf-download-alt')).toBeNull();
    expect(screen.queryByTestId('export-csv-download-alt')).toBeNull();
    expect(screen.queryByRole('button', { name: /send a spreadsheet/i })).toBeNull();
    // Hero CTA still present (exactly one "Send to your healthcare team" button).
    expect(screen.getAllByRole('button', { name: /send to your healthcare team/i })).toHaveLength(1);
  });

  it('omits the entire disclosure (and its download-alt links) when there is no diary data', () => {
    useDiaryStore.getState().resetDiary(); // back to empty state
    render(wrapper(<ExportActions />));
    // Per 13-04 D-10 + render gate `!pdfOnly && hasData`: disclosure suppressed without data.
    expect(screen.queryByTestId('export-pdf-download-alt')).toBeNull();
    expect(screen.queryByTestId('export-csv-download-alt')).toBeNull();
  });
});
