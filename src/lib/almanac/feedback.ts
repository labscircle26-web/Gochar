import { createServerFn } from "@tanstack/react-start";

function parseNote(value: unknown): { message: string; page: "gochar" | "charts" } {
  if (!value || typeof value !== "object") throw new Error("Invalid feedback.");
  const raw = value as { message?: unknown; page?: unknown };
  const message = String(raw.message ?? "").trim().slice(0, 1000);
  const page = raw.page === "charts" ? "charts" : raw.page === "gochar" ? "gochar" : null;
  if (!message) throw new Error("Write a short note first.");
  if (!page) throw new Error("Unknown page.");
  return { message, page };
}

export const submitFeedback = createServerFn({ method: "POST" })
  .validator((value: unknown) => parseNote(value))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { sendFeedbackMail } = await import("./mail.server");
    await sendFeedbackMail(data);
    return { ok: true };
  });
