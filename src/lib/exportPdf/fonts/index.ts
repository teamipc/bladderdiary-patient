// Public registry of Unicode fonts for the clinical PDF.
//
// Locales using helvetica (Latin script): en, fr, es, pt.
// Locales requiring Unicode fonts via lazy load:
//   - zh: Noto Sans SC (Simplified Chinese)
//   - ar: Noto Sans Arabic (Arabic script, RTL)
//
// EN/FR/ES/PT pay zero bundle cost — the per-locale base64 modules are only
// loaded when generatePdfBlob() is invoked with that locale. The dynamic
// import() boundary lets Next.js code-split the CJK/Arabic font bytes out of
// the initial app shell.

import type { jsPDF } from 'jspdf';

export type PdfFontFamily = 'helvetica' | 'NotoSansSC' | 'NotoSansArabic';

/**
 * Resolve the jsPDF font family for a given app locale.
 *
 * Returns the built-in 'helvetica' family for Latin-script locales (en/fr/es/pt)
 * and unknown locales (safe fallback). Returns 'NotoSansSC' for zh and
 * 'NotoSansArabic' for ar — these family names match the fontname registered
 * by registerZhFont / registerArFont in the per-locale modules.
 */
export function currentFontFamily(locale: string): PdfFontFamily {
  if (locale === 'zh') return 'NotoSansSC';
  if (locale === 'ar') return 'NotoSansArabic';
  return 'helvetica';
}

/**
 * Register the locale-specific Unicode font with the jsPDF document.
 * No-op for locales that use the default helvetica font (en/fr/es/pt).
 *
 * Lazy-loads the font's base64 module via dynamic import so EN/FR/ES/PT
 * generation does not bring CJK/Arabic font bytes into the bundle.
 *
 * For AR, the underlying registerArFont also calls doc.setR2L(true) to
 * enable right-to-left text emission for the rest of the document.
 *
 * MUST be awaited BEFORE any page-builder runs setFont(currentFontFamily(...))
 * for ZH/AR — otherwise jsPDF silently falls back to courier for an
 * unregistered family name.
 */
export async function ensureLocaleFontRegistered(doc: jsPDF, locale: string): Promise<void> {
  if (locale === 'zh') {
    const { registerZhFont } = await import('./zh');
    registerZhFont(doc);
  } else if (locale === 'ar') {
    const { registerArFont } = await import('./ar');
    registerArFont(doc);
  }
  // EN/FR/ES/PT: helvetica is built into jsPDF; nothing to register.
}
