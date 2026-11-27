import assert from "node:assert/strict";
import { rmSync, statSync } from "node:fs";
import test from "node:test";
import { appendBookChunk, beginBookFile, bookFile } from "./storage.server.ts";

test("chunked uploads accept 5, 15, and 29 MB and reject more than 30 MB", () => {
  const mb = 1024 * 1024;
  for (const size of [5 * mb, 15 * mb, 29 * mb]) {
    const id = `size-${size}`;
    beginBookFile(id, size);
    const chunk = Buffer.alloc(mb, 1);
    let offset = 0;
    while (offset < size) {
      const slice = chunk.subarray(0, Math.min(mb, size - offset));
      offset = appendBookChunk(id, offset, slice, size);
    }
    assert.equal(statSync(bookFile(id)).size, size);
    rmSync(bookFile(id));
  }
  assert.throws(() => beginBookFile("too-big", 30 * mb + 1), /30 MB/);
});
