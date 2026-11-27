import * as mupdf from "mupdf";

export type RenderedPage = { page: number; text: string; image: Buffer | null };

/** Open a PDF with MuPDF. The caller must destroy the document. */
export function openPdf(bytes: Uint8Array): mupdf.Document {
  return mupdf.Document.openDocument(bytes, "application/pdf");
}

/**
 * Read one page. Digital text is returned alone.
 * A page without enough text is rendered to a PNG, including JPEG, inline, and form images.
 */
export function readPdfPage(doc: mupdf.Document, pageNumber: number): RenderedPage {
  const page = doc.loadPage(pageNumber - 1);
  try {
    const text = page.toStructuredText("preserve-whitespace").asText().replace(/\s+/g, " ").trim();
    const letters = text.replace(/[^\p{L}\p{N}]/gu, "").length;
    if (letters >= 40) return { page: pageNumber, text, image: null };
    const pixmap = page.toPixmap(mupdf.Matrix.scale(2, 2), mupdf.ColorSpace.DeviceRGB, false, true);
    try {
      return { page: pageNumber, text, image: Buffer.from(pixmap.asPNG()) };
    } finally {
      pixmap.destroy();
    }
  } finally {
    page.destroy();
  }
}
