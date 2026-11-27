import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  BOOK_CATEGORIES,
  beginBookUpload,
  bookPages,
  bookUploadProgress,
  deleteBook,
  developerLogin,
  developerLogout,
  developerStatus,
  finishBookUpload,
  listBooks,
  makerPassages,
  readBook,
  reindexBook,
  searchBooks,
  writeBookChunk,
  type BookCard,
  type DeveloperStatus,
} from "@/lib/developer/api";
import { pdfSizeError } from "@/lib/developer/limits";

const SECTIONS = [
  ["library", "PDF Library"],
  ["status", "Processing"],
  ["search", "Knowledge Search"],
  ["reader", "Prediction Reader"],
  ["maker", "Prediction Maker"],
  ["testing", "Prediction Testing"],
  ["diagnostics", "Diagnostics"],
  ["settings", "Settings"],
] as const;

type SectionId = (typeof SECTIONS)[number][0];

const LATER: Record<"maker" | "diagnostics" | "settings", string> = {
  maker: "House readings now run on Birth Charts from the calculated chart. This console does not invent a second chart.",
  diagnostics: "Planetary positions still come from the existing astronomy engine. This page does not recalculate them.",
  settings: "Developer access is an email allowlist checked on the server. There is no public registration.",
};

export function DeveloperConsole() {
  const [status, setStatus] = useState<DeveloperStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [section, setSection] = useState<SectionId>("library");

  useEffect(() => {
    let cancel = false;
    developerStatus()
      .then((next) => {
        if (!cancel) setStatus(next);
      })
      .catch((reason: unknown) => {
        if (!cancel) setError(reason instanceof Error ? reason.message : "The developer session could not be checked.");
      });
    return () => {
      cancel = true;
    };
  }, []);

  return (
    <main className="gochar-page mx-auto min-h-screen w-full max-w-5xl px-4 py-5">
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-seal">Private</p>
          <h1 className="font-display text-4xl leading-none">Developer</h1>
        </div>
        <div className="flex items-center gap-2">
          {status?.authorized ? (
            <button
              type="button"
              className="h-10 rounded-md border border-line px-3 text-xs text-muted"
              onClick={() => {
                window.localStorage.removeItem("gochar_dev");
                window.sessionStorage.removeItem("gochar_dev");
                void developerLogout().finally(() => setStatus({ signedIn: false, authorized: false, email: null }));
              }}
            >
              Log out
            </button>
          ) : null}
          <Link to="/" className="inline-flex h-10 items-center rounded-md border border-[rgb(240_193_78_/_0.35)] px-3 text-xs text-seal">
            Gochar
          </Link>
        </div>
      </header>

      {status?.authorized ? (
        <div className="mt-6 grid gap-4 md:grid-cols-[13rem_1fr]">
          <nav className="flex gap-2 overflow-x-auto md:flex-col" data-no-swipe>
            {SECTIONS.map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`shrink-0 rounded-md border px-3 py-2 text-left text-sm ${section === id ? "border-[rgb(240_193_78_/_0.55)] text-seal" : "border-line text-muted"}`}
                onClick={() => setSection(id)}
              >
                {label}
              </button>
            ))}
          </nav>
          <section className="min-w-0">
            {section === "library" ? <Library /> : null}
            {section === "status" ? <Processing /> : null}
            {section === "search" || section === "reader" ? <Reader /> : null}
            {section === "testing" ? <Testing /> : null}
            {section === "maker" ? <MakerLookup /> : null}
            {section === "diagnostics" || section === "settings" ? <LaterNote text={LATER[section]} /> : null}
          </section>
        </div>
      ) : (
        <DeveloperLogin
          onSuccess={(email) => setStatus({ signedIn: true, authorized: true, email })}
        />
      )}
    </main>
  );
}

