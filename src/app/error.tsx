'use client';

import { useEffect } from 'react';

/**
 * Global error boundary for the app.
 * Catches unhandled errors in any route segment and
 * provides a recovery UI so the app doesn't hard-crash.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to console in development for debugging
    if (process.env.NODE_ENV === 'development') {
      console.error('App error:', error);
    }
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-danger-light flex items-center justify-center mb-4">
        <span className="text-2xl">⚠️</span>
      </div>
      <h2 className="text-xl font-bold text-ipc-950 mb-2">
        Something went wrong
      </h2>
      <p className="text-sm text-ipc-500 mb-6 max-w-xs">
        An unexpected error occurred. Your diary data is safe. It&apos;s stored on your device.
      </p>
      <button
        type="button"
        onClick={reset}
        className="px-6 py-3 rounded-full bg-ipc-600 text-white font-semibold
          active:scale-[0.95] transition-all"
      >
        Try again
      </button>
    </div>
  );
}
