import { createServerFn } from "@tanstack/react-start";
import { isValidTimeZone } from "@/lib/astro/time";
import { authMiddleware } from "@/lib/auth/middleware";
import { ADMIN_EMAIL, DEFAULT_BOARD, type AlmanacBoard } from "./types";

type BoardRow = {
  notice: string;
  footer: string;
  place_label: string;
  lat: number;
  lon: number;
  tz: string;
};

function fromRow(row: BoardRow): AlmanacBoard {
  return {
    notice: row.notice,
    footer: row.footer,
    placeLabel: row.place_label,
    lat: row.lat,
    lon: row.lon,
    tz: row.tz,
  };
}

function parseBoard(value: unknown): AlmanacBoard {
  if (!value || typeof value !== "object") throw new Error("Invalid almanac.");
  const raw = value as Partial<AlmanacBoard>;
  const notice = String(raw.notice ?? "").trim().slice(0, 280);
  const footer = String(raw.footer ?? "").trim().slice(0, 280);
  const placeLabel = String(raw.placeLabel ?? "").trim().slice(0, 80);
  const lat = Number(raw.lat);
  const lon = Number(raw.lon);
  const tz = String(raw.tz ?? "").trim();
  if (!placeLabel) throw new Error("The default place needs a name.");
  if (!Number.isFinite(lat) || lat < -89 || lat > 89) throw new Error("Latitude must stay within ±89°.");
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) throw new Error("Longitude must stay within ±180°.");
  if (!isValidTimeZone(tz)) throw new Error("That time zone name is not recognized.");
  return { notice, footer, placeLabel, lat, lon, tz };
}

export const getAlmanac = createServerFn({ method: "GET" }).handler(async (): Promise<AlmanacBoard> => {
  const { ensureKeeper } = await import("./keeper.server");
  await ensureKeeper();
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  const rows = await sql<BoardRow>`
    select notice, footer, place_label, lat, lon, tz
    from almanac_board
    where id = 1
  `;
  return rows[0] ? fromRow(rows[0]) : DEFAULT_BOARD;
});

export const saveAlmanac = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((value: unknown) => parseBoard(value))
  .handler(async ({ context, data }): Promise<AlmanacBoard> => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const users = await sql<{ email: string }>`select email from "user" where id = ${context.userId} limit 1`;
    if (users[0]?.email !== ADMIN_EMAIL) throw new Error("Only the keeper can update the almanac.");
    await sql`
      insert into almanac_board (id, notice, footer, place_label, lat, lon, tz, updated_by)
      values (1, ${data.notice}, ${data.footer}, ${data.placeLabel}, ${data.lat}, ${data.lon}, ${data.tz}, ${context.userId})
      on conflict (id) do update set
        notice = excluded.notice,
        footer = excluded.footer,
        place_label = excluded.place_label,
        lat = excluded.lat,
        lon = excluded.lon,
        tz = excluded.tz,
        updated_by = excluded.updated_by,
        updated_at = now()
    `;
    return data;
  });
