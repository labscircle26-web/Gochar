import { appendFileSync, existsSync, mkdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pdfSizeError } from "./limits.ts";

const root = path.join(process.cwd(), "data", "library");

export function bookFile(id: string): string {
  if (!/^[\w-]+$/.test(id)) throw new Error("Invalid book.");
  mkdirSync(root, { recursive: true });
  return path.join(root, `${id}.pdf`);
}

export function beginBookFile(id: string, declaredSize: number): void {
  const error = pdfSizeError(declaredSize);
  if (error) throw new Error(error);
  writeFileSync(bookFile(id), Buffer.alloc(0));
}

export function appendBookChunk(id: string, offset: number, bytes: Uint8Array, declaredSize: number): number {
  const file = bookFile(id);
  const received = existsSync(file) ? statSync(file).size : 0;
  if (offset !== received) throw new Error(`Resume this upload from byte ${received}.`);
  if (received + bytes.byteLength > declaredSize) throw new Error("The upload is larger than the file that was started.");
  const error = pdfSizeError(declaredSize);
  if (error) throw new Error(error);
  appendFileSync(file, bytes);
  return received + bytes.byteLength;
}

export function storedBookSize(id: string): number {
  const file = bookFile(id);
  return existsSync(file) ? statSync(file).size : 0;
}

export function readBookFile(id: string): Uint8Array | null {
  const file = bookFile(id);
  if (!existsSync(file)) return null;
  return readFileSync(file);
}

export function removeBookFile(id: string): void {
  const file = bookFile(id);
  if (existsSync(file)) unlinkSync(file);
}
