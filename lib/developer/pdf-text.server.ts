import { inflateSync } from "node:zlib";

export type PdfPage = { page: number; text: string };

/** Pull visible text from a normal PDF. Scanned pages come back empty. */
export function extractPdfText(bytes: Uint8Array): { pages: PdfPage[]; warning: string | null } {
  const buf = Buffer.from(bytes);
  const pages: string[] = [];
  for (const stream of findStreams(buf)) {
    const text = textFromContent(stream.toString("latin1")).replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
    if (text.replace(/\s/g, "").length >= 12) pages.push(text);
  }
  const letters = pages.join("").replace(/[^A-Za-z\u0900-\u097F]/g, "").length;
  if (letters < 40) {
    return { pages: [], warning: "Almost no text was found. This PDF likely needs OCR, which is not available here." };
  }
  return { pages: pages.map((text, index) => ({ page: index + 1, text })), warning: null };
}

export function chunkPages(pages: PdfPage[], size = 900): { page: number; heading: string; body: string }[] {
  const chunks: { page: number; heading: string; body: string }[] = [];
  for (const page of pages) {
    const heading = (page.text.split("\n").find((line) => line.trim().length > 2) ?? "").trim().slice(0, 140);
    let start = 0;
    while (start < page.text.length) {
      const body = page.text.slice(start, start + size).trim();
      if (body.length >= 40) chunks.push({ page: page.page, heading, body });
      if (start + size >= page.text.length) break;
      start += size - 80;
    }
  }
  return chunks;
}

function findStreams(buf: Buffer): Buffer[] {
  const out: Buffer[] = [];
  const marker = Buffer.from("stream");
  let from = 0;
  while (from < buf.length) {
    const at = buf.indexOf(marker, from);
    if (at < 0) break;
    let start = at + marker.length;
    if (buf[start] === 13) start += 1;
    if (buf[start] === 10) start += 1;
    const end = buf.indexOf("endstream", start);
    if (end < 0) break;
    const dict = buf.subarray(Math.max(0, at - 500), at).toString("latin1");
    const raw = buf.subarray(start, end).subarray(0, Math.max(0, end - start - (buf[end - 1] === 10 ? 1 : 0)));
    try {
      out.push(/\/FlateDecode/.test(dict) ? inflateSync(raw) : raw);
    } catch {
      /* a damaged stream is skipped, not invented */
    }
    from = end + 9;
  }
  return out;
}

function textFromContent(content: string): string {
  const parts: string[] = [];
  const push = (value: string) => {
    const clean = value.replace(/\s+/g, " ").trim();
    if (clean) parts.push(clean);
  };
  for (const match of content.matchAll(/\[((?:\\.|[^\]])*)\]\s*TJ/g)) push(readArray(match[1] ?? ""));
  for (const match of content.matchAll(/\(((?:\\.|[^\\)])*)\)\s*Tj/g)) push(unescapePdf(match[1] ?? ""));
  for (const match of content.matchAll(/<([0-9A-Fa-f\s]+)>\s*Tj/g)) push(hexText(match[1] ?? ""));
  return parts.join(" ");
}

function readArray(body: string): string {
  const bits: string[] = [];
  for (const match of body.matchAll(/\(((?:\\.|[^\\)])*)\)/g)) bits.push(unescapePdf(match[1] ?? ""));
  for (const match of body.matchAll(/<([0-9A-Fa-f\s]+)>/g)) bits.push(hexText(match[1] ?? ""));
  return bits.join("");
}

function unescapePdf(value: string): string {
  let out = "";
  for (let i = 0; i < value.length; i += 1) {
    if (value[i] !== "\\") {
      out += value[i];
      continue;
    }
    const next = value[i + 1] ?? "";
    if (/[0-7]/.test(next)) {
      const octal = value.slice(i + 1, i + 4).match(/^[0-7]{1,3}/)?.[0] ?? next;
      out += String.fromCharCode(parseInt(octal, 8));
      i += octal.length;
      continue;
    }
    const named: Record<string, string> = { n: "\n", r: "\n", t: " ", b: "", f: "\n", "\\": "\\", "(": "(", ")": ")" };
    out += named[next] ?? next;
    i += 1;
  }
  return out;
}

function hexText(value: string): string {
  const hex = value.replace(/\s/g, "");
  if (hex.length < 2 || hex.length % 2 !== 0) return "";
  const bytes = Buffer.from(hex, "hex");
  if (bytes.length >= 4 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    const text = Buffer.from(bytes.subarray(2));
    text.swap16();
    return text.toString("utf16le");
  }
  const highZero = bytes.length >= 4 && bytes.length % 2 === 0 && [...bytes].every((byte, index) => index % 2 === 1 || byte === 0);
  if (highZero) {
    const text = Buffer.from(bytes);
    text.swap16();
    return text.toString("utf16le");
  }
  return bytes.toString("latin1");
}
