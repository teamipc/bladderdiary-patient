/**
 * Failure-path unit tests for createIndexedDbStorage adapter.
 * Mocks idb-keyval to simulate IndexedDB unavailability (private mode, ITP eviction, etc.).
 * Tests: graceful degrade on getItem/setItem failures, migration atomicity.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock idb-keyval BEFORE importing the adapter so the adapter picks up the mock
vi.mock('idb-keyval', async () => {
  const actual = await vi.importActual<typeof import('idb-keyval')>('idb-keyval');
  return { ...actual, get: vi.fn(), set: vi.fn(), del: vi.fn() };
});

import { get, set as idbSet } from 'idb-keyval';
import { createIndexedDbStorage } from '@/lib/storage/indexedDbAdapter';

const KEY = 'bladder-diary-patient';

describe('createIndexedDbStorage — IDB unavailable graceful degrade', () => {
  let adapter: ReturnType<typeof createIndexedDbStorage>;

  beforeEach(() => {
    adapter = createIndexedDbStorage();
    localStorage.clear();
    vi.clearAllMocks();
  });

  // Test 6 — IDB-unavailable: getItem returns null, no throw
  it('getItem resolves to null and warns when IDB throws', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.mocked(get).mockRejectedValue(new Error('IDB unavailable'));

    const result = await adapter.getItem(KEY);

    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    warnSpy.mockRestore();
  });

  // Test 7 — IDB-unavailable: setItem does NOT throw
  it('setItem resolves without throwing and warns when IDB throws', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.mocked(idbSet).mockRejectedValue(new Error('Quota exceeded'));

    await expect(adapter.setItem(KEY, '{"x":1}')).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    warnSpy.mockRestore();
  });

  // Test 8 — Migration atomicity: if IDB write fails during migration, localStorage is NOT cleared
  it('does not clear localStorage when the migration IDB write fails', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const legacyValue = JSON.stringify({ state: { voids: [{ id: 'x' }] }, version: 2 });
    localStorage.setItem(KEY, legacyValue);

    // IDB get returns undefined (empty) so migration path triggers
    vi.mocked(get).mockResolvedValue(undefined);
    // IDB set fails so localStorage must NOT be cleared
    vi.mocked(idbSet).mockRejectedValue(new Error('IDB write failed'));

    // Should return the localStorage value (diary state still hydrates)
    const result = await adapter.getItem(KEY);
    expect(result).toBe(legacyValue);

    // localStorage key must be preserved so migration can retry on next page load
    expect(localStorage.getItem(KEY)).toBe(legacyValue);

    // warn must have been called at least once (migration failure)
    expect(warnSpy).toHaveBeenCalledTimes(1);
    warnSpy.mockRestore();
  });

  // Test 9 — HIGH-1 regression: IDB-unavailable still surfaces v2 localStorage
  // For existing patients on browsers where IDB throws (private mode, corrupted
  // DB), the adapter must hydrate from localStorage and NOT clear it (the
  // migration write would also fail, and we want LS preserved so the patient
  // doesn't lose their diary on the v3 deploy).
  it('returns v2 localStorage value when IDB throws on getItem (no migration attempted)', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const legacyValue = JSON.stringify({ state: { voids: [{ id: 'x' }] }, version: 2 });
    localStorage.setItem(KEY, legacyValue);

    // IDB get throws (private mode, IDB disabled, corrupted DB, etc.)
    vi.mocked(get).mockRejectedValue(new Error('IDB unavailable'));

    const result = await adapter.getItem(KEY);

    // Patient still gets their diary state
    expect(result).toBe(legacyValue);
    // localStorage must NOT be cleared — IDB is dead, migration cannot succeed
    expect(localStorage.getItem(KEY)).toBe(legacyValue);
    // idbSet must NOT have been called (no migration attempt when IDB is dead)
    expect(idbSet).not.toHaveBeenCalled();
    // One warn for the IDB get failure
    expect(warnSpy).toHaveBeenCalledTimes(1);
    warnSpy.mockRestore();
  });
});
