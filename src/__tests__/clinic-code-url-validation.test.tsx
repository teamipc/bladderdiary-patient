/**
 * Tests for STAB-08: clinicCode URL param validation.
 *
 * Two layers:
 *   A) Pure regex tests — import CLINIC_CODE_RE, assert pass/fail per charset spec.
 *   B) Integration tests — render LandingContent with controlled ?clinic= param,
 *      assert store.clinicCode set / not set, and console.warn behaviour.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Layer A — Pure regex tests (no rendering, no store)
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { CLINIC_CODE_RE } from '@/app/[locale]/LandingContent';

describe('CLINIC_CODE_RE', () => {
  it('accepts IPC-2026 (alphanumeric + hyphen)', () => {
    expect(CLINIC_CODE_RE.test('IPC-2026')).toBe(true);
  });

  it('accepts single character A (minimum length = 1)', () => {
    expect(CLINIC_CODE_RE.test('A')).toBe(true);
  });

  it('accepts a lone hyphen (hyphen is in charset)', () => {
    expect(CLINIC_CODE_RE.test('-')).toBe(true);
  });

  it('accepts the 32-char maximum (boundary inclusive)', () => {
    expect(CLINIC_CODE_RE.test('A'.repeat(32))).toBe(true);
  });

  it('rejects 33 characters (boundary exclusive)', () => {
    expect(CLINIC_CODE_RE.test('A'.repeat(33))).toBe(false);
  });

  it('rejects empty string ({1,32} requires at least 1 char)', () => {
    expect(CLINIC_CODE_RE.test('')).toBe(false);
  });

  it('rejects <script> (angle brackets not in charset)', () => {
    expect(CLINIC_CODE_RE.test('<script>')).toBe(false);
  });

  it('rejects underscore (intentional charset narrowing — only [A-Za-z0-9-])', () => {
    expect(CLINIC_CODE_RE.test('IPC_2026')).toBe(false);
  });

  it('rejects whitespace (space not in charset)', () => {
    expect(CLINIC_CODE_RE.test('IPC 2026')).toBe(false);
  });

  it('rejects URL-encoded payload (% not in charset)', () => {
    expect(CLINIC_CODE_RE.test('%3Cscript%3E')).toBe(false);
  });

  it('rejects 5000-char attack payload (length cap)', () => {
    expect(CLINIC_CODE_RE.test('a'.repeat(5000))).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Layer B — Integration tests (component render + store side-effects)
// ─────────────────────────────────────────────────────────────────────────────

import 'fake-indexeddb/auto';
import { describe as describeB, it as itB, expect as expectB, vi, beforeEach, afterEach } from 'vitest';
import { render, act, cleanup } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import enMessages from '../../messages/en.json';
import LandingContentWrapper from '@/app/[locale]/LandingContent';
import { useDiaryStore } from '@/lib/store';

// ── Mock: next/navigation ─────────────────────────────────────────────────────
// The clinic value is controlled per-test via the `mockClinicParam` variable.
// CRITICAL: useSearchParams must return a STABLE reference across renders.
// Returning `new URLSearchParams()` per call would make searchParams a new
// identity each render → the LandingContent useEffect dep
// `[searchParams, setClinicCode]` re-fires → setClinicCode updates Zustand →
// re-render → infinite loop → "Maximum update depth exceeded".
// Solution: mutate a single URLSearchParams instance in place per call.
let mockClinicParam: string | null = null;
const mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useSearchParams: () => {
    mockSearchParams.delete('clinic');
    if (mockClinicParam !== null) mockSearchParams.set('clinic', mockClinicParam);
    return mockSearchParams;
  },
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/en',
}));

// ── Mock: @/i18n/navigation ───────────────────────────────────────────────────
vi.mock('@/i18n/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  Link: ({ children, href, ...rest }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

// ── Mock: @vercel/analytics ───────────────────────────────────────────────────
vi.mock('@vercel/analytics', () => ({ track: vi.fn() }));

// ── Mock: @/lib/usePwaInstall ─────────────────────────────────────────────────
vi.mock('@/lib/usePwaInstall', () => ({
  usePwaInstall: () => ({
    canPrompt: false,
    isIos: false,
    isInstalled: true,
    promptInstall: vi.fn(),
  }),
}));

// ── Mock: @/lib/notifications ─────────────────────────────────────────────────
vi.mock('@/lib/notifications', () => ({
  requestNotificationPermission: vi.fn().mockResolvedValue('denied'),
  scheduleReminders: vi.fn(),
  scheduleDiaryCompleteReminder: vi.fn(),
}));

// ── Mock: @/components/ui/IpcInfoModal ────────────────────────────────────────
vi.mock('@/components/ui/IpcInfoModal', () => ({
  default: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

// ── Mock: @/components/onboarding/OnboardingFlow ─────────────────────────────
vi.mock('@/components/onboarding/OnboardingFlow', () => ({
  default: () => <div data-testid="onboarding" />,
}));

// ── Reset store + mockClinicParam before each integration test ────────────────
beforeEach(() => {
  mockClinicParam = null;
  useDiaryStore.getState().resetDiary();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderLanding() {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages} timeZone="UTC">
      <LandingContentWrapper />
    </NextIntlClientProvider>,
  );
}

describeB('clinicCode URL param wiring (integration)', () => {
  itB('valid: ?clinic=IPC-2026 → store.clinicCode === "IPC-2026"', async () => {
    mockClinicParam = 'IPC-2026';
    await act(async () => { renderLanding(); });
    expectB(useDiaryStore.getState().clinicCode).toBe('IPC-2026');
  });

  itB('valid: ?clinic=A → store.clinicCode === "A"', async () => {
    mockClinicParam = 'A';
    await act(async () => { renderLanding(); });
    expectB(useDiaryStore.getState().clinicCode).toBe('A');
  });

  itB('invalid (too long, 33 chars): does NOT persist; store.clinicCode stays null', async () => {
    mockClinicParam = 'A'.repeat(33);
    await act(async () => { renderLanding(); });
    expectB(useDiaryStore.getState().clinicCode).toBeNull();
  });

  itB('invalid (bad chars, <script>): does NOT persist; store.clinicCode stays null', async () => {
    mockClinicParam = '<script>';
    await act(async () => { renderLanding(); });
    expectB(useDiaryStore.getState().clinicCode).toBeNull();
  });

  itB('invalid (empty string): does NOT persist; store.clinicCode stays null', async () => {
    mockClinicParam = '';
    await act(async () => { renderLanding(); });
    // searchParams.get returns '' for ?clinic= — falsy, so both branches skip.
    expectB(useDiaryStore.getState().clinicCode).toBeNull();
  });

  itB('absent: no ?clinic param → store.clinicCode stays null (no change in behavior)', async () => {
    mockClinicParam = null;
    await act(async () => { renderLanding(); });
    expectB(useDiaryStore.getState().clinicCode).toBeNull();
  });

  itB('dev-only console.warn fires for invalid input when NODE_ENV !== "production"', async () => {
    // vitest runs with NODE_ENV='test' — not 'production' — so the warn branch IS taken.
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockClinicParam = '<script>';
    await act(async () => { renderLanding(); });
    expectB(warnSpy).toHaveBeenCalledWith('Ignored invalid clinicCode:', '<script>');
    warnSpy.mockRestore();
  });

  itB('console.warn payload truncated to 100 chars for long attack strings', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const longPayload = 'x'.repeat(5000);
    mockClinicParam = longPayload;
    await act(async () => { renderLanding(); });
    expectB(warnSpy).toHaveBeenCalledTimes(1);
    const warnArg = warnSpy.mock.calls[0][1] as string;
    expectB(warnArg.length).toBe(100);
    expectB(warnArg).toBe('x'.repeat(100));
    warnSpy.mockRestore();
  });
});
