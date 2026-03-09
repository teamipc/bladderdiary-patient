'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Hook that manages the PWA "Add to Home Screen" install prompt.
 *
 * On Android/Chrome: captures the `beforeinstallprompt` event and
 * exposes a `promptInstall()` function to trigger the native dialog.
 *
 * On iOS/Safari: detects the platform and returns `isIos = true`
 * so the UI can show manual instructions ("Tap Share → Add to Home Screen").
 *
 * Returns `canInstall = false` if the app is already installed as a PWA.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    // Check if already running as installed PWA
    if (typeof window !== 'undefined') {
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        ('standalone' in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsInstalled(isStandalone);

      // Detect iOS
      const ua = window.navigator.userAgent.toLowerCase();
      setIsIos(/iphone|ipad|ipod/.test(ua) && !('beforeinstallprompt' in window));
    }
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Detect if installed after prompt
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  return {
    /** True if the native install prompt is available (Android/Chrome). */
    canPrompt: !!deferredPrompt,
    /** True on iOS where manual install instructions are needed. */
    isIos,
    /** True if the app is already installed as a PWA. */
    isInstalled,
    /** Trigger the native install dialog (Android/Chrome only). */
    promptInstall,
  };
}
