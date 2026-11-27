/** Server-only developer allowlist. Never import this from a client component. */

export function developerEmails(): string[] {
  const raw = process.env.GOCHAR_DEVELOPER_EMAILS?.trim() ?? "";
  return [...new Set(raw.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean))];
}

export function isDeveloperEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return developerEmails().includes(email.trim().toLowerCase());
}
