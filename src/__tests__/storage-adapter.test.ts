/**
 * Happy-path unit tests for createIndexedDbStorage adapter.
 * Uses fake-indexeddb to polyfill IndexedDB in the jsdom environment.
 * Tests: get/set/remove round-trip, v2 localStorage migration path, removeItem.
 */

import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { del } from 'idb-keyval';
import { createIndexedDbStorage } from '@/lib/storage/indexedDbAdapter';

const KEY = 'bladder-diary-patient';

describe('createIndexedDbStorage — happy path', () => {
  let adapter: ReturnType<typeof createIndexedDbStorage>;

  beforeEach(async () => {
    adapter = createIndexedDbStorage();
    // Clear localStorage and IDB before each test
    localStorage.clear();
    await del(KEY);
  });

  // Test 1 — getItem returns null when both stores are empty
  it('returns null when both localStorage and IDB are empty', async () => {
    const result = await adapter.getItem(KEY);
    expect(result).toBeNull();
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  // Test 2 — setItem then getItem round-trips a value via IDB
  it('setItem then getItem round-trips a JSON value through IDB only', async () => {
    const value = '{"voids":[],"version":3}';
    await adapter.setItem(KEY, value);
    const result = await adapter.getItem(KEY);
    expect(result).toBe(value);
    // Writes go to IDB only — localStorage must NOT have the key
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  // Test 3 — Migration: v2 localStorage value is moved to IDB on first getItem
  it('migrates v2 localStorage value to IDB on first getItem', async () => {
    const legacyValue = JSON.stringify({ state: { voids: [{ id: 'x' }] }, version: 2 });
    localStorage.setItem(KEY, legacyValue);

    // First call: should return the localStorage value and trigger migration
    const result = await adapter.getItem(KEY);
    expect(result).toBe(legacyValue);

    // After migration: localStorage key must be cleared
    expect(localStorage.getItem(KEY)).toBeNull();

    // After migration: IDB should persist the value
    const result2 = await adapter.getItem(KEY);
    expect(result2).toBe(legacyValue);
  });

  // Test 4 — Migration does NOT happen when IDB already has a value
  it('does not migrate when IDB already has a value', async () => {
    const idbValue = '{"version":3,"new":true}';
    const lsValue = '{"version":2,"old":true}';

    // Pre-populate IDB
    await adapter.setItem(KEY, idbValue);
    // Also put stale data in localStorage
    localStorage.setItem(KEY, lsValue);

    // Should return IDB value, not localStorage value
    const result = await adapter.getItem(KEY);
    expect(result).toBe(idbValue);

    // localStorage should NOT be touched (no migration occurred)
    expect(localStorage.getItem(KEY)).toBe(lsValue);
  });

  // Test 5 — removeItem clears the IDB key
  it('removeItem clears the IDB entry so subsequent getItem returns null', async () => {
    const value = '{"voids":[],"version":3}';
    await adapter.setItem(KEY, value);
    await adapter.removeItem(KEY);
    const result = await adapter.getItem(KEY);
    expect(result).toBeNull();
  });
});
