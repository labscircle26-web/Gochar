import { createHmac, scryptSync, timingSafeEqual } from "node:crypto";

const SALT = "f47880154b773f89f606b24889623447";

function sessionKey(): string | null {
  const value = process.env.GOCHAR_DEVELOPER_SESSION_SECRET?.trim();
  return value && Buffer.byteLength(value) >= 32 ? value : null;
}

export function developerPasswordMatches(password: string): boolean {
  const configured = process.env.GOCHAR_DEVELOPER_PASSWORD?.trim();
  if (!configured || !password) return false;
  const supplied = scryptSync(password, SALT, 32);
  const expected = scryptSync(configured, SALT, 32);
  return timingSafeEqual(supplied, expected);
}

export function signDeveloperSession(email: string, remember: boolean): { token: string; maxAge: number } {
  const maxAge = remember ? 60 * 60 * 24 * 30 : 60 * 60 * 12;
  const body = Buffer.from(JSON.stringify({ email: email.toLowerCase(), exp: Date.now() + maxAge * 1000 })).toString("base64url");
  const key = sessionKey();
  if (!key) throw new Error("GOCHAR_DEVELOPER_SESSION_SECRET must be configured.");
  const sig = createHmac("sha256", key).update(body).digest("base64url");
  return { token: `${body}.${sig}`, maxAge };
}

export function readDeveloperSession(token: string | null | undefined): { email: string } | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const key = sessionKey();
  if (!key) return null;
  const expected = createHmac("sha256", key).update(body).digest("base64url");
  const left = Buffer.from(sig);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString()) as { email?: unknown; exp?: unknown };
    if (typeof parsed.email !== "string" || typeof parsed.exp !== "number" || parsed.exp < Date.now()) return null;
    return { email: parsed.email };
  } catch {
    return null;
  }
}
