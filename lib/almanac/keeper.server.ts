import { ensureDbReady, getSql } from "@/lib/db";
import { auth } from "@/lib/auth/server";
import { ADMIN_EMAIL } from "./types";

/** Server-only. Never import this module from a client component. */
const ADMIN_PASSWORD = "Lagna-Rohini-48k";
const ADMIN_NAME = "Keeper";

let pending: Promise<void> | null = null;

export function ensureKeeper(): Promise<void> {
  pending ??= seed().catch((error: unknown) => {
    pending = null;
    throw error;
  });
  return pending;
}

async function seed(): Promise<void> {
  await ensureDbReady();
  const sql = await getSql();
  const existing = await sql<{ id: string }>`select id from "user" where email = ${ADMIN_EMAIL} limit 1`;
  if (existing.length > 0) return;
  await auth.api.signUpEmail({
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD, name: ADMIN_NAME },
  });
}
