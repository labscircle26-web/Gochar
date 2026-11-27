import assert from "node:assert/strict";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { findPassages, indexBookPdf } from "./library.server.ts";
import type { Sql } from "../db.ts";

test("indexes extracted text and searches only matching pages", async () => {
  const pg = new PGlite();
  await pg.waitReady;
  await pg.exec(readFileSync("migrations/0004_astrology_library.sql", "utf8"));
  await pg.exec(readFileSync("migrations/0005_astrology_chunks.sql", "utf8"));
  await pg.exec(readFileSync("migrations/0006_ocr_pages.sql", "utf8"));
  const sentence = "The tenth lord placed in the eleventh house during Saturn mahadasha is discussed in this passage.";
  const stream = `BT (${sentence}) Tj ET`;
  const pdf = Buffer.from(`%PDF-1.4\n1 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream endobj\n%%EOF`);
  await pg.query(
    "insert into astrology_book (id, title, author, language, category, edition, notes, file_name, byte_size, status, pdf) values ($1,$2,$3,'','Classical Vedic Astrology','','','book.pdf',$4,'uploaded',$5)",
    ["book-1", "Test Book", "A Writer", pdf.length, pdf],
  );
  const sql = {
    query: async <T,>(text: string, params?: unknown[]) => (await pg.query(text, params)).rows as T[],
  } as unknown as Sql;
  await indexBookPdf(sql, "book-1", pdf);
  const status = await pg.query<{ status: string }>("select status, page_count from astrology_book where id = $1", ["book-1"]);
  assert.equal(status.rows[0]?.status, "ready");
  const hit = await findPassages(sql, "tenth lord eleventh", "");
  assert.equal(hit.length, 1);
  assert.equal(hit[0]?.title, "Test Book");
  assert.equal(hit[0]?.page, 1);
  assert.match(hit[0]?.body ?? "", /Saturn mahadasha/);
  const miss = await findPassages(sql, "marriage ceremony venue", "");
  assert.equal(miss.length, 0);
});
