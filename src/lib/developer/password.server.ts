import { createHmac, scryptSync, timingSafeEqual } from "node:crypto";

const SALT = "f47880154b773f89f606b24889623447";
const HASH = "c98239a623ccae1889e04ee958ee030be82b4f9d2ee00f5d30f20c4cdb73d7d1";
const SESSION_KEY = "87a51d0203fa538edd4a1eb2bc0ba13d49999280e98bedf1c767457659a3295b";

export function developerPasswordMatches(password: string): boolean {
  const supplied = scryptSync(password, SALT, 32);
  const override = process.env.GOCHAR_DEVELOPER_PASSWORD?.trim();
  const expected = override ? scryptSync(override, SALT, 32) : Buffer.from(HASH, "hex");
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export function signDeveloperSession(email: string, remember: boolean): { token: string; maxAge: number } {
  const maxAge = remember ? 60 * 60 * 24 * 30 : 60 * 60 * 12;
  const body = Buffer.from(JSON.stringify({ email: email.toLowerCase(), exp: Date.now() + maxAge * 1000 })).toString("base64url");
  const sig = createHmac("sha256", SESSION_KEY).update(body).digest("base64url");
  return { token: `${body}.${sig}`, maxAge };
}

export function readDeveloperSession(token: string | null | undefined): { email: string } | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = createHmac("sha256", SESSION_KEY).update(body).digest("base64url");
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
