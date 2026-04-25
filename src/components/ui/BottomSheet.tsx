'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  noScroll?: boolean;
  variant?: 'default' | 'drink' | 'bedtime' | 'leak';
  children: React.ReactNode;
}

export default function BottomSheet({ open, onClose, title, noScroll, variant = 'default', children }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const tc = useTranslations('common');

  // Close on escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 backdrop-dim" onClick={onClose} />

      {/* Sheet — bg-white/70 is the canonical surface (also targeted by the
          night-mode CSS overrides). A subtle accent-tinted overlay is layered
          on top per variant so the modal doesn't read as a flat white slab
          with clashing red/blue/purple accents on day mode. */}
      <div
        ref={sheetRef}
        className={`absolute bottom-0 left-0 right-0 bg-white/70 backdrop-blur-xl
          rounded-t-3xl shadow-2xl border-t border-white/30
          animate-slide-up safe-bottom max-h-[90vh] ${noScroll ? 'overflow-hidden' : 'overflow-y-auto'}`}
      >
        {/* Day-mode accent tint — anchors the form's red/blue/purple accents
            in a soft matching wash so they feel grounded rather than alarming.
            Tinted at low opacity (≤ 5 %) so it never compromises text contrast.
            Hidden on night because the night overrides supply their own tint. */}
        {variant !== 'default' && (
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-0 ${
              variant === 'leak' ? 'bg-leak/[0.04]' :
              variant === 'drink' ? 'bg-drink/[0.04]' :
              variant === 'bedtime' ? 'bg-bedtime/[0.05]' : ''
            }`}
          />
        )}
        {/* Close X — always visible in the top-right so non-tech-savvy
            users have an obvious "escape" affordance beyond tapping the
            backdrop or swiping down. */}
        <button
          type="button"
          onClick={onClose}
          aria-label={tc('close')}
          className="absolute top-2.5 right-2.5 z-10 w-10 h-10 flex items-center justify-center rounded-full
            text-ipc-500 bg-white/70 border border-ipc-100 shadow-sm
            hover:bg-white active:scale-[0.9] transition-all"
        >
          <X size={20} />
        </button>

        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className={`w-10 h-1 rounded-full ${
            variant === 'drink' ? 'bg-drink/40' : variant === 'leak' ? 'bg-leak/40' : variant === 'bedtime' ? 'bg-bedtime/40' : 'bg-ipc-300/40'
          }`} />
        </div>

        {/* Header */}
        {title && (
          <div className="flex items-center px-5 pb-3 pr-14">
            <h2 className="text-xl font-bold text-ipc-950">{title}</h2>
          </div>
        )}

        {/* Content */}
        <div className="px-5 pb-6">
          {children}
        </div>
      </div>
    </div>
  );
}
