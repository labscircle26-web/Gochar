import { useEffect, useRef, useState } from "react";

const SPAN = 10 * 365.2425 * 24 * 60 * 60 * 1000;
const INSET = 14;

function clamp(value: number): number {
  return Math.min(1, Math.max(-1, value));
}

function formatTimeline(instant: Date, timeZone: string): string {
  try {
    const date = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(instant);
    const time = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(instant);
    return `${date} · ${time}`;
  } catch {
    return instant.toISOString();
  }
}

export function TransitTimeline({
  instant,
  now,
  timeZone,
  onSeek,
}: {
  instant: Date;
  now: Date;
  timeZone: string;
  onSeek: (when: Date) => void;
}) {
  const track = useRef<HTMLDivElement>(null);
  const anchor = useRef(now.getTime());
  const dragging = useRef(false);
  const pending = useRef<Date | null>(null);
  const timer = useRef(0);
  const primed = useRef(false);
  const [ghost, setGhost] = useState<Date | null>(null);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  useEffect(() => {
    if (dragging.current || !ghost) return;
    if (Math.abs(ghost.getTime() - instant.getTime()) < 1500) setGhost(null);
  }, [instant, ghost]);

  const shown = ghost ?? instant;
  const basis = ghost ? anchor.current : now.getTime();
  const fraction = clamp((shown.getTime() - basis) / SPAN);
  const label = formatTimeline(shown, timeZone);
  const along = (fraction + 1) / 2;
  const splitAt = label.indexOf(" · ");
  const dateText = splitAt === -1 ? label : label.slice(0, splitAt);
  const timeText = splitAt === -1 ? "" : label.slice(splitAt + 3);
  const skew = shown.getTime() - now.getTime();
  const viewState = Math.abs(skew) < 90_000 ? "LIVE" : skew < 0 ? "HISTORICAL VIEW" : "FUTURE VIEW";

  function queue(when: Date, commit: boolean) {
    pending.current = when;
    setGhost(when);
    if (commit) {
      window.clearTimeout(timer.current);
      timer.current = 0;
      primed.current = false;
      onSeek(when);
      return;
    }
    if (!primed.current) {
      primed.current = true;
      onSeek(when);
    }
    if (timer.current) return;
    timer.current = window.setTimeout(() => {
      timer.current = 0;
      if (dragging.current && pending.current) onSeek(pending.current);
    }, 90);
  }

  function fromClient(clientX: number): Date {
    const rect = track.current?.getBoundingClientRect();
    const left = (rect?.left ?? 0) + INSET;
    const width = Math.max(1, (rect?.width ?? 1) - INSET * 2);
    const ratio = Math.min(1, Math.max(0, (clientX - left) / width));
    return new Date(anchor.current + (ratio * 2 - 1) * SPAN);
  }

  return (
    <div className="gochar-timeline mx-auto mt-4 max-w-xl" data-no-swipe>
      <p className="gochar-date-time px-2 text-center text-sm tabular-nums">
        <span>{dateText}</span>
        {timeText ? <span className="gochar-date-time__time">{timeText}</span> : null}
      </p>
      <div className="gochar-timeline-range mt-3 flex justify-between px-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-muted">
        <span>-10 Years</span>
        <span>+10 Years</span>
      </div>
      <div
        ref={track}
        className="relative mt-1 h-14 touch-none select-none"
        onPointerDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
          event.currentTarget.setPointerCapture(event.pointerId);
          anchor.current = Date.now();
          dragging.current = true;
          queue(fromClient(event.clientX), false);
        }}
        onPointerMove={(event) => {
          if (!dragging.current) return;
          queue(fromClient(event.clientX), false);
        }}
        onPointerUp={(event) => {
          if (!dragging.current) return;
          dragging.current = false;
          queue(fromClient(event.clientX), true);
        }}
        onPointerCancel={() => {
          if (!dragging.current) return;
          dragging.current = false;
          if (pending.current) queue(pending.current, true);
        }}
      >
        <div
          className="gochar-timeline-track absolute top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-[#8a6a2a] via-[#f0d78c] to-[#8a6a2a] shadow-[0_0_5px_rgb(237_196_81_/_0.12)]"
          style={{ left: INSET, right: INSET }}
        />
        <div
          role="slider"
          aria-label="Transit time"
          aria-valuemin={-10}
          aria-valuemax={10}
          aria-valuenow={Number((fraction * 10).toFixed(2))}
          aria-valuetext={label}
          className="pointer-events-none absolute top-1/2 z-10 h-11 w-11 -translate-x-1/2 -translate-y-1/2"
          style={{ left: `calc(${INSET}px + (100% - ${INSET * 2}px) * ${along})` }}
        >
          <span
            className="gochar-timeline-thumb absolute top-1/2 left-1/2 h-[22px] w-[22px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#f8edd0]"
            style={{ background: "radial-gradient(circle at 35% 30%, #fff6d8, #f0c14e 46%, #a67c2d 82%)" }}
          />
        </div>
      </div>
      <p className="gochar-timeline-now mt-1.5 text-center text-[11px] font-semibold tracking-[0.25em] text-seal">NOW</p>
      <p className="mt-1 text-center text-[10px] font-semibold tracking-[0.2em] text-seal">{viewState}</p>
    </div>
  );
}
