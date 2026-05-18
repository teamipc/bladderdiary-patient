import 'fake-indexeddb/auto';
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { NextIntlClientProvider } from 'next-intl';
import enMessages from '../../messages/en.json';
import LogVoidForm from '@/components/diary/LogVoidForm';
import { useDiaryStore } from '@/lib/store';
import type { VoidEntry } from '@/lib/types';

/**
 * CRI-01 regression coverage for LogVoidForm.
 *
 * The audit's CR-01 / CR-02 findings showed that LogVoidForm's autosave-on-unmount
 * useEffect cleanup persisted the form's in-memory state to the store when the user
 * EXPLICITLY discarded the edit via the ConfirmDialog. Phase 10 removed that cleanup.
 *
 * This spec pins the new contract:
 *   1. Mounting the form (edit mode) is a no-op against the store.
 *   2. Changing form state and unmounting WITHOUT Save leaves the store untouched.
 *   3. Clicking the explicit Save button still mutates the store.
 *   4. The autosave pattern is not silently re-introduced (static-code drift guard).
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

function seedVoid(): VoidEntry {
  useDiaryStore.getState().addVoid({
    timestampIso: '2026-03-08T10:00:00.000Z',
    volumeMl: 200,
    sensation: 2,
    leak: false,
    note: '',
    isFirstMorningVoid: false,
  });
  const seeded = useDiaryStore.getState().voids[0];
  if (!seeded) throw new Error('seedVoid: expected one void after addVoid');
  return seeded;
}

describe('LogVoidForm: Discard truly discards (CRI-01)', () => {
  it('Test 1: mounting in edit mode does not mutate the store', () => {
    const seeded = seedVoid();
    const before = useDiaryStore.getState().voids;
    expect(before).toHaveLength(1);
    expect(before[0].volumeMl).toBe(200);

    render(
      wrap(<LogVoidForm dayNumber={1} editEntry={seeded} onSave={() => {}} />),
    );

    const after = useDiaryStore.getState().voids;
    expect(after).toHaveLength(1);
    expect(after[0].volumeMl).toBe(200);
    expect(after[0].id).toBe(seeded.id);
  });

  it('Test 2: unmounting an edited form without Save does not persist the edit', async () => {
    const user = userEvent.setup();
    const seeded = seedVoid();

    const { unmount } = render(
      wrap(<LogVoidForm dayNumber={1} editEntry={seeded} onSave={() => {}} />),
    );

    // Tap the 500 mL preset chip on Step 1 to dirty the form's volume state.
    await user.click(screen.getByText('500'));

    // Sanity: the store is untouched at this point — only the form's local state changed.
    expect(useDiaryStore.getState().voids[0].volumeMl).toBe(200);

    // Discard path: the BottomSheet would unmount the form without Save being clicked.
    unmount();

    // Post-unmount: the autosave-on-unmount cleanup is gone, so the store stays at 200 mL.
    // If autosave were re-introduced, this would be 500. This is the bug-or-fixed signal.
    expect(useDiaryStore.getState().voids).toHaveLength(1);
    expect(useDiaryStore.getState().voids[0].volumeMl).toBe(200);
    expect(useDiaryStore.getState().voids[0].id).toBe(seeded.id);
  });

  it('Test 3: clicking the explicit Save button DOES persist the edit', async () => {
    const user = userEvent.setup();
    const seeded = seedVoid();
    const onSave = vi.fn();

    render(
      wrap(<LogVoidForm dayNumber={1} editEntry={seeded} onSave={onSave} />),
    );

    // Step 1: change the volume via the chip.
    await user.click(screen.getByText('500'));
    // Step 1 -> Step 2 -> Step 3 via the sticky Next button.
    await user.click(screen.getByText('Next'));
    await user.click(screen.getByText('Next'));
    // Step 3: explicit Save.
    await user.click(screen.getByTestId('void-save'));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(useDiaryStore.getState().voids).toHaveLength(1);
    expect(useDiaryStore.getState().voids[0].volumeMl).toBe(500);
    expect(useDiaryStore.getState().voids[0].id).toBe(seeded.id);
  });

  it('Test 4 (static-code drift): the autosave-on-unmount pattern is not present in LogVoidForm.tsx', () => {
    const src = readFileSync(
      path.join(__dirname, '../components/diary/LogVoidForm.tsx'),
      'utf8',
    );
    // The exact cleanup-effect gate line the autosave used.
    expect(src).not.toContain('if (savedRef.current) return');
    // The ESLint suppression that was attached to the autosave's empty-deps array.
    expect(src).not.toContain('eslint-disable-next-line react-hooks/exhaustive-deps');
    // No stray formRef references — the supporting ref was deleted alongside the cleanup.
    expect(src).not.toMatch(/\bformRef\b/);
  });
});
