import type { Sql } from "@/lib/db";
import { chunkPages, extractPdfText } from "./pdf-text.server.ts";

export type Passage = {
  bookId: string;
  title: string;
  author: string;
  fileName: string;
  page: number;
  heading: string;
  body: string;
};

export type StoredPage = { page: number; source: string; body: string };

const running = new Set<string>();

export async function enqueueBookIndex(id: string): Promise<void> {
  if (running.has(id)) return;
  running.add(id);
  try {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    // PDF bytes live in Postgres so every serverless instance reads the same
    // durable source; never depend on instance-local filesystem state.
    const bytes = await bytesFromRow(sql, id);
    await indexBookPdf(sql, id, bytes);
  } catch (error) {
    try {
      const { getSql } = await import("@/lib/db");
      const sql = await getSql();
      const message = error instanceof Error ? error.message : "The PDF could not be processed.";
      await sql.query("update astrology_book set status = 'failed', error = $2, updated_at = now() where id = $1", [id, message.slice(0, 500)]);
    } catch {
      /* the processing row stays failed on the next status read */
    }
  } finally {
    running.delete(id);
  }
}

export async function indexBookPdf(sql: Sql, id: string, bytes: Uint8Array): Promise<void> {
  await sql.query("update astrology_book set status = 'extracting', error = null, updated_at = now() where id = $1", [id]);
  try {
    const kept = await sql.query<{ page: number; source: string; body: string }>("select page, source, body from astrology_page where book_id = $1 order by page", [id]);
    const done = new Set(kept.map((row) => Number(row.page)));
    let sawOcr = kept.some((row) => row.source === "ocr");
    const problems: string[] = [];
    const { openPdf, readPdfPage } = await import("./pdf-pages.server.ts");
    let doc: ReturnType<typeof openPdf> | null = null;
    try {
      doc = openPdf(bytes);
    } catch {
      doc = null;
    }
    if (doc) {
      try {
        const count = doc.countPages();
        for (let number = 1; number <= count; number += 1) {
          if (done.has(number)) continue;
          let rendered: { page: number; text: string; image: Buffer | null };
          try {
            rendered = readPdfPage(doc, number);
          } catch (error) {
            problems.push(`Page ${number} could not be rendered. ${error instanceof Error ? error.message : "Unknown render error."}`);
            continue;
          }
          const letters = rendered.text.replace(/[^\p{L}\p{N}]/gu, "").length;
          let source = "digital";
          let body = rendered.text;
          if (letters < 40) {
            if (!rendered.image) continue;
            sawOcr = true;
            await sql.query("update astrology_book set status = 'ocr', error = $2, updated_at = now() where id = $1", [id, `OCR page ${number} of ${count}`]);
            const { recognizePage } = await import("./ocr.server.ts");
            try {
              body = await recognizePage(rendered.image);
            } catch (error) {
              problems.push(`Page ${number} OCR failed. ${error instanceof Error ? error.message : "Unknown OCR error."}`);
              continue;
            }
            source = "ocr";
          } else {
            await sql.query("update astrology_book set status = 'extracting', error = $2, updated_at = now() where id = $1", [id, `Reading page ${number} of ${count}`]);
          }
          if (body.replace(/\s/g, "").length < 20) {
            problems.push(`Page ${number} had no readable text.`);
            continue;
          }
          await sql.query("insert into astrology_page (book_id, page, source, body) values ($1, $2, $3, $4)", [id, rendered.page, source, body]);
          done.add(number);
        }
      } finally {
        doc.destroy();
      }
    }
    for (const page of extractPdfText(bytes).pages) {
      if (done.has(page.page) || page.text.replace(/\s/g, "").length < 20) continue;
      await sql.query("insert into astrology_page (book_id, page, source, body) values ($1, $2, 'digital', $3)", [id, page.page, page.text]);
      done.add(page.page);
    }
    const pages = await sql.query<{ page: number; body: string }>("select page, body from astrology_page where book_id = $1 order by page", [id]);
    await sql.query("delete from astrology_chunk where book_id = $1", [id]);
    const chunks = chunkPages(pages.map((row) => ({ page: Number(row.page), text: String(row.body) })));
    if (chunks.length === 0) {
      await sql.query(
        "update astrology_book set status = 'failed', error = $2, page_count = $3, updated_at = now() where id = $1",
        [id, problems[0] ?? (sawOcr ? "OCR ran, but no readable text was found." : "No digital text was found and the page could not be rendered."), pages.length],
      );
      return;
    }
    for (const chunk of chunks) {
      await sql.query("insert into astrology_chunk (book_id, page, heading, body) values ($1, $2, $3, $4)", [id, chunk.page, chunk.heading, chunk.body]);
    }
    await sql.query("update astrology_book set status = 'ready', error = null, page_count = $2, updated_at = now() where id = $1", [id, pages.length]);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Text extraction failed.";
    await sql.query("update astrology_book set status = 'failed', error = $2, updated_at = now() where id = $1", [id, message.slice(0, 500)]);
  }
}

async function bytesFromRow(sql: Sql, id: string): Promise<Uint8Array> {
  const rows = await sql.query<{ pdf: unknown }>("select pdf from astrology_book where id = $1", [id]);
  const pdf = rows[0]?.pdf;
  if (pdf instanceof Uint8Array) return pdf;
  if (typeof pdf === "string") return Uint8Array.from(Buffer.from(pdf.replace(/^\\x/, ""), "hex"));
  throw new Error("The stored PDF could not be read.");
}

export async function findPassages(sql: Sql, query: string, bookId: string): Promise<Passage[]> {
  const terms = searchTerms(query);
  if (terms.length === 0) return [];
  const params: unknown[] = [];
  const clauses = terms.map((term) => {
    params.push(`%${term.replace(/[\\%_]/g, "")}%`);
    return `lower(c.body) like $${params.length}`;
  });
  let bookClause = "";
  if (bookId) {
    params.push(bookId);
    bookClause = ` and c.book_id = $${params.length}`;
  }
  const rows = await sql.query<Record<string, unknown>>(
    `select c.book_id, b.title, b.author, b.file_name, c.page, c.heading, c.body
     from astrology_chunk c
     join astrology_book b on b.id = c.book_id
     where b.status = 'ready'${bookClause} and ${clauses.join(" and ")}
     order by c.page
     limit 12`,
    params,
  );
  return rows.map((row) => ({
    bookId: String(row.book_id),
    title: String(row.title),
    author: String(row.author ?? ""),
    fileName: String(row.file_name ?? ""),
    page: Number(row.page),
    heading: String(row.heading ?? ""),
    body: String(row.body),
  }));
}

export function searchTerms(query: string): string[] {
  return [...new Set(query.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((term) => term.length >= (/\p{Script=Latin}/u.test(term) ? 3 : 2)))].slice(0, 8);
}

export async function listStoredPages(sql: Sql, id: string): Promise<StoredPage[]> {
  const rows = await sql.query<{ page: number; source: string; body: string }>("select page, source, body from astrology_page where book_id = $1 order by page", [id]);
  return rows.map((row) => ({ page: Number(row.page), source: String(row.source), body: String(row.body) }));
}
