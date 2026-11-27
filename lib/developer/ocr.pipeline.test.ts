import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import test from "node:test";
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { PGlite } from "@electric-sql/pglite";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { findPassages, indexBookPdf } from "./library.server.ts";
import { stopOcr } from "./ocr.server.ts";
import type { Sql } from "../db.ts";

test("digital text is stored without OCR, and scanned, JPEG, form, and inline pages are recognized", { timeout: 180_000 }, async () => {
  try {
  GlobalFonts.registerFromPath("/usr/share/fonts/opentype/unifont/unifont.otf", "Unifont");
  const canvas = createCanvas(1000, 240);
  const draw = canvas.getContext("2d");
  draw.fillStyle = "white";
  draw.fillRect(0, 0, 1000, 240);
  draw.fillStyle = "black";
  draw.font = "40px Unifont";
  draw.fillText("Saturn mahadasha tenth house", 20, 80);
  draw.fillText("शनि गोचर दशम भाव", 20, 160);
  const png = canvas.toBuffer("image/png");
  const jpeg = canvas.toBuffer("image/jpeg");
  const pixels = draw.getImageData(0, 0, 1000, 240).data;
  const rgb = Buffer.alloc(1000 * 240 * 3);
  for (let from = 0, to = 0; from < pixels.length; from += 4, to += 3) {
    rgb[to] = pixels[from]!;
    rgb[to + 1] = pixels[from + 1]!;
    rgb[to + 2] = pixels[from + 2]!;
  }

  const digital = await PDFDocument.create();
  const font = await digital.embedFont(StandardFonts.Helvetica);
  const textPage = digital.addPage([500, 200]);
  textPage.drawText("The tenth lord placed in the eleventh house during Saturn mahadasha.", { x: 24, y: 100, size: 12, font });
  const digitalBytes = new Uint8Array(await digital.save());

  const scanned = await PDFDocument.create();
  const image = await scanned.embedPng(png);
  const imagePage = scanned.addPage([520, 280]);
  imagePage.drawImage(image, { x: 10, y: 20, width: 500, height: 120 });
  const scannedBytes = new Uint8Array(await scanned.save());

  const jpegDoc = await PDFDocument.create();
  const jpegPage = jpegDoc.addPage([520, 280]);
  const jpegImage = await jpegDoc.embedJpg(jpeg);
  jpegPage.drawImage(jpegImage, { x: 10, y: 20, width: 500, height: 120 });
  const jpegBytes = new Uint8Array(await jpegDoc.save());
  const small = createCanvas(480, 140);
  const smallDraw = small.getContext("2d");
  smallDraw.fillStyle = "white";
  smallDraw.fillRect(0, 0, 480, 140);
  smallDraw.fillStyle = "black";
  smallDraw.font = "28px Unifont";
  smallDraw.fillText("Saturn mahadasha tenth house", 8, 50);
  smallDraw.fillText("शनि गोचर दशम भाव", 8, 100);
  const smallPixels = smallDraw.getImageData(0, 0, 480, 140).data;
  const smallRgb = Buffer.alloc(480 * 140 * 3);
  for (let from = 0, to = 0; from < smallPixels.length; from += 4, to += 3) {
    smallRgb[to] = smallPixels[from]!;
    smallRgb[to + 1] = smallPixels[from + 1]!;
    smallRgb[to + 2] = smallPixels[from + 2]!;
  }
  const wrappedBytes = wrappedImagePdf(smallRgb, 480, 140);

  const pg = new PGlite();
  await pg.waitReady;
  await pg.exec(readFileSync("migrations/0004_astrology_library.sql", "utf8"));
  await pg.exec(readFileSync("migrations/0005_astrology_chunks.sql", "utf8"));
  await pg.exec(readFileSync("migrations/0006_ocr_pages.sql", "utf8"));
  const sql = {
    query: async <T,>(text: string, params?: unknown[]) => (await pg.query(text, params)).rows as T[],
  } as unknown as Sql;

  async function store(id: string, fileName: string, bytes: Uint8Array) {
    await pg.query(
      "insert into astrology_book (id, title, author, language, category, edition, notes, file_name, byte_size, status, pdf) values ($1,$2,$3,'','Gochar and Transit','','',$4,$5,'uploaded',$6)",
      [id, fileName, "Writer", fileName, bytes.byteLength, bytes],
    );
    await indexBookPdf(sql, id, bytes);
  }

  await store("digital", "digital.pdf", digitalBytes);
  const digitalStatus = await pg.query<{ status: string; source: string }>("select b.status, p.source from astrology_book b join astrology_page p on p.book_id = b.id where b.id = 'digital'");
  assert.equal(digitalStatus.rows[0]?.status, "ready");
  assert.equal(digitalStatus.rows[0]?.source, "digital");

  await store("scanned", "scanned.pdf", scannedBytes);
  const scannedPage = await pg.query<{ source: string; body: string; status: string }>("select p.source, p.body, b.status from astrology_page p join astrology_book b on b.id = p.book_id where p.book_id = 'scanned'");
  assert.equal(scannedPage.rows[0]?.status, "ready");
  assert.equal(scannedPage.rows[0]?.source, "ocr");
  assert.match(scannedPage.rows[0]?.body ?? "", /गोचर|दशम|Saturn/);

  await store("jpeg", "jpeg.pdf", jpegBytes);
  const jpegPageRow = await pg.query<{ source: string; body: string; status: string }>("select p.source, p.body, b.status from astrology_page p join astrology_book b on b.id = p.book_id where p.book_id = 'jpeg'");
  assert.equal(jpegPageRow.rows[0]?.status, "ready");
  assert.equal(jpegPageRow.rows[0]?.source, "ocr");
  assert.match(jpegPageRow.rows[0]?.body ?? "", /गोचर|दशम|Saturn/);

  await store("wrapped", "wrapped.pdf", wrappedBytes);
  const wrapped = await pg.query<{ page: number; source: string; body: string; status: string }>("select p.page, p.source, p.body, b.status from astrology_page p join astrology_book b on b.id = p.book_id where p.book_id = 'wrapped' order by p.page");
  assert.equal(wrapped.rows.length, 2);
  assert.equal(wrapped.rows[0]?.status, "ready");
  assert.equal(wrapped.rows[0]?.source, "ocr");
  assert.equal(wrapped.rows[1]?.source, "ocr");
  assert.match(wrapped.rows[0]?.body ?? "", /गोचर|दशम|Saturn/);
  assert.match(wrapped.rows[1]?.body ?? "", /गोचर|दशम|Saturn/);

  const reader = await findPassages(sql, "tenth lord eleventh", "");
  const maker = await findPassages(sql, "गोचर", "");
  assert.equal(reader[0]?.fileName, "digital.pdf");
  assert.equal(reader[0]?.page, 1);
  assert.equal(maker.some((passage) => passage.fileName === "scanned.pdf" && passage.page === 1), true);
  assert.equal(maker.some((passage) => passage.fileName === "jpeg.pdf"), true);
  assert.equal(maker.some((passage) => passage.fileName === "wrapped.pdf"), true);

  await indexBookPdf(sql, "scanned", scannedBytes);
  const again = await pg.query<{ body: string }>("select body from astrology_page where book_id = 'scanned'");
  assert.equal(again.rows.length, 1);
  assert.equal(again.rows[0]?.body, scannedPage.rows[0]?.body);
  } finally {
    await stopOcr();
  }
});

