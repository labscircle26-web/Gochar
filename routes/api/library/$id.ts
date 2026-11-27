import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/library/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const { getCookie } = await import("@tanstack/react-start/server");
        const { readDeveloperSession } = await import("@/lib/developer/password.server");
        const session = readDeveloperSession(request.headers.get("x-developer-token")) ?? readDeveloperSession(getCookie("gochar_dev"));
        if (!session) return new Response("Forbidden", { status: 403 });
        const { readBookFile } = await import("@/lib/developer/storage.server");
        const { getSql } = await import("@/lib/db");
        const stored = readBookFile(params.id);
        const sql = await getSql();
        const rows = await sql.query<{ file_name: string; pdf: unknown }>("select file_name, pdf from astrology_book where id = $1", [params.id]);
        const row = rows[0];
        if (!row) return new Response("Not found", { status: 404 });
        const bytes = stored ?? pdfBytes(row.pdf);
        if (!bytes) return new Response("Not found", { status: 404 });
        return new Response(Buffer.from(bytes), {
          headers: {
            "content-type": "application/pdf",
            "content-disposition": `inline; filename="${row.file_name.replace(/"/g, "")}"`,
          },
        });
      },
    },
  },
});

function pdfBytes(value: unknown): Uint8Array | null {
  if (value instanceof Uint8Array) return value;
  if (typeof value === "string") return Uint8Array.from(Buffer.from(value.replace(/^\\x/, ""), "hex"));
  return null;
}
