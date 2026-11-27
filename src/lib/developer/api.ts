import { createMiddleware, createServerFn } from "@tanstack/react-start";

const CATEGORIES = [
  "Classical Vedic Astrology",
  "Houses and Bhavas",
  "Planetary Interpretations",
  "Mahadasha and Antardasha",
  "Gochar and Transit",
  "Yogas",
  "Divisional Charts",
  "Ashtakavarga",
  "Nakshatras",
  "Predictive Astrology",
  "Other References",
] as const;

import { pdfSizeError } from "./limits";

const CHUNK_LIMIT = 768 * 1024;

export type BookCard = {
  id: string;
  title: string;
  author: string;
  language: string;
  category: string;
  edition: string;
  notes: string;
  fileName: string;
  byteSize: number;
  status: string;
  error: string | null;
  pageCount: number | null;
  createdAt: string;
};

export type DeveloperStatus = {
  signedIn: boolean;
  authorized: boolean;
  email: string | null;
};

const developerGate = createMiddleware({ type: "function" })
  .client(async ({ next }) => {
    const { getBearerToken } = await import("@/lib/auth/client");
    const saved = window.localStorage.getItem("gochar_dev") || window.sessionStorage.getItem("gochar_dev") || undefined;
    return next({ sendContext: { bearerToken: getBearerToken() ?? undefined, developerToken: saved } });
  })
  .server(async ({ next, context }) => {
    const { assertSameSiteRequest } = await import("@/lib/auth/isolation.server");
    const { getCookie } = await import("@tanstack/react-start/server");
    const { readDeveloperSession } = await import("./password.server");
    assertSameSiteRequest();
    const session = readDeveloperSession(getCookie("gochar_dev")) ?? readDeveloperSession(context.developerToken);
    return next({
      context: {
        signedIn: Boolean(session),
        authorized: Boolean(session),
        email: session?.email ?? null,
      },
    });
  });

function forbid(authorized: boolean) {
  if (!authorized) throw new Error("Forbidden");
}

function text(value: unknown, max: number): string {
  return String(value ?? "").trim().slice(0, max);
}

function categoryOf(value: unknown): string {
  const name = text(value, 80);
  return (CATEGORIES as readonly string[]).includes(name) ? name : "Other References";
}

function pdfBase64(value: unknown): string {
  const raw = String(value ?? "").replace(/\s/g, "");
  if (!raw) throw new Error("Choose a PDF.");
  if (raw.length > Math.ceil(30 * 1024 * 1024 / 3) * 4 + 16) throw new Error("PDF must be 30 MB or smaller.");
  return raw;
}

type BookInput = {
  title: string;
  author: string;
  language: string;
  category: string;
  edition: string;
  notes: string;
  fileName: string;
  pdfBase64: string;
};

function bookInput(value: unknown): BookInput {
  if (!value || typeof value !== "object") throw new Error("Invalid book.");
  const raw = value as Record<string, unknown>;
  const title = text(raw.title, 180);
  if (!title) throw new Error("Enter a book title.");
  const fileName = text(raw.fileName, 180) || "book.pdf";
  return {
    title,
    author: text(raw.author, 160),
    language: text(raw.language, 60),
    category: categoryOf(raw.category),
    edition: text(raw.edition, 160),
    notes: text(raw.notes, 1000),
    fileName: fileName.toLowerCase().endsWith(".pdf") ? fileName : `${fileName}.pdf`,
    pdfBase64: pdfBase64(raw.pdfBase64),
  };
}

