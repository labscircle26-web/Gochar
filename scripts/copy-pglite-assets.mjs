import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";

const destDir = join(process.cwd(), ".vercel/output/functions/__server.func/_libs");
const srcDir = join(process.cwd(), "node_modules/@electric-sql/pglite/dist");
await mkdir(destDir, { recursive: true });
for (const name of ["pglite.data", "pglite.wasm", "initdb.wasm"]) {
  await copyFile(join(srcDir, name), join(destDir, name));
}
console.log("[pglite] copied wasm and data next to the server bundle");
