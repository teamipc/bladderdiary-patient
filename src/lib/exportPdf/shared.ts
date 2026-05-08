import { jsPDF } from 'jspdf';
import { mlToDisplayVolume } from '../utils';
import type { DiaryState } from '../types';
import { IPC_LOGO_BASE64 } from '../ipcLogoBase64';
import { C, MARGIN, PAGE_W, LOGO_W, LOGO_H } from './theme';
import { getPdfStrings } from './strings';

export function addLogo(doc: jsPDF) {
  doc.addImage(
    IPC_LOGO_BASE64,
    'PNG',
    PAGE_W - MARGIN - LOGO_W,
    8,
    LOGO_W,
    LOGO_H,
  );
}

export function addFooter(doc: jsPDF, pageNum: number, totalPages: number, locale: string) {
  const s = getPdfStrings(locale);
  // Detect page dimensions (handles both portrait and landscape pages)
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const y = pageH - 18;
  doc.setDrawColor(...C.mutedLight);
  doc.line(MARGIN, y, pageW - MARGIN, y);

  doc.setFontSize(6.5);
  doc.setTextColor(...C.muted);
  doc.text(s.footerTagline, MARGIN, y + 4);
  doc.text(s.footerDisclaimer, MARGIN, y + 7.5);
  doc.text('myflowcheck.com', MARGIN, y + 11);
  doc.text(s.page(pageNum, totalPages), pageW - MARGIN, y + 11, { align: 'right' });
}

export function sectionTitle(doc: jsPDF, text: string, y: number): number {
  doc.setFontSize(13);
  doc.setTextColor(...C.dark);
  doc.setFont('helvetica', 'bold');
  doc.text(text, MARGIN, y);
  doc.setFont('helvetica', 'normal');
  return y + 6;
}

export function dv(ml: number, state: DiaryState): number {
  return mlToDisplayVolume(ml, state.volumeUnit);
}