function rowCard(row: Record<string, unknown>): BookCard {
  return {
    id: String(row.id),
    title: String(row.title),
    author: String(row.author ?? ""),
    language: String(row.language ?? ""),
    category: String(row.category),
    edition: String(row.edition ?? ""),
    notes: String(row.notes ?? ""),
    fileName: String(row.file_name),
    byteSize: Number(row.byte_size),
    status: String(row.status),
    error: row.error ? String(row.error) : null,
    pageCount: row.page_count == null ? null : Number(row.page_count),
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}

const CARD_SQL = `id, title, author, language, category, edition, notes, file_name, byte_size, status, error, page_count, created_at`;

export const developerLogin = createServerFn({ method: "POST" })
  .validator((value: unknown) => {
    if (!value || typeof value !== "object") throw new Error("Enter both the username and the password.");
    const raw = value as { email?: unknown; password?: unknown; remember?: unknown };
    return {
      email: text(raw.email, 180).toLowerCase(),
      password: String(raw.password ?? ""),
      remember: raw.remember === true,
    };
  })
  .handler(async ({ data }): Promise<{ ok: true; email: string; token: string }> => {
    const { assertSameSiteRequest } = await import("@/lib/auth/isolation.server");
    const { getRequest, setCookie } = await import("@tanstack/react-start/server");
    const { isDeveloperEmail } = await import("./access.server");
    const { developerPasswordMatches, signDeveloperSession } = await import("./password.server");
    assertSameSiteRequest();
    if (!data.email || !data.password) throw new Error("Enter both the username and the password.");
    const passwordOk = developerPasswordMatches(data.password);
    if (!isDeveloperEmail(data.email) || !passwordOk) throw new Error("Those details do not match the developer account.");
    const { token, maxAge } = signDeveloperSession(data.email, data.remember);
    const secure = getRequest()?.url.startsWith("https:") ?? false;
    setCookie("gochar_dev", token, { path: "/", httpOnly: true, sameSite: "lax", secure, maxAge });
    return { ok: true, email: data.email, token };
  });

export const developerLogout = createServerFn({ method: "POST" }).handler(async (): Promise<{ ok: true }> => {
  const { getRequest, setCookie } = await import("@tanstack/react-start/server");
  const secure = getRequest()?.url.startsWith("https:") ?? false;
  setCookie("gochar_dev", "", { path: "/", httpOnly: true, sameSite: "lax", secure, maxAge: 0 });
  return { ok: true };
});

export const developerStatus = createServerFn({ method: "GET" })
  .middleware([developerGate])
  .handler(async ({ context }): Promise<DeveloperStatus> => ({
    signedIn: context.signedIn,
    authorized: context.authorized,
    email: context.email,
  }));

export const listBooks = createServerFn({ method: "GET" })
  .middleware([developerGate])
  .handler(async ({ context }): Promise<BookCard[]> => {
    forbid(context.authorized);
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql.query<Record<string, unknown>>(`select ${CARD_SQL} from astrology_book order by created_at desc`);
    return rows.map(rowCard);
  });

export const uploadBook = createServerFn({ method: "POST" })
  .middleware([developerGate])
  .validator(bookInput)
  .handler(async ({ context, data }): Promise<BookCard> => {
    forbid(context.authorized);
    const bytes = decodePdf(data.pdfBase64);
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const id = crypto.randomUUID();
    const rows = await sql.query<Record<string, unknown>>(
      `insert into astrology_book
        (id, title, author, language, category, edition, notes, file_name, byte_size, status, pdf)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,'uploaded',$10)
       returning ${CARD_SQL}`,
      [id, data.title, data.author, data.language, data.category, data.edition, data.notes, data.fileName, bytes.byteLength, bytes],
    );
    const row = rows[0];
    if (!row) throw new Error("The book was not saved.");
    const { indexBookPdf } = await import("./library.server");
    await indexBookPdf(sql, id, bytes);
    const fresh = await sql.query<Record<string, unknown>>(`select ${CARD_SQL} from astrology_book where id = $1`, [id]);
    return rowCard(fresh[0] ?? row);
  });

export const replaceBook = createServerFn({ method: "POST" })
  .middleware([developerGate])
  .validator((value: unknown) => {
    if (!value || typeof value !== "object") throw new Error("Invalid book.");
    const raw = value as Record<string, unknown>;
    const id = text(raw.id, 80);
    if (!id) throw new Error("Missing book.");
    return { id, ...bookInput(value) };
  })
  .handler(async ({ context, data }): Promise<BookCard> => {
    forbid(context.authorized);
    const bytes = decodePdf(data.pdfBase64);
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql.query<Record<string, unknown>>(
      `update astrology_book
       set title = $2, author = $3, language = $4, category = $5, edition = $6, notes = $7,
           file_name = $8, byte_size = $9, status = 'uploaded', error = null, pdf = $10, updated_at = now()
       where id = $1
       returning ${CARD_SQL}`,
      [data.id, data.title, data.author, data.language, data.category, data.edition, data.notes, data.fileName, bytes.byteLength, bytes],
    );
    const row = rows[0];
    if (!row) throw new Error("That book was not found.");
    const { indexBookPdf } = await import("./library.server");
    await indexBookPdf(sql, data.id, bytes);
    const fresh = await sql.query<Record<string, unknown>>(`select ${CARD_SQL} from astrology_book where id = $1`, [data.id]);
    return rowCard(fresh[0] ?? row);
  });

export const deleteBook = createServerFn({ method: "POST" })
  .middleware([developerGate])
  .validator((value: unknown) => {
    const id = text(typeof value === "object" && value ? (value as { id?: unknown }).id : "", 80);
    if (!id) throw new Error("Missing book.");
    return { id };
  })
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    forbid(context.authorized);
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql.query("delete from astrology_book where id = $1", [data.id]);
    const { removeBookFile } = await import("./storage.server");
    removeBookFile(data.id);
    return { ok: true };
  });