function wrappedImagePdf(rgb: Buffer, width: number, height: number): Uint8Array {
  const image = deflateSync(rgb);
  const formOps = Buffer.from(`q ${width} 0 0 ${height} 0 0 cm /Im0 Do Q`);
  const pageOps = Buffer.from("q /Fm0 Do Q\n");
  const inline = Buffer.concat([
    Buffer.from(`q ${width} 0 0 ${height} 0 0 cm\nBI\n/W ${width} /H ${height} /CS /RGB /BPC 8 /F /AHx\nID\n`),
    Buffer.from(rgb.toString("hex")),
    Buffer.from(">\nEI\nQ\n"),
  ]);
  const objects = [
    Buffer.from("<< /Type /Catalog /Pages 2 0 R >>"),
    Buffer.from("<< /Type /Pages /Count 2 /Kids [3 0 R 4 0 R] >>"),
    Buffer.from(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /XObject << /Fm0 5 0 R >> >> /Contents 7 0 R >>`),
    Buffer.from(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Contents 8 0 R >>`),
    Buffer.concat([Buffer.from(`<< /Type /XObject /Subtype /Form /BBox [0 0 ${width} ${height}] /Resources << /XObject << /Im0 6 0 R >> >> /Length ${formOps.length} >>\nstream\n`), formOps, Buffer.from("\nendstream")]),
    Buffer.concat([Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length ${image.length} >>\nstream\n`), image, Buffer.from("\nendstream")]),
    Buffer.concat([Buffer.from(`<< /Length ${pageOps.length} >>\nstream\n`), pageOps, Buffer.from("\nendstream")]),
    Buffer.concat([Buffer.from(`<< /Length ${inline.length} >>\nstream\n`), inline, Buffer.from("\nendstream")]),
  ];
  let out = Buffer.from("%PDF-1.4\n");
  const offsets = [0];
  objects.forEach((body, index) => {
    offsets.push(out.length);
    out = Buffer.concat([out, Buffer.from(`${index + 1} 0 obj\n`), body, Buffer.from("\nendobj\n")]);
  });
  const xrefAt = out.length;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index < offsets.length; index += 1) xref += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  return new Uint8Array(Buffer.concat([out, Buffer.from(`${xref}trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF`)]));
}
