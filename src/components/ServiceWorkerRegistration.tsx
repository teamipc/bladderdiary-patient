'use client';

import { useEffect } from 'react';

/**
 * Registers the service worker for offline PWA support.
 * Silently succeeds/fails — no console noise in production.
 * The SW enables offline caching and notification handling.
 */
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker
      .register('/sw.js')
      .catch(() => {
        // SW registration failed — non-critical, app still works without it
      });
  }, []);

  return null;
}
