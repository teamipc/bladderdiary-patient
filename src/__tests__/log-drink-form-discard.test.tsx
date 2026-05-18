import 'fake-indexeddb/auto';
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { NextIntlClientProvider } from 'next-intl';
import enMessages from '../../messages/en.json';
import LogDrinkForm from '@/components/diary/LogDrinkForm';
import { useDiaryStore } from '@/lib/store';
import type { DrinkEntry } from '@/lib/types';

/**
 * CRI-01 regression coverage for LogDrinkForm.
 *
 * Same shape as log-void-form-discard.test.tsx — the autosave-on-unmount cleanup that
 * silently persisted discarded edits was removed in Phase 10. This spec pins the new
 * contract: Save is the only persistence path.
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

function seedDrink(): DrinkEntry {
  useDiaryStore.getState().addDrink({
    timestampIso: '2026-03-08T11:00:00.000Z',
    volumeMl: 250,
    drinkType: 'water',
    note: '',
  });
  const seeded = useDiaryStore.getState().drinks[0];
  if (!seeded) throw new Error('seedDrink: expected one drink after addDrink');
  return seeded;
}

describe('LogDrinkForm: Discard truly discards (CRI-01)', () => {
  it('Test 1: mounting in edit mode does not mutate the store', () => {
    const seeded = seedDrink();
    const before = useDiaryStore.getState().drinks;
    expect(before).toHaveLength(1);
    expect(before[0].volumeMl).toBe(250);

    render(
      wrap(<LogDrinkForm dayNumber={1} editEntry={seeded} onSave={() => {}} />),
    );

    const after = useDiaryStore.getState().drinks;
    expect(after).toHaveLength(1);
    expect(after[0].volumeMl).toBe(250);
    expect(after[0].id).toBe(seeded.id);
  });

  it('Test 2: unmounting an edited form without Save does not persist the edit', async () => {
    const user = userEvent.setup();
    const seeded = seedDrink();

    const { unmount } = render(
      wrap(<LogDrinkForm dayNumber={1} editEntry={seeded} onSave={() => {}} />),
    );

    // Tap the 500 mL preset chip on Step 1 to dirty the form's volume state.
    await user.click(screen.getByText('500'));

    expect(useDiaryStore.getState().drinks[0].volumeMl).toBe(250);

    unmount();

    // Post-unmount: the store stays at the seeded 250 mL.
    expect(useDiaryStore.getState().drinks).toHaveLength(1);
    expect(useDiaryStore.getState().drinks[0].volumeMl).toBe(250);
    expect(useDiaryStore.getState().drinks[0].id).toBe(seeded.id);
  });

  it('Test 3: clicking the explicit Save button DOES persist the edit', async () => {
    const user = userEvent.setup();
    const seeded = seedDrink();
    const onSave = vi.fn();

    render(
      wrap(<LogDrinkForm dayNumber={1} editEntry={seeded} onSave={onSave} />),
    );

    // Step 1: change volume via the chip.
    await user.click(screen.getByText('500'));
    // Step 1 -> Step 2 via the sticky Next button (TOTAL_STEPS = 2).
    await user.click(screen.getByText('Next'));
    // Step 2: explicit Save.
    await user.click(screen.getByTestId('drink-save'));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(useDiaryStore.getState().drinks).toHaveLength(1);
    expect(useDiaryStore.getState().drinks[0].volumeMl).toBe(500);
    expect(useDiaryStore.getState().drinks[0].id).toBe(seeded.id);
  });

  it('Test 4 (static-code drift): the autosave-on-unmount pattern is not present in LogDrinkForm.tsx', () => {
    const src = readFileSync(
      path.join(__dirname, '../components/diary/LogDrinkForm.tsx'),
      'utf8',
    );
    expect(src).not.toContain('if (savedRef.current) return');
    expect(src).not.toContain('eslint-disable-next-line react-hooks/exhaustive-deps');
    expect(src).not.toMatch(/\bformRef\b/);
  });
});
