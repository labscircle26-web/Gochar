import { useEffect, useState } from "react";
import { GRAHA_IDS, GRAHA_NAME, type AyanamsaId, type GrahaId, type NodeMode } from "@/lib/astro/constants";
import { computeSky, signIndex } from "@/lib/astro/calc";
import { countdown, effectForChart, findUpcoming, type TransitEvent } from "@/lib/astro/upcoming";
import type { NodeDrishti } from "@/lib/astro/drishti";
import { formatStamp, zonedToUtc } from "@/lib/astro/time";
import { loadActiveId, loadProfiles } from "@/lib/astro/library";
import { GoldMenu } from "@/components/gold-menu";

const PHOTO: Record<GrahaId, string> = {
  sun: "/planets/sun.jpg",
  moon: "/planets/moon.jpg",
  mercury: "/planets/mercury.jpg",
  venus: "/planets/venus.jpg",
  mars: "/planets/mars.jpg",
  jupiter: "/planets/jupiter.jpg",
  saturn: "/planets/saturn.jpg",
  rahu: "/planets/rahu.jpg",
  ketu: "/planets/ketu.jpg",
};

const RANGES = [
  { id: "24h", label: "Next 24 Hours", ms: 24 * 3_600_000 },
  { id: "7d", label: "Next 7 Days", ms: 7 * 86_400_000 },
  { id: "30d", label: "Next 30 Days", ms: 30 * 86_400_000 },
  { id: "90d", label: "Next 90 Days", ms: 90 * 86_400_000 },
] as const;

function Photo({ id, size = 40 }: { id: GrahaId; size?: number }) {
  return (
    <img
      src={PHOTO[id]}
      alt=""
      width={size}
      height={size}
      className="shrink-0 rounded-full border border-[rgb(240_193_78_/_0.4)] object-cover"
      style={{ width: size, height: size }}
    />
  );
}

