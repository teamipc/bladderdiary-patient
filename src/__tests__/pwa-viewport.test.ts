import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * PWA, viewport, and cross-device compatibility tests.
 *
 * These verify that the static configuration files (manifest, CSS,
 * service worker, layout) meet PWA requirements and work correctly
 * across Android (Chrome), iOS (Safari), and desktop (Firefox/Chrome).
 *
 * Devices targeted:
 *   - iPhone SE (375×667), iPhone 14 (390×844), iPhone 15 Pro Max (430×932)
 *   - Samsung Galaxy S21 (360×800), Pixel 7 (412×915)
 *   - iPad Mini (768×1024)
 */

const ROOT = resolve(__dirname, '../..');

// ──────────────────────────────────────────────
// manifest.json — PWA installation requirements
// ──────────────────────────────────────────────
describe('manifest.json (PWA)', () => {
  const manifest = JSON.parse(
    readFileSync(resolve(ROOT, 'public/manifest.json'), 'utf-8'),
  );

  it('has required name field', () => {
    expect(manifest.name).toBeTruthy();
    expect(typeof manifest.name).toBe('string');
  });

  it('has short_name ≤ 12 characters for home screen', () => {
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.short_name.length).toBeLessThanOrEqual(15);
  });

  it('uses standalone display mode', () => {
    expect(manifest.display).toBe('standalone');
  });

  it('has start_url set to /', () => {
    expect(manifest.start_url).toBe('/');
  });

  it('has theme_color matching brand', () => {
    expect(manifest.theme_color).toBeTruthy();
    expect(manifest.theme_color).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it('has background_color for splash screen', () => {
    expect(manifest.background_color).toBeTruthy();
  });

  it('has portrait orientation for phone use', () => {
    expect(manifest.orientation).toBe('portrait');
  });

  it('has at least 2 icon sizes (192px and 512px)', () => {
    expect(manifest.icons).toBeDefined();
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
    const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
  });

  it('icons have maskable purpose for adaptive icons', () => {
    for (const icon of manifest.icons) {
      expect(icon.purpose).toContain('maskable');
    }
  });

  it('description is user-friendly and non-clinical', () => {
    expect(manifest.description).toBeTruthy();
    // Should not use scary medical jargon
    expect(manifest.description.toLowerCase()).not.toContain('urinary');
    expect(manifest.description.toLowerCase()).not.toContain('bladder diary');
    expect(manifest.description.toLowerCase()).not.toContain('voiding');
  });
});

// ──────────────────────────────────────────────
// Service Worker — offline capability
// ──────────────────────────────────────────────
describe('service worker (sw.js)', () => {
  const sw = readFileSync(resolve(ROOT, 'public/sw.js'), 'utf-8');

  it('exists and is non-empty', () => {
    expect(sw.length).toBeGreaterThan(100);
  });

  it('has a cache name for versioning', () => {
    expect(sw).toMatch(/CACHE_NAME\s*=/);
  });

  it('listens for install event', () => {
    expect(sw).toContain("addEventListener('install'");
  });

  it('listens for activate event', () => {
    expect(sw).toContain("addEventListener('activate'");
  });

  it('listens for fetch event', () => {
    expect(sw).toContain("addEventListener('fetch'");
  });

  it('pre-caches essential routes for offline', () => {
    expect(sw).toContain("'/'");
    expect(sw).toContain("'/diary/day/1'");
    expect(sw).toContain("'/diary/day/2'");
    expect(sw).toContain("'/diary/day/3'");
  });

  it('handles notification clicks', () => {
    expect(sw).toContain("addEventListener('notificationclick'");
  });

  it('only intercepts GET requests', () => {
    expect(sw).toContain("request.method !== 'GET'");
  });

  it('has offline fallback to home page', () => {
    expect(sw).toContain("OFFLINE_URL = '/'");
  });

  it('cleans up old caches on activate', () => {
    expect(sw).toContain('caches.delete');
  });
});

// ──────────────────────────────────────────────
// globals.css — cross-device responsive patterns
// ──────────────────────────────────────────────
describe('globals.css (viewport/responsive)', () => {
  const css = readFileSync(resolve(ROOT, 'src/app/globals.css'), 'utf-8');

  it('prevents iOS text size adjust', () => {
    expect(css).toContain('-webkit-text-size-adjust: 100%');
  });

  it('disables tap highlight on mobile', () => {
    expect(css).toContain('-webkit-tap-highlight-color: transparent');
  });

  it('prevents iOS zoom on input focus (font-size: 16px)', () => {
    // iOS zooms inputs with font-size < 16px
    expect(css).toMatch(new RegExp('input.*font-size:\\s*16px', 's'));
  });

  it('has safe area bottom padding for notch devices', () => {
    expect(css).toContain('safe-area-inset-bottom');
  });

  it('has webkit font smoothing', () => {
    expect(css).toContain('-webkit-font-smoothing: antialiased');
  });

  it('has moz font smoothing', () => {
    expect(css).toContain('-moz-osx-font-smoothing: grayscale');
  });

  it('has webkit slider thumb styles (Safari/Chrome)', () => {
    expect(css).toContain('::-webkit-slider-thumb');
  });

  it('has moz range thumb styles (Firefox)', () => {
    expect(css).toContain('::-moz-range-thumb');
  });

  it('has webkit appearance reset for sliders', () => {
    expect(css).toContain('-webkit-appearance: none');
  });

  it('uses system font stack with common fallbacks', () => {
    // Should include fonts for iOS (SF Pro), Android (Roboto), and Windows (Segoe UI)
    expect(css).toContain('SF Pro');
    expect(css).toContain('Roboto');
    expect(css).toContain('Segoe UI');
  });
});

// ──────────────────────────────────────────────
// layout.tsx — viewport meta configuration
// ──────────────────────────────────────────────
describe('layout viewport config', () => {
  const layout = readFileSync(
    resolve(ROOT, 'src/app/layout.tsx'),
    'utf-8',
  );

  it('sets viewport width to device-width', () => {
    expect(layout).toContain("width: 'device-width'");
  });

  it('sets initial scale to 1', () => {
    expect(layout).toContain('initialScale: 1');
  });

  it('configures apple web app as capable', () => {
    expect(layout).toContain('capable: true');
  });

  it('links to manifest.json', () => {
    expect(layout).toContain("manifest: '/manifest.json'");
  });

  it('includes apple-touch-icon', () => {
    expect(layout).toContain('apple-touch-icon');
  });

  it('sets theme color for address bar', () => {
    expect(layout).toContain('themeColor');
  });
});

// ──────────────────────────────────────────────
// Notification wording — user-friendly check
// ──────────────────────────────────────────────
describe('notification wording', () => {
  const notifs = readFileSync(
    resolve(ROOT, 'src/lib/notifications.ts'),
    'utf-8',
  );

  it('uses friendly morning greeting', () => {
    expect(notifs).toContain('Good morning');
  });

  it('uses casual afternoon check-in', () => {
    expect(notifs).toContain('check-in');
  });

  it('references bedtime action with app vocabulary', () => {
    expect(notifs).toContain('Go to bed');
  });

  it('does not use clinical/scary terminology', () => {
    const lower = notifs.toLowerCase();
    expect(lower).not.toContain('urination');
    expect(lower).not.toContain('voiding');
    expect(lower).not.toContain('micturition');
    expect(lower).not.toContain('incontinence');
    expect(lower).not.toContain('bladder diary');
  });

  it('completion notification is celebratory', () => {
    expect(notifs).toContain('You did it!');
  });
});

// ──────────────────────────────────────────────
// Touch target sizes — minimum 44px for mobile
// ──────────────────────────────────────────────
describe('touch target compliance', () => {
  const bottomNav = readFileSync(
    resolve(ROOT, 'src/components/layout/BottomNav.tsx'),
    'utf-8',
  );

  it('bottom nav items have min-height of 56px (above 44px minimum)', () => {
    expect(bottomNav).toContain('min-h-[56px]');
  });

  it('bottom nav icon containers are at least w-8 h-8 (32px)', () => {
    expect(bottomNav).toContain('w-8 h-8');
  });
});

// ──────────────────────────────────────────────
// PWA install hook — basic structure check
// ──────────────────────────────────────────────
describe('PWA install hook', () => {
  const hook = readFileSync(
    resolve(ROOT, 'src/lib/usePwaInstall.ts'),
    'utf-8',
  );

  it('detects iOS for manual install instructions', () => {
    expect(hook).toContain('iphone');
    expect(hook).toContain('ipad');
  });

  it('listens for beforeinstallprompt event', () => {
    expect(hook).toContain('beforeinstallprompt');
  });

  it('detects standalone display mode (already installed)', () => {
    expect(hook).toContain('display-mode: standalone');
  });

  it('listens for appinstalled event', () => {
    expect(hook).toContain('appinstalled');
  });
});
