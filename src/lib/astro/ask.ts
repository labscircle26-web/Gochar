import { createServerFn } from "@tanstack/react-start";

type Turn = { question: string; answer: string };

function parseAsk(value: unknown): { question: string; context: string; history: Turn[] } {
  if (!value || typeof value !== "object") throw new Error("Ask a question about the chart.");
  const raw = value as { question?: unknown; context?: unknown; history?: unknown };
  const question = String(raw.question ?? "").trim().slice(0, 500);
  const context = String(raw.context ?? "").trim().slice(0, 7000);
  if (!question) throw new Error("Ask a question about the chart.");
  if (!context) throw new Error("The chart is not ready yet.");
  const history = Array.isArray(raw.history)
    ? raw.history.slice(-2).flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const turn = item as { question?: unknown; answer?: unknown };
        const q = String(turn.question ?? "").trim().slice(0, 500);
        const a = String(turn.answer ?? "").trim().slice(0, 800);
        return q && a ? [{ question: q, answer: a }] : [];
      })
    : [];
  return { question, context, history };
}

export const askChart = createServerFn({ method: "POST" })
  .validator((value: unknown) => parseAsk(value))
  .handler(async ({ data }): Promise<{ ok: true; text: string } | { ok: false; error: string }> => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return { ok: false, error: "AI is not available right now." };
    const messages = [
      {
        role: "system",
        content:
          "You are the Vedic astrology reader inside the Gochar app. Answer only from the sidereal chart data in the user message. Use the given degrees, houses, nakshatras, shadbala, dasha, panchang, and eclipses. Do not invent positions. If the data does not contain the answer, say so. Keep the reply short and plain. This is not a substitute for a jyotishi.",
      },
      ...data.history.flatMap((turn) => [
        { role: "user" as const, content: turn.question },
        { role: "assistant" as const, content: turn.answer },
      ]),
      {
        role: "user" as const,
        content: `${data.context}\n\nQuestion: ${data.question}`,
      },
    ];
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-4.5",
        max_tokens: 450,
        temperature: 0.3,
        messages,
      }),
    });
    if (!response.ok) {
      const detail = await response.text();
      if (response.status === 403 && /credit|spending-limit|subscription/i.test(detail)) {
        return { ok: false, error: "AI credits are used up for now, so this question could not be read." };
      }
      return { ok: false, error: "The reading could not be completed. Try again." };
    }
    const body = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const text = body.choices?.[0]?.message?.content?.trim() ?? "";
    if (!text) return { ok: false, error: "The reading came back empty. Try again." };
    return { ok: true, text };
  });