export const reindexBook = createServerFn({ method: "POST" })
  .middleware([developerGate])
  .validator((value: unknown) => {
    const id = text(typeof value === "object" && value ? (value as { id?: unknown }).id : "", 80);
    if (!id) throw new Error("Missing book.");
    return { id };
  })
  .handler(async ({ context, data }): Promise<BookCard> => {
    forbid(context.authorized);
    const { getSql } = await import("@/lib/db");
    const { enqueueBookIndex } = await import("./library.server");
    const sql = await getSql();
    const stored = await sql.query<Record<string, unknown>>(`select ${CARD_SQL} from astrology_book where id = $1`, [data.id]);
    if (!stored[0]) throw new Error("That book was not found.");
    await sql.query("update astrology_book set status = 'extracting', error = null, updated_at = now() where id = $1", [data.id]);
    enqueueBookIndex(data.id);
    return rowCard({ ...stored[0], status: "extracting", error: null });
  });

export const searchBooks = createServerFn({ method: "POST" })
  .middleware([developerGate])
  .validator((value: unknown) => {
    if (!value || typeof value !== "object") throw new Error("Invalid search.");
    const raw = value as { query?: unknown; bookId?: unknown };
    const query = text(raw.query, 300);
    if ([...query].length < 2) throw new Error("Enter at least two letters.");
    return { query, bookId: text(raw.bookId, 80) };
  })
  .handler(async ({ context, data }) => {
    forbid(context.authorized);
    const { getSql } = await import("@/lib/db");
    const { findPassages } = await import("./library.server");
    const sql = await getSql();
    const passages = await findPassages(sql, data.query, data.bookId);
    return { bot: "reader" as const, passages, note: passages.length === 0 ? "The prediction reader found no stored page for these words." : null };
  });

export const readBook = createServerFn({ method: "POST" })
  .middleware([developerGate])
  .validator((value: unknown) => {
    const id = text(typeof value === "object" && value ? (value as { id?: unknown }).id : "", 80);
    if (!id) throw new Error("Missing book.");
    return { id };
  })
  .handler(async ({ context, data }): Promise<{ fileName: string; pdfBase64: string }> => {
    forbid(context.authorized);
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql.query<{ file_name: string; pdf: unknown }>("select file_name, pdf from astrology_book where id = $1", [data.id]);
    const row = rows[0];
    if (!row) throw new Error("That book was not found.");
    const { readBookFile } = await import("./storage.server");
    const stored = readBookFile(data.id);
    const bytes = stored ?? toBytes(row.pdf);
    return { fileName: row.file_name, pdfBase64: Buffer.from(bytes).toString("base64") };
  });

function decodePdf(value: string): Uint8Array {
  const bytes = Uint8Array.from(Buffer.from(value, "base64"));
  if (bytes.byteLength > 30 * 1024 * 1024) throw new Error("PDF must be 30 MB or smaller.");
  if (new TextDecoder().decode(bytes.subarray(0, 5)) !== "%PDF-") throw new Error("That file is not a PDF.");
  return bytes;
}

function toBytes(value: unknown): Uint8Array {
  if (value instanceof Uint8Array) return value;
  if (typeof value === "string") return Uint8Array.from(Buffer.from(value.replace(/^\\x/, ""), "hex"));
  throw new Error("The stored PDF could not be read.");
}

export const makerPassages = createServerFn({ method: "POST" })
  .middleware([developerGate])
  .validator((value: unknown) => {
    if (!value || typeof value !== "object") throw new Error("Invalid search.");
    const query = text((value as { query?: unknown }).query, 300);
    if ([...query].length < 2) throw new Error("Enter at least two letters.");
    return { query };
  })
  .handler(async ({ context, data }) => {
    forbid(context.authorized);
    const { getSql } = await import("@/lib/db");
    const { findPassages } = await import("./library.server");
    const passages = await findPassages(await getSql(), data.query, "");
    return {
      bot: "maker" as const,
      passages,
      note: passages.length === 0 ? "The prediction maker found no stored page for this condition." : null,
    };
  });

export const bookPages = createServerFn({ method: "POST" })
  .middleware([developerGate])
  .validator((value: unknown) => {
    const id = text(typeof value === "object" && value ? (value as { id?: unknown }).id : "", 80);
    if (!id) throw new Error("Missing book.");
    return { id };
  })
  .handler(async ({ context, data }) => {
    forbid(context.authorized);
    const { getSql } = await import("@/lib/db");
    const { listStoredPages } = await import("./library.server");
    return { pages: await listStoredPages(await getSql(), data.id) };
  });

