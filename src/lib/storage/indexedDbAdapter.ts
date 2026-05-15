/**
 * IndexedDB storage adapter for Zustand's persist middleware.
 *
 * Purpose: Replace the default localStorage backend with IndexedDB so the diary
 * survives Safari ITP's 7-day inactivity eviction and gains a larger quota.
 *
 * Migration: On the first getItem() call after the v2→v3 store upgrade, if IDB
 * has no entry for the key but localStorage does, the adapter copies the value
 * to IDB and then removes the localStorage key. The copy-then-clear is atomic
 * in the sense that localStorage is only cleared if the IDB write succeeds —
 * a failed write leaves localStorage intact so the migration retries on the
 * next page load.
 *
 * Error handling: All IDB errors are caught, logged once via console.warn, and
 * swallowed. The persist middleware never sees a rejected promise. The diary's
 * in-memory Zustand state is the source of truth for the current session; a
 * storage failure only means the state won't outlive the tab.
 *
 * Usage (Plan 02 will wire this in):
 *   import { createJSONStorage } from 'zustand/middleware';
 *   import { createIndexedDbStorage } from '@/lib/storage/indexedDbAdapter';
 *   // inside persist config:
 *   storage: createJSONStorage(createIndexedDbStorage),
 */

import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';

interface StateStorageLike {
  getItem: (name: string) => Promise<string | null>;
  setItem: (name: string, value: string) => Promise<void>;
  removeItem: (name: string) => Promise<void>;
}

/**
 * Factory that returns a Zustand-compatible async StateStorage backed by
 * IndexedDB (via idb-keyval). Call once and pass the result to
 * `createJSONStorage(...)` in the Zustand persist config.
 */
export function createIndexedDbStorage(): StateStorageLike {
  return {
    async getItem(name: string): Promise<string | null> {
      // Step 1: Try IDB first. Track whether IDB is reachable so we can decide
      // whether to attempt a v2-localStorage migration on this hydrate.
      let idbAvailable = true;
      try {
        const idbValue = await idbGet<string>(name);
        if (idbValue !== undefined) {
          return idbValue;
        }
      } catch (err) {
        // IDB threw — Firefox private mode, Safari ITP weirdness, corrupted DB.
        // Fall through to localStorage instead of returning null, otherwise an
        // existing v2 patient on these browsers would silently lose their diary.
        console.warn('[indexedDbAdapter] getItem IDB error — falling back to localStorage', err);
        idbAvailable = false;
      }

      // Step 2: Check for a v2 localStorage value (either IDB was empty OR threw).
      let lsValue: string | null = null;
      try {
        lsValue = typeof localStorage !== 'undefined' ? localStorage.getItem(name) : null;
      } catch {
        lsValue = null;
      }

      if (lsValue === null) {
        return null;
      }

      // Step 3: Only attempt the migration when IDB is reachable. If IDB is dead,
      // keep localStorage as-is — the patient continues to hydrate from LS until
      // IDB recovers. Trying to write to a broken IDB would just fail anyway.
      if (idbAvailable) {
        try {
          await idbSet(name, lsValue);
          // IDB write succeeded — safe to remove the localStorage key
          try {
            localStorage.removeItem(name);
          } catch {
            // Removing from localStorage failed; not critical — IDB is the new source
          }
        } catch (err) {
          // IDB write failed — keep localStorage intact so migration retries next load
          console.warn('[indexedDbAdapter] migration write failed; will retry on next load', err);
        }
      }

      return lsValue;
    },

    async setItem(name: string, value: string): Promise<void> {
      try {
        await idbSet(name, value);
      } catch (err) {
        console.warn('[indexedDbAdapter] setItem IDB error', err);
      }
    },

    async removeItem(name: string): Promise<void> {
      try {
        await idbDel(name);
      } catch (err) {
        console.warn('[indexedDbAdapter] removeItem IDB error', err);
      }
    },
  };
}
