import { describe, it, expect, vi } from 'vitest';
import type { jsPDF } from 'jspdf';
import { currentFontFamily, ensureLocaleFontRegistered } from '@/lib/exportPdf/fonts';
import { NOTO_SC_REGULAR_BASE64, NOTO_SC_BOLD_BASE64, NOTO_SC_JSPDF_NAME } from '@/lib/exportPdf/fonts/zh';
import { NOTO_AR_REGULAR_BASE64, NOTO_AR_BOLD_BASE64, NOTO_AR_JSPDF_NAME } from '@/lib/exportPdf/fonts/ar';

// ── Mock jsPDF helper ─────────────────────────────────────────────────────
// We only exercise the surface ensureLocaleFontRegistered touches: addFileToVFS,
// addFont, and setR2L. A minimal mock is enough — we do not need a real PDF here.
interface MockJsPDF {
  addFileToVFS: ReturnType<typeof vi.fn>;
  addFont: ReturnType<typeof vi.fn>;
  setR2L: ReturnType<typeof vi.fn>;
}

function createMockJsPDF(): MockJsPDF {
  return {
    addFileToVFS: vi.fn(),
    addFont: vi.fn(),
    setR2L: vi.fn(),
  };
}

describe('PDF font registry (LP-02)', () => {
  // ── currentFontFamily ────────────────────────────────────────────────────
  it('currentFontFamily returns helvetica for Latin-script locales (en, fr, es, pt)', () => {
    expect(currentFontFamily('en')).toBe('helvetica');
    expect(currentFontFamily('fr')).toBe('helvetica');
    expect(currentFontFamily('es')).toBe('helvetica');
    expect(currentFontFamily('pt')).toBe('helvetica');
  });

  it('currentFontFamily returns NotoSansSC for zh (Simplified Chinese)', () => {
    expect(currentFontFamily('zh')).toBe('NotoSansSC');
  });

  it('currentFontFamily returns NotoSansArabic for ar (Modern Standard Arabic)', () => {
    expect(currentFontFamily('ar')).toBe('NotoSansArabic');
  });

  it('currentFontFamily falls back to helvetica for unsupported locales', () => {
    // Safe fallback prevents jsPDF from emitting an undefined-font reference
    // (which silently renders as courier).
    expect(currentFontFamily('xx')).toBe('helvetica');
    expect(currentFontFamily('')).toBe('helvetica');
    expect(currentFontFamily('de')).toBe('helvetica');
  });

  // ── ensureLocaleFontRegistered ──────────────────────────────────────────
  it('ensureLocaleFontRegistered is a no-op for helvetica locales (en, fr, es, pt)', async () => {
    for (const locale of ['en', 'fr', 'es', 'pt']) {
      const doc = createMockJsPDF();
      await ensureLocaleFontRegistered(doc as unknown as jsPDF, locale);
      expect(doc.addFileToVFS).not.toHaveBeenCalled();
      expect(doc.addFont).not.toHaveBeenCalled();
      expect(doc.setR2L).not.toHaveBeenCalled();
    }
  });

  it('ensureLocaleFontRegistered registers Noto Sans SC (regular + bold) for zh', async () => {
    const doc = createMockJsPDF();
    await ensureLocaleFontRegistered(doc as unknown as jsPDF, 'zh');

    // VFS files: regular + bold .ttf
    expect(doc.addFileToVFS).toHaveBeenCalledTimes(2);
    expect(doc.addFileToVFS).toHaveBeenCalledWith('NotoSansSC-Regular.ttf', NOTO_SC_REGULAR_BASE64);
    expect(doc.addFileToVFS).toHaveBeenCalledWith('NotoSansSC-Bold.ttf', NOTO_SC_BOLD_BASE64);

    // Font registrations: same family name (NotoSansSC), two styles
    expect(doc.addFont).toHaveBeenCalledTimes(2);
    expect(doc.addFont).toHaveBeenCalledWith('NotoSansSC-Regular.ttf', NOTO_SC_JSPDF_NAME, 'normal');
    expect(doc.addFont).toHaveBeenCalledWith('NotoSansSC-Bold.ttf', NOTO_SC_JSPDF_NAME, 'bold');

    // ZH is LTR — setR2L must NOT be called
    expect(doc.setR2L).not.toHaveBeenCalled();
  });

  it('ensureLocaleFontRegistered registers Noto Sans Arabic + calls setR2L(true) for ar', async () => {
    const doc = createMockJsPDF();
    await ensureLocaleFontRegistered(doc as unknown as jsPDF, 'ar');

    // VFS files: regular + bold .ttf
    expect(doc.addFileToVFS).toHaveBeenCalledTimes(2);
    expect(doc.addFileToVFS).toHaveBeenCalledWith('NotoSansArabic-Regular.ttf', NOTO_AR_REGULAR_BASE64);
    expect(doc.addFileToVFS).toHaveBeenCalledWith('NotoSansArabic-Bold.ttf', NOTO_AR_BOLD_BASE64);

    // Font registrations: same family name (NotoSansArabic), two styles
    expect(doc.addFont).toHaveBeenCalledTimes(2);
    expect(doc.addFont).toHaveBeenCalledWith('NotoSansArabic-Regular.ttf', NOTO_AR_JSPDF_NAME, 'normal');
    expect(doc.addFont).toHaveBeenCalledWith('NotoSansArabic-Bold.ttf', NOTO_AR_JSPDF_NAME, 'bold');

    // AR is RTL — setR2L(true) flips text emission for the rest of the document
    expect(doc.setR2L).toHaveBeenCalledTimes(1);
    expect(doc.setR2L).toHaveBeenCalledWith(true);
  });

  // ── Base64 payload sanity ────────────────────────────────────────────────
  it('ZH base64 modules export non-empty valid-base64 strings', () => {
    // Subset budgets per LP-02: ~62 KB regular + ~62 KB bold = ~125 KB total for ZH.
    // A guard at 50_000 chars catches accidentally-empty / placeholder modules
    // without coupling tightly to the exact subset size.
    expect(NOTO_SC_REGULAR_BASE64.length).toBeGreaterThan(50_000);
    expect(NOTO_SC_BOLD_BASE64.length).toBeGreaterThan(50_000);

    // Base64 alphabet: A-Z, a-z, 0-9, +, /, optional = padding.
    const base64Re = /^[A-Za-z0-9+/]+={0,2}$/;
    expect(NOTO_SC_REGULAR_BASE64).toMatch(base64Re);
    expect(NOTO_SC_BOLD_BASE64).toMatch(base64Re);
  });

  it('AR base64 modules export non-empty valid-base64 strings', () => {
    // Subset budgets per LP-02: ~15 KB regular + ~15 KB bold = ~31 KB total for AR
    // (smaller than ZH because Arabic has fewer codepoints in the strings table).
    // The 10_000-char floor catches accidentally-empty / placeholder modules.
    expect(NOTO_AR_REGULAR_BASE64.length).toBeGreaterThan(10_000);
    expect(NOTO_AR_BOLD_BASE64.length).toBeGreaterThan(10_000);

    const base64Re = /^[A-Za-z0-9+/]+={0,2}$/;
    expect(NOTO_AR_REGULAR_BASE64).toMatch(base64Re);
    expect(NOTO_AR_BOLD_BASE64).toMatch(base64Re);
  });
});
