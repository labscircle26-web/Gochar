import { useState } from "react";
import { submitFeedback } from "@/lib/almanac/feedback";

export function FeedbackBox({ page }: { page: "gochar" | "charts" }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  return (
    <section className="mt-8 border-t border-line pt-4">
      <button type="button" className="inline-flex h-12 items-center justify-center rounded-md border border-line bg-card px-4 text-sm font-medium text-ink" onClick={() => setOpen((value) => !value)}>
        {open ? "Close feedback" : "Feedback"}
      </button>
      {open && (
        <form
          className="mt-3 grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            setSending(true);
            setNote(null);
            void submitFeedback({ data: { message, page } })
              .then(() => {
                setMessage("");
                setNote("Sent.");
              })
              .catch((error: unknown) => {
                setNote(error instanceof Error ? error.message : "Could not send.");
              })
              .finally(() => setSending(false));
          }}
        >
          <label className="grid gap-1 text-xs font-semibold uppercase tracking-widest text-muted">
            A note
            <textarea
              className="min-h-24 rounded-md border border-line bg-card px-3 py-2 text-sm text-ink"
              maxLength={1000}
              required
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
          </label>
          <button
            type="submit"
            disabled={sending}
            className="inline-flex h-11 w-fit items-center justify-center rounded-md bg-seal px-4 text-sm font-semibold text-seal-ink disabled:opacity-60"
          >
            {sending ? "Sending…" : "Send"}
          </button>
          {note && <p className="text-sm text-muted">{note}</p>}
        </form>
      )}
    </section>
  );
}
