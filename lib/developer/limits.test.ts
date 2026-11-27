import assert from "node:assert/strict";
import test from "node:test";
import { MAX_PDF_BYTES, pdfSizeError } from "./limits.ts";

test("30 MB is allowed and one byte over is rejected", () => {
  const mb = 1024 * 1024;
  for (const size of [5 * mb, 15 * mb, 29 * mb, MAX_PDF_BYTES]) {
    assert.equal(pdfSizeError(size), null);
  }
  assert.match(pdfSizeError(MAX_PDF_BYTES + 1) ?? "", /30 MB/);
  assert.equal(MAX_PDF_BYTES, 30 * mb);
});
