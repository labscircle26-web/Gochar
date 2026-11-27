import assert from "node:assert/strict";
import { deflateSync } from "node:zlib";
import test from "node:test";
import { chunkPages, extractPdfText } from "./pdf-text.server.ts";

test("extracts text from an uncompressed PDF", () => {
  const stream = "BT (The tenth lord placed in the eleventh house during Saturn mahadasha gives a career reading.) Tj ET";
  const pdf = Buffer.from(
    `%PDF-1.4\n1 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream endobj\n%%EOF`,
  );
  const extracted = extractPdfText(pdf);
  assert.equal(extracted.warning, null);
  assert.match(extracted.pages[0]?.text ?? "", /tenth lord placed in the eleventh house/);
  assert.ok(chunkPages(extracted.pages).length >= 1);
});

test("extracts text from a flate-compressed stream", () => {
  const plain = Buffer.from("BT (Saturn mahadasha and the tenth house describe profession and status for this native.) Tj ET");
  const compressed = deflateSync(plain);
  const dict = `<< /Filter /FlateDecode /Length ${compressed.length} >>`;
  const pdf = Buffer.concat([
    Buffer.from(`%PDF-1.4\n4 0 obj ${dict} stream\n`),
    compressed,
    Buffer.from("\nendstream endobj\n%%EOF"),
  ]);
  const extracted = extractPdfText(pdf);
  assert.match(extracted.pages[0]?.text ?? "", /Saturn mahadasha/);
});

test("a scanned-looking file is not marked as text", () => {
  const pdf = Buffer.from("%PDF-1.4\n1 0 obj << /Length 5 >> stream\nxxxxx\nendstream endobj\n%%EOF");
  const extracted = extractPdfText(pdf);
  assert.equal(extracted.pages.length, 0);
  assert.match(extracted.warning ?? "", /OCR/);
});
