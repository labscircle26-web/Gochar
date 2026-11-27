/** 30 MB per PDF. This is the only file-size ceiling. */
export const MAX_PDF_BYTES = 30 * 1024 * 1024;

export function pdfSizeError(size: number): string | null {
  if (!Number.isFinite(size) || size <= 0) return "Choose a PDF.";
  if (size > MAX_PDF_BYTES) return "PDF must be 30 MB or smaller.";
  return null;
}
