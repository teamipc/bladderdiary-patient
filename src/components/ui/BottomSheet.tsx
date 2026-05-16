'use client';

import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  noScroll?: boolean;
  variant?: 'default' | 'drink' | 'bedtime' | 'leak';
  /** Modal max-width at md+. 'default' → max-w-3xl (grid-heavy forms); 'narrow' → max-w-2xl (slider/time-picker only). */
  maxWidth?: 'default' | 'narrow';
  /** When true, suspends the focus trap and marks the sheet aria-hidden — used when ConfirmDialog stacks above (Plan 06-10). */
  inert?: boolean;
  children: React.ReactNode;
}

export default function BottomSheet({ open, onClose, title, noScroll, variant = 'default', maxWidth = 'default', inert = false, children }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const tc = useTranslations('common');
  const sheetTitleId = useId();
  const previousFocusRef = useRef<HTMLElement | null>(null);

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

  // Focus trap — wraps Tab/Shift+Tab inside the modal, pulls stray focus back in.
  // Skipped when `inert` is true (Plan 06-10 sets this when ConfirmDialog stacks).
  // Mobile invariant: keyboard-only behavior; touch users never trigger it.
  useEffect(() => {
    if (!open || inert) return;
    const sheet = sheetRef.current;
    if (!sheet) return;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusable = sheet.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
        return;
      }
      if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
        return;
      }
      if (active && !sheet.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', handleTabKey);
    return () => window.removeEventListener('keydown', handleTabKey);
  }, [open, inert]);

  // Initial focus on open — lands on first focusable that isn't close-X or a step dot.
  // Uses STABLE data-attribute filters (data-bottom-sheet-close, data-step-dot) instead
  // of localized aria-label string matching, because aria-label localization is brittle:
  //   - tc('close') returns "Close" / "Fermer" / "Cerrar" / "Fechar" / "关闭" / "إغلاق" per locale
  //   - tc('stepAriaLabel', { n: '' }).trim() for ZH produces "第  步" (double-space)
  //     because the ZH template is `第 {n} 步` and interpolating empty n leaves two spaces
  //   - The `^=` CSS attribute selector would NOT match the actual `第 1 步` rendered label,
  //     causing step dots to silently receive initial focus in ZH (BLOCKER W1 — verified by
  //     plan-checker reading the ZH messages JSON)
  // The data-attribute strategy is locale-independent and immune to translation drift.
  //
  // Deferred 50ms so children mount + refs populate before the query.
  // Mobile invariant: keyboard/focus-only behavior; tap-on-FAB-then-form-opens doesn't
  // trigger focus ring (focus-visible is keyboard-only).
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      const sheet = sheetRef.current;
      if (!sheet) return;
      const focusable = sheet.querySelector<HTMLElement>(
        'button:not([disabled]):not([data-bottom-sheet-close]):not([data-step-dot]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])'
      );
      if (focusable) {
        focusable.focus();
      } else {
        sheet.focus();
      }
    }, 50);
    return () => clearTimeout(t);
  }, [open]);

  // Return focus to the element that opened the modal (FAB action button, etc.).
  // Critical for keyboard-only users. Mobile invariant: zero pixel diff; focused
  // element on close just receives focus without visual jump.
  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [open]);

  if (!open) return null;

  const maxWidthClass = maxWidth === 'narrow' ? 'md:max-w-2xl' : 'md:max-w-3xl';

  return (
    <div className="fixed inset-0 z-50 md:flex md:items-center md:justify-center md:p-6" data-testid="bottom-sheet">
      {/* Backdrop */}
      <div
        className="absolute inset-0 backdrop-dim md:bg-black/40 md:backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet — bg-white/70 is the canonical surface (also targeted by the
          night-mode CSS overrides). A subtle accent-tinted overlay is layered
          on top per variant so the modal doesn't read as a flat white slab
          with clashing red/blue/purple accents on day mode. */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? sheetTitleId : undefined}
        aria-hidden={inert ? 'true' : undefined}
        className={`absolute bottom-0 left-0 right-0 bg-white/70 backdrop-blur-xl
          rounded-t-3xl shadow-2xl border-t border-white/30
          animate-slide-up safe-bottom max-h-[90vh] ${noScroll ? 'overflow-hidden' : 'overflow-y-auto'}
          md:relative md:bottom-auto md:left-auto md:right-auto
          md:mx-auto md:w-full ${maxWidthClass}
          md:rounded-3xl md:border md:border-black/5
          md:shadow-xl md:ring-1 md:ring-black/5
          md:animate-modal-in md:[animation-name:modalIn] md:max-h-[85vh]
          md:safe-bottom-reset`}
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
          data-testid="bottom-sheet-close"
          data-bottom-sheet-close="true"
          className="absolute top-2.5 end-2.5 z-10 w-10 h-10 md:w-11 md:h-11 flex items-center justify-center rounded-full
            text-ipc-500 bg-white/70 border border-ipc-100 shadow-sm
            hover:bg-white active:scale-[0.9] transition-all
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ipc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
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
          <div className="flex items-center px-5 pb-3 pe-14 md:px-6 md:pt-2 md:pe-16">
            <h2 id={sheetTitleId} className="text-xl font-bold text-ipc-950 md:text-2xl">{title}</h2>
          </div>
        )}

        {/* Content */}
        <div className="px-5 pb-6 md:px-6 md:pb-8 md:pt-2">
          {children}
        </div>
      </div>
    </div>
  );
}