export function UpcomingTransits({
  from,
  now,
  timeZone,
  ayanamsa,
  node,
  nodes,
}: {
  from: Date;
  now: Date;
  timeZone: string;
  ayanamsa: AyanamsaId;
  node: NodeMode;
  nodes: NodeDrishti;
}) {
  const [events, setEvents] = useState<TransitEvent[] | null>(null);
  const [open, setOpen] = useState(false);
  const [graha, setGraha] = useState<GrahaId>("sun");
  const [range, setRange] = useState<(typeof RANGES)[number]["id"]>("90d");
  const [menu, setMenu] = useState<"graha" | "range" | null>(null);
  const [picked, setPicked] = useState<TransitEvent | null>(null);
  const [effect, setEffect] = useState("");
  const bucket = Math.floor(from.getTime() / 600_000);
  const key = `${ayanamsa}|${node}|${nodes}|${bucket}`;

  useEffect(() => {
    let cancel = false;
    const origin = new Date(bucket * 600_000);
    const timer = window.setTimeout(() => {
      const next = findUpcoming(origin, ayanamsa, node, nodes);
      if (!cancel) setEvents(next);
    }, 40);
    return () => {
      cancel = true;
      window.clearTimeout(timer);
    };
  }, [key, bucket, ayanamsa, node, nodes]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const upcoming = (events ?? []).filter((event) => event.at > from.getTime());
  const nearest = upcoming[0];
  const limit = RANGES.find((item) => item.id === range)?.ms ?? RANGES[0].ms;
  const shown = upcoming.filter(
    (event) => (event.graha === graha || event.other === graha) && event.at - from.getTime() <= limit,
  );
  const rangeLabel = RANGES.find((item) => item.id === range)?.label ?? "Next 90 Days";

  useEffect(() => {
    if (!picked) return;
    const active = loadActiveId();
    const profile = loadProfiles().find((item) => item.id === active);
    if (!profile) {
      setEffect(effectForChart(picked, ayanamsa, node, null));
      return;
    }
    const birth = zonedToUtc(profile.year, profile.month, profile.day, profile.hour, profile.minute, profile.second, profile.tz);
    const sky = computeSky(birth, profile.lat, profile.lon, profile.tz, profile.ayanamsa, profile.node);
    setEffect(effectForChart(picked, ayanamsa, node, { name: profile.name, lagnaSign: signIndex(sky.lagna) }));
  }, [picked, ayanamsa, node]);

  return (
    <>
      <button
        type="button"
        className="upcoming-transits-card mx-auto mt-3 flex w-full max-w-xl items-center gap-3 px-3 py-2.5 text-left"
        onClick={() => {
          setPicked(null);
          setMenu(null);
          setOpen(true);
        }}
      >
        {nearest ? <Photo id={nearest.graha} /> : <span className="inline-block h-10 w-10 rounded-full border border-line" />}
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-seal">Upcoming Transits</span>
          <span className="mt-0.5 block truncate text-sm text-ink">
            {nearest ? nearest.title : events ? "Nothing ahead in 90 days" : "Reading the sky…"}
          </span>
        </span>
        {nearest ? <span className="shrink-0 text-xs font-medium text-seal tabular-nums">{countdown(nearest.at, now.getTime())}</span> : null}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 sm:items-center" data-no-swipe onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="upcoming-title"
            className="flex max-h-[min(42rem,calc(100dvh-1.5rem))] w-full min-w-0 max-w-lg flex-col overflow-hidden border border-[#a68534] bg-paper shadow-[0_24px_60px_rgb(0_0_0_/_0.55)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
              <h2 id="upcoming-title" className="min-w-0 font-display text-3xl leading-none">
                {picked ? "Transit" : "Upcoming Celestial Events"}
              </h2>
              <button type="button" aria-label="Close" className="inline-flex h-10 w-10 items-center justify-center text-xl text-seal" onClick={() => setOpen(false)}>
                ×
              </button>
            </div>
            {picked ? (
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                <button type="button" className="text-xs font-semibold uppercase tracking-widest text-seal" onClick={() => setPicked(null)}>
                  Back
                </button>
                <div className="mt-3 flex items-center gap-3">
                  <Photo id={picked.graha} size={64} />
                  {picked.other ? <Photo id={picked.other} size={64} /> : null}
                  <div>
                    <p className="font-display text-3xl leading-none">{picked.title}</p>
                    <p className="mt-1 text-sm text-muted">{picked.line}</p>
                  </div>
                </div>
                <p className="mt-4 text-sm tabular-nums text-ink">
                  {formatStamp(new Date(picked.at), timeZone)} · {countdown(picked.at, now.getTime())}
                </p>
                <p className="mt-3 text-sm">{picked.detail}</p>
                <p className="mt-3 text-sm text-muted">{effect}</p>
              </div>
            ) : (
              <>
                <div className="grid shrink-0 gap-2 px-3 pt-3">
                  <GoldMenu
                    label="Select Graha"
                    summary={GRAHA_NAME[graha]}
                    mark={<Photo id={graha} size={28} />}
                    open={menu === "graha"}
                    onOpenChange={(next) => setMenu(next ? "graha" : null)}
                  >
                    {GRAHA_IDS.map((id) => (
                      <button
                        key={id}
                        type="button"
                        className={`flex h-10 w-full items-center gap-2 px-1 text-left text-sm ${id === graha ? "font-semibold text-seal" : "text-ink"}`}
                        onClick={() => {
                          setGraha(id);
                          setMenu(null);
                        }}
                      >
                        <Photo id={id} size={24} />
                        {GRAHA_NAME[id]}
                      </button>
                    ))}
                  </GoldMenu>
                  <GoldMenu
                    label="Time Range"
                    summary={rangeLabel}
                    open={menu === "range"}
                    onOpenChange={(next) => setMenu(next ? "range" : null)}
                  >
                    {RANGES.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`flex h-10 w-full items-center px-1 text-left text-sm ${item.id === range ? "font-semibold text-seal" : "text-ink"}`}
                        onClick={() => {
                          setRange(item.id);
                          setMenu(null);
                        }}
                      >
                        {item.label}
                      </button>
                    ))}
                  </GoldMenu>
                </div>
                <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-3 py-3">
                  {shown.length === 0 ? (
                    <p className="px-1 py-6 text-sm text-muted">
                      {events ? `No ${GRAHA_NAME[graha]} events in this range.` : "Reading the sky…"}
                    </p>
                  ) : (
                    <ul className="grid min-w-0 gap-2">
                      {shown.map((event) => (
                        <li key={event.id} className="min-w-0">
                          <button
                            type="button"
                            className={`flex w-full min-w-0 items-center gap-3 overflow-hidden rounded-md bg-card px-2 py-2 text-left ${event.kind === "sign" ? "sign-entry" : "border border-line"}`}
                            onClick={() => setPicked(event)}
                          >
                            <Photo id={event.graha} />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm text-ink">{event.title}</span>
                              <span className="block truncate text-xs text-muted">
                                {event.line} · {formatStamp(new Date(event.at), timeZone)}
                              </span>
                            </span>
                            <span className="shrink-0 text-xs tabular-nums text-seal">{countdown(event.at, now.getTime())}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
