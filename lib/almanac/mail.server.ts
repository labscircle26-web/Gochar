import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

function inbox(): string {
  const fromEnv = process.env.FEEDBACK_INBOX?.trim();
  if (fromEnv) return fromEnv;
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(here, "../../../.env.feedback"),
    join(here, "../../../../.env.feedback"),
    join(process.cwd(), ".env.feedback"),
  ];
  for (const path of candidates) {
    try {
      const value = readFileSync(path, "utf8").trim();
      if (value.includes("@")) return value;
    } catch {
      // try the next location
    }
  }
  throw new Error("Could not send. Try again in a moment.");
}

export async function sendFeedbackMail(input: { message: string; page: "gochar" | "charts" }): Promise<void> {
  const page = input.page === "charts" ? "Birth charts" : "Gochar";
  const response = await fetch(`https://formsubmit.co/ajax/${inbox()}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "Mozilla/5.0 (compatible; Gochar/1.0)",
    },
    body: JSON.stringify({
      _subject: `Gochar feedback · ${page}`,
      _template: "box",
      _captcha: "false",
      page,
      message: input.message,
    }),
  });
  const body = (await response.json().catch(() => null)) as { success?: boolean | string } | null;
  const ok = response.ok && body?.success !== false && body?.success !== "false";
  if (!ok) throw new Error("Could not send. Try again in a moment.");
}
