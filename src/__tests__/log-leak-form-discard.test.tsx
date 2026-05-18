import 'fake-indexeddb/auto';
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { NextIntlClientProvider } from 'next-intl';
import enMessages from '../../messages/en.json';
import LogLeakForm from '@/components/diary/LogLeakForm';
import { useDiaryStore } from '@/lib/store';
import type { LeakEntry } from '@/lib/types';

/**
 * CRI-01 regression coverage for LogLeakForm.
 *
 * Same shape as log-void-form-discard.test.tsx and log-drink-form-discard.test.tsx —
 * the autosave-on-unmount cleanup that silently persisted discarded edits was removed
 * in Phase 10. This spec pins the new contract: Save is the only persistence path.
 *
 * LogLeakForm has 3 steps. Step 2 carries the urgencyBeforeLeak toggle (boolean), which
 * is the simplest dirty-state trigger for this form (no volume preset chips like the
 * Void / Drink forms). The seeded leak starts with urgencyBeforeLeak: false; the test
 * advances to Step 2 and flips it to true to dirty the form.
 */

const START_DATE = '2026-03-08';
const TZ = 'America/New_York';

function wrap(node: React.ReactNode) {
  return (
    <NextIntlClientProvider locale="en" messages={enMessages} timeZone={TZ}>
      {node}
    </NextIntlClientProvider>
  );
}

beforeEach(() => {
  useDiaryStore.getState().resetDiary();
  useDiaryStore.setState({ startDate: START_DATE, timeZone: TZ, volumeUnit: 'mL' });
});

function seedLeak(): LeakEntry {
  useDiaryStore.getState().addLeak({
    timestampIso: '2026-03-08T14:00:00.000Z',
    trigger: 'cough',
    amount: null,
    urgencyBeforeLeak: false,
    notes: undefined,
  });
  const seeded = useDiaryStore.getState().leaks[0];
  if (!seeded) throw new Error('seedLeak: expected one leak after addLeak');
  return seeded;
}

describe('LogLeakForm: Discard truly discards (CRI-01)', () => {
  it('Test 1: mounting in edit mode does not mutate the store', () => {
    const seeded = seedLeak();
    const before = useDiaryStore.getState().leaks;
    expect(before).toHaveLength(1);
    expect(before[0].urgencyBeforeLeak).toBe(false);
    expect(before[0].trigger).toBe('cough');

    render(
      wrap(<LogLeakForm dayNumber={1} editEntry={seeded} onSave={() => {}} />),
    );

    const after = useDiaryStore.getState().leaks;
    expect(after).toHaveLength(1);
    expect(after[0].urgencyBeforeLeak).toBe(false);
    expect(after[0].trigger).toBe('cough');
    expect(after[0].id).toBe(seeded.id);
  });

  it('Test 2: unmounting an edited form without Save does not persist the edit', async () => {
    const user = userEvent.setup();
    const seeded = seedLeak();

    const { unmount } = render(
      wrap(<LogLeakForm dayNumber={1} editEntry={seeded} onSave={() => {}} />),
    );

    // Step 1 (trigger picker) is already seeded as 'cough'. Advance to Step 2.
    await user.click(screen.getByText('Next'));
    // Step 2: flip urgencyBeforeLeak from false -> true to dirty the form.
    await user.click(screen.getByTestId('leak-urgency-yes'));

    // Sanity: the store is untouched at this point — only the form's local state changed.
    expect(useDiaryStore.getState().leaks[0].urgencyBeforeLeak).toBe(false);

    // Discard path: the BottomSheet would unmount the form without Save being clicked.
    unmount();

    // Post-unmount: the autosave-on-unmount cleanup is gone, so the store stays at the
    // seeded urgencyBeforeLeak: false. If autosave were re-introduced, this would be true.
    expect(useDiaryStore.getState().leaks).toHaveLength(1);
    expect(useDiaryStore.getState().leaks[0].urgencyBeforeLeak).toBe(false);
    expect(useDiaryStore.getState().leaks[0].id).toBe(seeded.id);
  });

  it('Test 3: clicking the explicit Save button DOES persist the edit', async () => {
    const user = userEvent.setup();
    const seeded = seedLeak();
    const onSave = vi.fn();

    render(
      wrap(<LogLeakForm dayNumber={1} editEntry={seeded} onSave={onSave} />),
    );

    // Step 1 -> Step 2 via sticky Next (trigger already seeded as 'cough').
    await user.click(screen.getByText('Next'));
    // Step 2: flip urgencyBeforeLeak to true.
    await user.click(screen.getByTestId('leak-urgency-yes'));
    // Step 2 -> Step 3 via sticky Next.
    await user.click(screen.getByText('Next'));
    // Step 3: explicit Save.
    await user.click(screen.getByTestId('leak-save'));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(useDiaryStore.getState().leaks).toHaveLength(1);
    expect(useDiaryStore.getState().leaks[0].urgencyBeforeLeak).toBe(true);
    expect(useDiaryStore.getState().leaks[0].id).toBe(seeded.id);
  });

  it('Test 4 (static-code drift): the autosave-on-unmount pattern is not present in LogLeakForm.tsx', () => {
    const src = readFileSync(
      path.join(__dirname, '../components/diary/LogLeakForm.tsx'),
      'utf8',
    );
    // The exact cleanup-effect gate line the autosave used.
    expect(src).not.toContain('if (savedRef.current) return');
    // The ESLint suppression that was attached to the autosave's empty-deps array.
    expect(src).not.toContain('eslint-disable-next-line react-hooks/exhaustive-deps');
    // No stray formRef references — the supporting ref was deleted alongside the cleanup.
    expect(src).not.toMatch(/\bformRef\b/);
    // The misleading legacy line-comment is gone too.
    expect(src).not.toContain('Auto-save on unmount');
  });
});
