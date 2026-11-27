import { useState } from "react";
import { askChart } from "@/lib/astro/ask";

type Turn = { question: string; answer: string };

export function AskAi({ buildContext, ready }: { buildContext: () => string; ready: boolean }) {
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <section className="mx-auto mt-3 max-w-xl border border-line bg-card p-4">
      <h2 className="font-display text-3xl leading-none">Ask AI</h2>
      <p className="mt-1 text-sm text-muted">Ask about this chart. The reply uses the degrees, houses, and dasha already calculated here.</p>
      {turns.length > 0 && (
        <div className="mt-3 grid gap-3">
          {turns.map((turn, index) => (
            <article key={`${turn.question}-${index}`} className="border-t border-line pt-3 text-sm">
              <p className="font-medium">{turn.question}</p>
              <p className="mt-1 whitespace-pre-wrap text-muted">{turn.answer}</p>
            </article>
          ))}
        </div>
      )}
      <form
        className="mt-3 grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!ready || busy) return;
          const asked = question.trim();
          if (!asked) return;
          setBusy(true);
          setError(null);
          void askChart({ data: { question: asked, context: buildContext(), history: turns } })
            .then((result) => {
              if (!result.ok) {
                setError(result.error);
                return;
              }
              setTurns((current) => [...current, { question: asked, answer: result.text }].slice(-4));
              setQuestion("");
            })
            .catch((reason: unknown) => {
              setError(reason instanceof Error ? reason.message : "The reading could not be completed.");
            })
            .finally(() => setBusy(false));
        }}
      >
        <label className="grid gap-1 text-xs font-semibold uppercase tracking-widest text-muted">
          Question
          <textarea
            className="min-h-20 rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink"
            maxLength={500}
            required
            disabled={!ready || busy}
            value={question}
            placeholder={ready ? "What does this lagna emphasize?" : "Waiting for the chart…"}
            onChange={(event) => setQuestion(event.target.value)}
          />
        </label>
        <button
          type="submit"
          disabled={!ready || busy}
          className="inline-flex h-11 w-fit items-center justify-center rounded-md bg-seal px-4 text-sm font-semibold text-seal-ink disabled:opacity-60"
        >
          {busy ? "Reading…" : "Ask"}
        </button>
        {error && <p className="text-sm text-muted">{error}</p>}
      </form>
    </section>
  );
}
