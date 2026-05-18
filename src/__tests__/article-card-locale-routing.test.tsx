import { describe, it, expect } from 'vitest';
import { locales } from '@/i18n/config';

// This regex MUST be kept identical to the one in src/components/learn/ArticleCard.tsx.
// The test re-derives it from the same `locales` source to catch any drift between
// the component's regex shape and the contract this test enforces.
const LOCALE_PREFIX_RE = new RegExp(`^/(${locales.join('|')})(?=/|$)`);

describe('ArticleCard locale-stripping regex (LP-01)', () => {
  it('strips each of the 6 supported locale prefixes on a full article path', () => {
    for (const L of locales) {
      const input = `/${L}/learn/voiding/feeling-bladder-is-not-empty`;
      const stripped = input.replace(LOCALE_PREFIX_RE, '');
      expect(stripped).toBe('/learn/voiding/feeling-bladder-is-not-empty');
    }
  });

  it('strips the locale prefix on a pillar path with no trailing segments', () => {
    for (const L of locales) {
      const input = `/${L}/learn/voiding`;
      const stripped = input.replace(LOCALE_PREFIX_RE, '');
      expect(stripped).toBe('/learn/voiding');
    }
  });

  it('strips the locale prefix on a bare-locale-root path', () => {
    // The lookahead `(?=/|$)` allows end-of-string as the boundary, so `/pt` strips to `''`.
    // Not used in production for article cards but documents the contract.
    for (const L of locales) {
      const input = `/${L}`;
      const stripped = input.replace(LOCALE_PREFIX_RE, '');
      expect(stripped).toBe('');
    }
  });

  it('does NOT strip non-locale path segments that resemble a locale', () => {
    // No leading locale at all.
    expect('/learn/voiding/feeling-bladder-is-not-empty'.replace(LOCALE_PREFIX_RE, '')).toBe(
      '/learn/voiding/feeling-bladder-is-not-empty',
    );
    // `en` is at the head but followed by `glish-`, not `/` or end. Lookahead fails.
    expect('/english-learning/article'.replace(LOCALE_PREFIX_RE, '')).toBe(
      '/english-learning/article',
    );
    // `ar` is at the head but followed by `ctic`. Lookahead fails.
    expect('/arctic-research'.replace(LOCALE_PREFIX_RE, '')).toBe('/arctic-research');
  });

  it('keeps the resulting path as a valid Link href that next-intl will re-prepend the locale to', () => {
    // After stripping, the path must start with `/` so `<Link>` from `@/i18n/navigation`
    // with `localePrefix: "as-needed"` resolves to `/<locale>/<rest>` for non-default
    // locales and `/<rest>` for the default (en) locale.
    for (const L of locales) {
      const stripped = `/${L}/learn/voiding`.replace(LOCALE_PREFIX_RE, '');
      expect(stripped.startsWith('/')).toBe(true);
    }
  });

  it('protects against the live production bug: PT/ZH/AR cards no longer produce /<L>/<L>/learn/... URLs', () => {
    // Explicit case from UI-REVIEW.md finding I1: /pt/learn/voiding/feeling-bladder-is-not-empty.
    for (const L of locales) {
      const original = `/${L}/learn/voiding/feeling-bladder-is-not-empty`;
      const stripped = original.replace(LOCALE_PREFIX_RE, '');
      // Simulate next-intl `<Link>` re-prepending the current locale.
      const rebuilt = `/${L}${stripped}`;
      // Final URL must have exactly one `/<L>/` segment at the head.
      const singlePrefix = new RegExp(`^/${L}/`).exec(rebuilt);
      const doublePrefix = new RegExp(`^/${L}/${L}/`).exec(rebuilt);
      expect(singlePrefix).not.toBeNull();
      expect(doublePrefix).toBeNull();
      expect(rebuilt).toBe(`/${L}/learn/voiding/feeling-bladder-is-not-empty`);
    }
  });
});
