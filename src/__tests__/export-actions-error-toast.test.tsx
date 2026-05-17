import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import ExportActions from '@/components/export/ExportActions';
import { useDiaryStore } from '@/lib/store';
import enMessages from '../../messages/en.json';

// Must mock before module resolution so the dynamic import() in handlePdf is intercepted.
vi.mock('@/lib/exportPdf', () => ({
  generatePdf: vi.fn(() => { throw new Error('mock-pdf-fail'); }),
  generatePdfBlob: vi.fn(() => { throw new Error('mock-pdf-fail'); }),
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
