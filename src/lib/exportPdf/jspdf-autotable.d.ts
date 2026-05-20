/**
 * Module augmentation for `jspdf-autotable`.
 *
 * `jspdf-autotable` v5 attaches `lastAutoTable` onto the `jsPDF` instance
 * at runtime (call to `autoTable(doc, ...)` populates `doc.lastAutoTable`),
 * but the package's TypeScript types do NOT declare this property. Without
 * the augmentation below, every read of `doc.lastAutoTable.finalY` requires
 * a `@ts-expect-error` suppression.
 *
 * Declaring it here once removes the 4 suppressions across the multi-page
 * PDF generator.
 */
import 'jspdf';

declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: {
      finalY: number;
    };
  }
}
