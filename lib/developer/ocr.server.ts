import path from "node:path";
import type { Worker } from "tesseract.js";

let workerPromise: Promise<Worker> | null = null;
let queue: Promise<unknown> = Promise.resolve();

async function worker(): Promise<Worker> {
  workerPromise ??= (async () => {
    const { createWorker } = await import("tesseract.js");
    const dir = path.join(process.cwd(), "data", "tessdata");
    return createWorker("eng+hin+san", 1, { langPath: dir, cachePath: dir, gzip: false });
  })();
  return workerPromise;
}

/** Recognize one page image. Calls are serialized so a large book cannot start a second engine. */
export function recognizePage(png: Buffer): Promise<string> {
  const run = queue.then(async () => {
    const engine = await worker();
    const result = await engine.recognize(png);
    return result.data.text.replace(/\s+\n/g, "\n").replace(/[ \t]{2,}/g, " ").trim();
  });
  queue = run.then(() => undefined, () => undefined);
  return run;
}

export async function stopOcr(): Promise<void> {
  const current = workerPromise;
  workerPromise = null;
  queue = Promise.resolve();
  if (current) await (await current).terminate();
}