export const beginBookUpload = createServerFn({ method: "POST" })
  .middleware([developerGate])
  .validator((value: unknown) => {
    if (!value || typeof value !== "object") throw new Error("Invalid book.");
    const raw = value as Record<string, unknown>;
    const byteSize = Number(raw.byteSize);
    const error = pdfSizeError(byteSize);
    if (error) throw new Error(error);
    const title = text(raw.title, 180);
    if (!title) throw new Error("Enter a book title.");
    const fileName = text(raw.fileName, 180) || "book.pdf";
    return {
      title,
      author: text(raw.author, 160),
      language: text(raw.language, 60),
      category: categoryOf(raw.category),
      edition: text(raw.edition, 160),
      notes: text(raw.notes, 1000),
      fileName: fileName.toLowerCase().endsWith(".pdf") ? fileName : `${fileName}.pdf`,
      byteSize,
    };
  })
  .handler(async ({ context, data }) => {
    forbid(context.authorized);
    const { getSql } = await import("@/lib/db");
    const { beginBookFile, bookFile } = await import("./storage.server");
    const sql = await getSql();
    const id = crypto.randomUUID();
    beginBookFile(id, data.byteSize);
    await sql.query(
      `insert into astrology_book
        (id, title, author, language, category, edition, notes, file_name, byte_size, status, storage_path)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,'uploaded',$10)`,
      [id, data.title, data.author, data.language, data.category, data.edition, data.notes, data.fileName, data.byteSize, bookFile(id)],
    );
    return { id, received: 0 };
  });

export const writeBookChunk = createServerFn({ method: "POST" })
  .middleware([developerGate])
  .validator((value: unknown) => {
    if (!value || typeof value !== "object") throw new Error("Invalid chunk.");
    const raw = value as { id?: unknown; offset?: unknown; pdfBase64?: unknown };
    const id = text(raw.id, 80);
    const offset = Number(raw.offset);
    const pdfBase64 = String(raw.pdfBase64 ?? "").replace(/\s/g, "");
    if (!id || !Number.isInteger(offset) || offset < 0 || !pdfBase64) throw new Error("Invalid chunk.");
    return { id, offset, pdfBase64 };
  })
  .handler(async ({ context, data }) => {
    forbid(context.authorized);
    const bytes = Uint8Array.from(Buffer.from(data.pdfBase64, "base64"));
    if (bytes.byteLength > CHUNK_LIMIT) throw new Error("Upload chunk is too large.");
    const { getSql } = await import("@/lib/db");
    const { appendBookChunk } = await import("./storage.server");
    const sql = await getSql();
    const rows = await sql.query<{ byte_size: number }>("select byte_size from astrology_book where id = $1", [data.id]);
    const declared = Number(rows[0]?.byte_size ?? 0);
    if (!declared) throw new Error("That upload was not found.");
    const received = appendBookChunk(data.id, data.offset, bytes, declared);
    return { received };
  });

export const finishBookUpload = createServerFn({ method: "POST" })
  .middleware([developerGate])
  .validator((value: unknown) => {
    const id = text(typeof value === "object" && value ? (value as { id?: unknown }).id : "", 80);
    if (!id) throw new Error("Missing book.");
    return { id };
  })
  .handler(async ({ context, data }): Promise<BookCard> => {
    forbid(context.authorized);
    const { getSql } = await import("@/lib/db");
    const { readBookFile, storedBookSize } = await import("./storage.server");
    const { enqueueBookIndex } = await import("./library.server");
    const sql = await getSql();
    const rows = await sql.query<Record<string, unknown>>(`select ${CARD_SQL} from astrology_book where id = $1`, [data.id]);
    const row = rows[0];
    if (!row) throw new Error("That upload was not found.");
    const size = storedBookSize(data.id);
    if (size !== Number(row.byte_size)) throw new Error(`Upload interrupted at ${size} of ${row.byte_size} bytes. Retry to continue.`);
    const file = readBookFile(data.id);
    if (!file || new TextDecoder().decode(file.subarray(0, 5)) !== "%PDF-") throw new Error("That file is not a PDF.");
    await sql.query("update astrology_book set status = 'extracting', error = null, updated_at = now() where id = $1", [data.id]);
    enqueueBookIndex(data.id);
    return rowCard({ ...row, status: "extracting", error: null });
  });

export const bookUploadProgress = createServerFn({ method: "POST" })
  .middleware([developerGate])
  .validator((value: unknown) => {
    const id = text(typeof value === "object" && value ? (value as { id?: unknown }).id : "", 80);
    if (!id) throw new Error("Missing book.");
    return { id };
  })
  .handler(async ({ context, data }) => {
    forbid(context.authorized);
    const { storedBookSize } = await import("./storage.server");
    return { received: storedBookSize(data.id) };
  });

export const BOOK_CATEGORIES = CATEGORIES;