function DeveloperLogin({ onSuccess }: { onSuccess: (email: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <section className="mx-auto mt-8 w-full max-w-md border border-[rgb(237_196_81_/_0.45)] bg-[rgb(8_12_22_/_0.92)] px-4 py-5">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-display text-4xl leading-none text-[#f7f1e4]">Developer Login</h2>
        <Link to="/" className="inline-flex h-10 items-center rounded-md border border-[rgb(237_196_81_/_0.45)] px-3 text-xs text-[#edc451]">
          Close
        </Link>
      </div>
      <form
        className="mt-5 grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!email.trim() || !password) {
            setError("Enter both the username and the password.");
            return;
          }
          setBusy(true);
          setError(null);
          developerLogin({ data: { email, password, remember } })
            .then((result) => {
              if (remember) {
                window.localStorage.setItem("gochar_dev", result.token);
                window.sessionStorage.removeItem("gochar_dev");
              } else {
                window.sessionStorage.setItem("gochar_dev", result.token);
                window.localStorage.removeItem("gochar_dev");
              }
              onSuccess(result.email);
            })
            .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Those details do not match the developer account."))
            .finally(() => setBusy(false));
        }}
      >
        <label className="grid gap-1 text-sm text-[#edc451]" htmlFor="developer-email">
          Username / Email
          <input
            id="developer-email"
            name="email"
            type="text"
            autoComplete="username"
            placeholder="name@email.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-12 rounded-md border border-[rgb(237_196_81_/_0.45)] bg-[rgb(14_20_34)] px-3 text-base text-[#f7f1e4] placeholder:text-[#c9bfa6]"
          />
        </label>
        <label className="grid gap-1 text-sm text-[#edc451]" htmlFor="developer-password">
          Password
          <span className="flex gap-2">
            <input
              id="developer-password"
              name="password"
              type={show ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-12 min-w-0 flex-1 rounded-md border border-[rgb(237_196_81_/_0.45)] bg-[rgb(14_20_34)] px-3 text-base text-[#f7f1e4] placeholder:text-[#c9bfa6]"
            />
            <button type="button" className="h-12 shrink-0 rounded-md border border-[rgb(237_196_81_/_0.45)] px-3 text-xs text-[#f7f1e4]" onClick={() => setShow((value) => !value)}>
              {show ? "Hide" : "Show"}
            </button>
          </span>
        </label>
        <label className="flex items-center gap-2 text-sm text-[#f7f1e4]">
          <input id="developer-remember" type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
          Remember me
        </label>
        {error ? <p className="text-sm text-[#edc451]">{error}</p> : null}
        <button type="submit" className="h-12 rounded-md bg-[#edc451] text-base font-semibold text-[#1c1406] disabled:opacity-60" disabled={busy}>
          {busy ? "Checking…" : "Login"}
        </button>
      </form>
    </section>
  );
}

function LaterNote({ text }: { text: string }) {
  return (
    <div className="border border-line bg-card px-4 py-4">
      <p className="text-sm text-ink">{text}</p>
      <p className="mt-2 text-xs text-muted">Not implemented in this phase.</p>
    </div>
  );
}

function Library() {
  const [books, setBooks] = useState<BookCard[] | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);

  async function refresh() {
    setBooks(await listBooks());
  }

  useEffect(() => {
    refresh().catch((reason: unknown) => setNote(reason instanceof Error ? reason.message : "The library could not be read."));
  }, []);

  useEffect(() => {
    if (!books?.some((book) => book.status === "extracting" || book.status === "ocr")) return;
    const timer = window.setInterval(() => {
      refresh().catch(() => undefined);
    }, 2000);
    return () => window.clearInterval(timer);
  }, [books]);

  return (
    <div>
      <BookForm
        busy={busy}
        progress={progress}
        onSubmit={async (files, meta) => {
          setBusy(true);
          setNote(null);
          try {
            for (const file of files) {
              const problem = pdfSizeError(file.size);
              if (problem) throw new Error(`${file.name}: ${problem}`);
              await sendPdf(file, meta, (percent) => setProgress(`${file.name} ${percent}% · ${formatBytes(file.size)}`));
            }
            await refresh();
            setNote("Uploaded. Text extraction and OCR continue in the background.");
          } catch (reason) {
            setNote(reason instanceof Error ? reason.message : "Upload failed.");
          } finally {
            setProgress(null);
            setBusy(false);
          }
        }}
      />
      {note ? <p className="mt-3 text-sm text-muted">{note}</p> : null}
      <ul className="mt-4 grid gap-3">
        {(books ?? []).map((book) => (
          <li key={book.id} className="border border-line bg-card px-3 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate font-display text-2xl leading-none">{book.title}</h3>
                <p className="mt-1 text-sm text-muted">{book.author || "Author not set"} · {book.category}</p>
              </div>
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-seal">{statusLabel(book.status)}</span>
            </div>
            <p className="mt-2 text-xs text-muted">
              {book.language || "Language not set"} · {formatBytes(book.byteSize)} · {book.pageCount == null ? "pages not counted" : `${book.pageCount} text pages`} · {new Date(book.createdAt).toLocaleDateString("en-GB")}
            </p>
            {book.edition ? <p className="mt-1 text-xs text-muted">{book.edition}</p> : null}
            {book.notes ? <p className="mt-1 text-xs text-ink">{book.notes}</p> : null}
            {book.error ? <p className="mt-1 text-xs text-seal">{book.error}</p> : null}
            <div className="mt-3 flex gap-2">
              <button type="button" className="h-9 rounded-md border border-line px-3 text-xs" onClick={() => void viewPdf(book, setNote)}>
                View
              </button>
              <button type="button" className="h-9 rounded-md border border-line px-3 text-xs" onClick={() => void previewText(book.id, setNote)}>
                Text
              </button>
              <button
                type="button"
                className="h-9 rounded-md border border-line px-3 text-xs text-muted"
                onClick={() => {
                  if (!window.confirm(`Delete ${book.title}?`)) return;
                  deleteBook({ data: { id: book.id } })
                    .then(refresh)
                    .catch((reason: unknown) => setNote(reason instanceof Error ? reason.message : "Delete failed."));
                }}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
      {books && books.length === 0 ? <p className="mt-4 text-sm text-muted">No books yet.</p> : null}
    </div>
  );
}

function Processing() {
  const [books, setBooks] = useState<BookCard[] | null>(null);
  useEffect(() => {
    listBooks().then(setBooks).catch(() => setBooks([]));
  }, []);
  return (
    <div className="border border-line bg-card px-4 py-4">
      <p className="text-sm text-ink">Digital pages are extracted directly. Scanned pages are recognized once, then stored. A book is completed only after that text can be searched.</p>
      <ul className="mt-3 grid gap-2">
        {(books ?? []).map((book) => (
          <li key={book.id} className="flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 truncate">{book.title}{book.error ? ` — ${book.error}` : ""}</span>
            <span className="flex shrink-0 items-center gap-2">
              <span className="text-seal">{statusLabel(book.status)}</span>
              {book.status === "failed" || book.status === "ocr_required" ? (
                <button type="button" className="h-8 rounded-md border border-line px-2 text-xs" onClick={() => void reindexBook({ data: { id: book.id } }).then(() => listBooks().then(setBooks))}>
                  Retry OCR
                </button>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
      {books && books.length === 0 ? <p className="mt-3 text-sm text-muted">No files are processing.</p> : null}
    </div>
  );
}

function Reader({ endpoint = "reader" }: { endpoint?: "reader" | "maker" }) {
  const [query, setQuery] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [passages, setPassages] = useState<Passage[] | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div>
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setNote(null);
          const request = endpoint === "maker" ? makerPassages({ data: { query } }) : searchBooks({ data: { query, bookId: "" } });
          request
            .then((result) => {
              setPassages(result.passages);
              setNote(result.note);
              setOpen(null);
            })
            .catch((reason: unknown) => setNote(reason instanceof Error ? reason.message : "Search failed."));
        }}
      >
        <input className={`${field} min-w-0 flex-1`} value={query} placeholder={endpoint === "maker" ? "Ask the prediction maker" : "Search uploaded pages"} onChange={(event) => setQuery(event.target.value)} />
        <button type="submit" className="h-10 shrink-0 rounded-md bg-seal px-3 text-sm font-semibold text-seal-ink">Search</button>
      </form>
      {note ? <p className="mt-3 text-sm text-muted">{note}</p> : null}
      <ul className="mt-3 grid gap-2">
        {(passages ?? []).map((passage, index) => (
          <li key={`${passage.bookId}-${passage.page}-${index}`} className="border border-line bg-card px-3 py-2">
            <p className="text-sm text-ink">{passage.fileName || passage.title} · page {passage.page}</p>
            <p className="mt-1 text-xs text-muted">{passage.heading}</p>
            <button type="button" className="mt-2 text-xs text-seal" onClick={() => setOpen(open === index ? null : index)}>
              {open === index ? "Hide passage" : "Show extracted passage"}
            </button>
            {open === index ? <p className="mt-2 text-sm leading-relaxed">{passage.body}</p> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function MakerLookup() {
  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted">The prediction maker uses the same stored pages as the reader. A citation includes the PDF name and page. If nothing matches, no passage is invented.</p>
      <Reader endpoint="maker" />
    </div>
  );
}

function Testing() {
  return (
    <div className="grid gap-3">
      <div className="border border-line bg-card px-4 py-3 text-sm">
        <p>Open a saved birth chart and tap a house. The reading uses that chart, its Vimshottari periods, and the current sky. Each rule says why it was included.</p>
        <p className="mt-2 text-muted">Search below to see whether the library actually contains a phrase. An empty result means the books do not cover it. Nothing is filled in.</p>
      </div>
      <Reader />
    </div>
  );
}

type Passage = {
  bookId: string;
  title: string;
  author: string;
  fileName: string;
  page: number;
  heading: string;
  body: string;
};

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    uploaded: "Uploaded",
    extracting: "Extracting text",
    ocr: "OCR processing",
    ocr_required: "Failed",
    ready: "Completed",
    failed: "Failed",
  };
  return labels[status] ?? status;
}

function BookForm({ busy, progress, onSubmit }: { busy: boolean; progress: string | null; onSubmit: (files: File[], meta: BookMeta) => Promise<void> }) {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [language, setLanguage] = useState("");
  const [category, setCategory] = useState<string>(BOOK_CATEGORIES[0]);
  const [edition, setEdition] = useState("");
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);

  return (
    <form
      className="grid gap-2 border border-[rgb(240_193_78_/_0.28)] bg-card px-3 py-3"
      onSubmit={(event) => {
        event.preventDefault();
        const problem = files.map((file) => pdfSizeError(file.size)).find(Boolean);
        if (problem) {
          setLocalError(problem);
          return;
        }
        setLocalError(null);
        void onSubmit(files, { title, author, language, category, edition, notes });
      }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-seal">Upload PDF · up to 30 MB each</p>
      <input className={field} placeholder="Book title" value={title} onChange={(event) => setTitle(event.target.value)} required />
      <div className="grid gap-2 sm:grid-cols-2">
        <input className={field} placeholder="Author" value={author} onChange={(event) => setAuthor(event.target.value)} />
        <input className={field} placeholder="Language" value={language} onChange={(event) => setLanguage(event.target.value)} />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <select className={field} value={category} onChange={(event) => setCategory(event.target.value)}>
          {BOOK_CATEGORIES.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <input className={field} placeholder="Edition or publication" value={edition} onChange={(event) => setEdition(event.target.value)} />
      </div>
      <textarea className={`${field} min-h-16`} placeholder="Notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
      <input
        className="text-sm"
        type="file"
        accept="application/pdf,.pdf"
        multiple
        onChange={(event) => {
          const next = [...(event.target.files ?? [])];
          setFiles(next);
          setLocalError(next.map((file) => (pdfSizeError(file.size) ? `${file.name} is over 30 MB` : "")).filter(Boolean).join(" ") || null);
        }}
        required
      />
      {files.map((file) => (
        <p key={`${file.name}-${file.size}`} className="text-xs text-muted">{file.name} · {formatBytes(file.size)}</p>
      ))}
      {progress ? <p className="text-sm text-seal">{progress}</p> : null}
      {localError ? <p className="text-sm text-seal">{localError}</p> : null}
      <button type="submit" className="h-10 rounded-md bg-seal text-sm font-semibold text-seal-ink disabled:opacity-50" disabled={busy}>
        {busy ? "Uploading…" : "Upload"}
      </button>
    </form>
  );
}

type BookMeta = { title: string; author: string; language: string; category: string; edition: string; notes: string };

async function sendPdf(file: File, meta: BookMeta, onProgress: (percent: number) => void) {
  const started = await beginBookUpload({ data: { ...meta, fileName: file.name, byteSize: file.size } });
  const chunk = 512 * 1024;
  let offset = 0;
  while (offset < file.size) {
    const bytes = new Uint8Array(await file.slice(offset, offset + chunk).arrayBuffer());
    const result = await writeBookChunk({ data: { id: started.id, offset, pdfBase64: toBase64(bytes) } });
    offset = result.received;
    onProgress(Math.round((offset / file.size) * 100));
  }
  await finishBookUpload({ data: { id: started.id } });
}

async function resumePdf(id: string, file: File, onProgress: (percent: number) => void) {
  let offset = (await bookUploadProgress({ data: { id } })).received;
  const chunk = 512 * 1024;
  while (offset < file.size) {
    const bytes = new Uint8Array(await file.slice(offset, offset + chunk).arrayBuffer());
    const result = await writeBookChunk({ data: { id, offset, pdfBase64: toBase64(bytes) } });
    offset = result.received;
    onProgress(Math.round((offset / file.size) * 100));
  }
  await finishBookUpload({ data: { id } });
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}

async function previewText(id: string, setNote: (note: string) => void) {
  try {
    const result = await bookPages({ data: { id } });
    if (result.pages.length === 0) {
      setNote("No extracted text yet.");
      return;
    }
    const preview = result.pages.slice(0, 2).map((page) => `Page ${page.page} (${page.source})\n${page.body.slice(0, 500)}`).join("\n\n");
    setNote(preview);
  } catch (reason) {
    setNote(reason instanceof Error ? reason.message : "The extracted text could not be read.");
  }
}

const field = "h-10 rounded-md border border-line bg-paper px-2 text-sm text-ink";

async function viewPdf(book: BookCard, setNote: (note: string) => void) {
  try {
    const file = await readBook({ data: { id: book.id } });
    const bytes = Uint8Array.from(atob(file.pdfBase64), (char) => char.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
    window.open(url, "_blank", "noopener");
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (reason) {
    setNote(reason instanceof Error ? reason.message : "The PDF could not be opened.");
  }
}

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
