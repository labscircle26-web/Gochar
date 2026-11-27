import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { KundliChart, type ChartPlanet } from "@/components/kundli-chart";
import { PlaceFields, type PlaceValue } from "@/components/place-fields";
import {
  AYANAMSA_LABEL,
  GRAHA_NAME,
  NAKSHATRAS,
  RASHIS,
  type AyanamsaId,
  type ChartStyle,
  type NodeMode,
} from "@/lib/astro/constants";
import { computeSky, mahadashas, nakshatraIndex, padaOf, signIndex, subdashas, vimshottari, type DashaSpan, type GrahaPosition } from "@/lib/astro/calc";
import { formatDms } from "@/lib/astro/format";
import { isCombust } from "@/lib/astro/reading";
import { predictHouse } from "@/lib/astro/predict";
import { ashtakavarga, SAPTA } from "@/lib/astro/ashtakavarga";
import { FeedbackBox } from "@/components/feedback-box";
import { DrishtiMenu, useDrishti } from "@/components/drishti-menu";
import { ShadbalaTable } from "@/components/shadbala-table";
import { AshtakavargaPanel } from "@/components/ashtakavarga-panel";
import { useSectionSwipe } from "@/lib/swipe";
import { loadActiveId, loadProfiles, saveActiveId, saveProfiles, type BirthProfile } from "@/lib/astro/library";
import { formatStamp, zonedToUtc } from "@/lib/astro/time";
import { DesktopSidebar } from "@/components/desktop-sidebar";

const field = "h-12 w-full rounded-md border border-line bg-card px-3 text-base text-ink";
const btn = "inline-flex h-12 items-center justify-center rounded-md border border-line bg-card px-4 text-sm font-medium text-ink";
const btnOn = "inline-flex h-12 items-center justify-center rounded-md bg-ink px-4 text-sm font-medium text-card";

function blank(seed: PlaceValue): BirthProfile {
  return {
    id: "",
    name: "",
    ...seed,
    year: 1990,
    month: 1,
    day: 1,
    hour: 12,
    minute: 0,
    second: 0,
    ayanamsa: "lahiri",
    node: "true",
    chart: "north",
  };
}

export function ChartsScreen() {
  const [profiles, setProfiles] = useState<BirthProfile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState<BirthProfile | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [ashtaka, setAshtaka] = useState(false);
  const navigate = useNavigate();
  useSectionSwipe((direction) => {
    if (direction === "left") void navigate({ to: "/" });
  });
  useEffect(() => {
    history.pushState({ gocharBack: 1 }, "");
    let last = 0;
    const onPop = () => {
      const at = Date.now();
      if (at - last < 700) {
        void navigate({ to: "/" });
        return;
      }
      last = at;
      history.pushState({ gocharBack: 1 }, "");
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [navigate]);
  const [now, setNow] = useState(() => new Date());
  const [ready, setReady] = useState(false);
  const drishti = useDrishti("charts-drishti");

  useEffect(() => {
    const list = loadProfiles();
    const stored = loadActiveId();
    setProfiles(list);
    setActiveId(stored && list.some((profile) => profile.id === stored) ? stored : (list[0]?.id ?? null));
    setReady(true);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(id);
  }, []);

  const active = profiles.find((profile) => profile.id === activeId) ?? null;

  const natal = useMemo(() => {
    if (!active) return null;
    try {
      const birth = zonedToUtc(active.year, active.month, active.day, active.hour, active.minute, active.second, active.tz);
      const sky = computeSky(birth, active.lat, active.lon, active.tz, active.ayanamsa, active.node);
      return { birth, sky };
    } catch {
      return null;
    }
  }, [active]);

  const bySign = useMemo(() => {
    const signs: ChartPlanet[][] = Array.from({ length: 12 }, () => []);
    if (!natal) return signs;
    const sunLon = natal?.sky.grahas.find((graha) => graha.id === "sun")?.lon ?? 0;
    for (const graha of natal.sky.grahas) {
      signs[signIndex(graha.lon)]?.push({
        id: graha.id,
        retro: graha.retro,
        combust: isCombust(graha.id, graha.lon, graha.retro, sunLon),
      });
    }
    return signs;
  }, [natal]);

  function commit(next: BirthProfile[]) {
    setProfiles(next);
    saveProfiles(next);
  }

  function choose(id: string) {
    setActiveId(id);
    saveActiveId(id);
    setPicked(null);
    setDraft(null);
  }

  function setStyle(chart: ChartStyle) {
    if (!active) return;
    commit(profiles.map((profile) => (profile.id === active.id ? { ...profile, chart } : profile)));
  }

  const bindus = useMemo(() => (natal ? ashtakavarga(natal.sky.grahas, natal.sky.lagna) : null), [natal]);
  const transitMinute = Math.floor(now.getTime() / 60_000);
  const transitSky = useMemo(() => {
    if (!active) return null;
    try {
      return computeSky(new Date(transitMinute * 60_000), active.lat, active.lon, active.tz, active.ayanamsa, active.node);
    } catch {
      return null;
    }
  }, [active, transitMinute]);
  const moon = natal?.sky.grahas.find((graha) => graha.id === "moon");
  const lagnaSign = natal ? signIndex(natal.sky.lagna) : 0;

  return (
    <>
    <DesktopSidebar active="charts" />
    <main className="charts-page min-h-screen w-full px-4 py-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-seal">Saved</p>
          <h1 className="mt-1 font-display text-5xl leading-none">Birth charts</h1>
        </div>
        <Link
          to="/"
          className="inline-flex h-14 items-center justify-center rounded-md bg-seal px-5 text-base font-semibold text-seal-ink"
        >
          Live sky
        </Link>
      </div>
      <p className="mt-2 max-w-xl text-sm text-muted">
        Birth date, time, place, ayanamsa, and nodes, kept on this device. Swipe left, or press the phone back button twice, for the live sky.
      </p>

      {ready && profiles.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2" data-no-swipe>
          {profiles.map((profile) => (
            <button key={profile.id} type="button" className={profile.id === activeId ? btnOn : btn} onClick={() => choose(profile.id)}>
              {profile.name || "Unnamed"}
            </button>
          ))}
          <button type="button" className={btn} onClick={() => setDraft(blank(active ?? profiles[0]!))}>
            Add
          </button>
        </div>
      )}

      {active && natal && !draft && (
        <section className="mt-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-display text-4xl leading-none">{active.name || "Unnamed"}</h2>
            <div className="flex gap-2">
              <button type="button" className={active.chart === "north" ? btnOn : btn} onClick={() => setStyle("north")}>
                North Indian
              </button>
              <button type="button" className={active.chart === "south" ? btnOn : btn} onClick={() => setStyle("south")}>
                South Indian
              </button>
              <button type="button" className={ashtaka ? btnOn : btn} onClick={() => setAshtaka((open) => !open)}>
                {ashtaka ? "Show planets" : "Ashtakavarga"}
              </button>
            </div>
          </div>
          <p className="mt-2 text-sm text-muted">
            {formatStamp(natal.birth, active.tz)} · {active.label} · {AYANAMSA_LABEL[active.ayanamsa]} · {active.node === "true" ? "True Rahu" : "Mean Rahu"}
          </p>
          <DrishtiMenu
            appliedIds={drishti.ids}
            appliedNodes={drishti.nodes}
            onApply={(ids, nodes) => {
              drishti.setIds(ids);
              drishti.setNodes(nodes);
            }}
          />
          <div className="charts-profile-overview">
          <div className="charts-profile-chart">
          <div className="mx-auto mt-3 max-w-xl border border-line bg-card p-2">
            <KundliChart
              style={active.chart}
              lagnaSign={lagnaSign}
              bySign={bySign}
              caption={ashtaka ? "SAV" : "Janma"}
              headline=""
              detail={ashtaka ? "bindus" : formatDms(natal.sky.lagna % 30, true)}
              label={`Birth chart for ${active.name || "this person"}. Lagna ${RASHIS[lagnaSign]?.name}.`}
              mark="janma"
              selectedSign={picked}
              houseMarks={ashtaka ? bindus?.sarva.map(String) : null}
              drishti={{ ids: drishti.ids, nodes: drishti.nodes }}
              onPick={(sign) => setPicked(sign === picked ? null : sign)}
            />
          </div>
          {ashtaka && bindus && picked !== null && (
            <p className="mt-2 border border-line bg-card px-4 py-3 text-sm">
              {RASHIS[picked]?.name} sarvashtakavarga {bindus.sarva[picked]}.{" "}
              {SAPTA.map((id) => `${GRAHA_NAME[id].slice(0, 2)} ${bindus.bhinna[id][picked]}`).join(" · ")}
            </p>
          )}
          {picked !== null && !ashtaka && natal && transitSky && (
            <HousePrediction
              natal={natal.sky.grahas}
              lagnaSign={lagnaSign}
              lagnaLon={natal.sky.lagna}
              sign={picked}
              birth={natal.birth}
              when={new Date(transitMinute * 60_000)}
              transit={transitSky.grahas}
              nodes={drishti.nodes}
              sav={bindus?.sarva[picked] ?? null}
            />
          )}
          </div>
          <div className="charts-profile-details">
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Fact label="Lagna" value={`${RASHIS[lagnaSign]?.name} ${formatDms(natal.sky.lagna % 30, true)}`} />
            <Fact
              label="Moon"
              value={moon ? `${RASHIS[signIndex(moon.lon)]?.name} · ${NAKSHATRAS[nakshatraIndex(moon.lon)]} ${padaOf(moon.lon)}` : "—"}
            />
            <Fact label="Ayanamsa" value={`${formatDms(natal.sky.ayanamsa)} · ${AYANAMSA_LABEL[active.ayanamsa]}`} />
          </div>
          <ShadbalaTable sky={natal.sky} when={natal.birth} timeZone={active.tz} title="Shadbala" />
          {bindus ? (
            <AshtakavargaPanel
              chart={bindus}
              lagnaSign={lagnaSign}
              transits={SAPTA.flatMap((id) => {
                const graha = (transitSky ?? natal.sky).grahas.find((item) => item.id === id);
                return graha ? [{ id, sign: signIndex(graha.lon) }] : [];
              })}
              note="Natal bindus for this birth chart. The grahas below are where they stand now, at the birth place, scored on these bindus."
            />
          ) : null}
          </div>
          </div>
          {moon ? (
            <DashaBoard key={`${active.id}-${natal.birth.toISOString()}`} birth={natal.birth} moonLon={moon.lon} timeZone={active.tz} now={now} />
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className={btn} onClick={() => setDraft(active)}>
              Edit
            </button>
            <button
              type="button"
              className={btn}
              onClick={() => {
                const next = profiles.filter((profile) => profile.id !== active.id);
                commit(next);
                const id = next[0]?.id ?? null;
                setActiveId(id);
                if (id) saveActiveId(id);
              }}
            >
              Remove
            </button>
          </div>
        </section>
      )}

      {ready && (draft || profiles.length === 0) && (
        <ProfileForm
          draft={draft ?? blank({ label: "Delhi, India", lat: 28.6139, lon: 77.209, tz: "Asia/Kolkata" })}
          onChange={setDraft}
          onCancel={profiles.length > 0 ? () => setDraft(null) : undefined}
          onSave={(profile) => {
            const id = profile.id || crypto.randomUUID();
            const nextProfile = { ...profile, id, name: profile.name.trim() || "Unnamed" };
            const next = profiles.some((item) => item.id === id)
              ? profiles.map((item) => (item.id === id ? nextProfile : item))
              : [...profiles, nextProfile];
            commit(next);
            setActiveId(id);
            saveActiveId(id);
            setDraft(null);
          }}
        />
      )}
      <FeedbackBox page="charts" />
    </main>
  );
}

function HousePrediction({
  natal,
  lagnaSign,
  lagnaLon,
  sign,
  birth,
  when,
  transit,
  nodes,
  sav,
}: {
  natal: GrahaPosition[];
  lagnaSign: number;
  lagnaLon: number;
  sign: number;
  birth: Date;
  when: Date;
  transit: GrahaPosition[];
  nodes: "seventh" | "trine" | "saturn";
  sav: number | null;
}) {
  const house = ((sign - lagnaSign + 12) % 12) + 1;
  const prediction = predictHouse({ natal, lagnaSign, lagnaLon, house, birth, moonLon: natal.find((graha) => graha.id === "moon")?.lon ?? 0, when, transit, nodes, sav });
  return (
    <article className="mt-3 border border-[rgb(240_193_78_/_0.35)] bg-card px-4 py-4">
      <h3 className="font-display text-3xl leading-none">{prediction.title}</h3>
      <div className="mt-3 grid gap-4 text-sm">
        {prediction.sections.map((section) => (
          <section key={section.title} className={section.title === "References" ? "border-t border-line pt-3" : ""}>
            <h4 className={section.title === "References" ? "text-[10px] font-semibold uppercase tracking-widest text-muted" : "text-xs font-semibold uppercase tracking-widest text-seal"}>{section.title}</h4>
            <p className={section.title === "References" ? "mt-1 text-xs leading-relaxed text-muted" : "mt-1 leading-relaxed"}>{section.body}</p>
          </section>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted">{prediction.disclaimer}</p>
    </article>
  );
}

const DASHA_LEVELS = ["Mahadasha", "Antardasha", "Pratyantar", "Sukshma", "Prana"] as const;

function indexOfSpan(spans: DashaSpan[], span: DashaSpan): number {
  const index = spans.findIndex((item) => item.start.getTime() === span.start.getTime());
  return index < 0 ? 0 : index;
}

function DashaBoard({ birth, moonLon, timeZone, now }: { birth: Date; moonLon: number; timeZone: string; now: Date }) {
  const running = vimshottari(birth, moonLon, now);
  const mds = mahadashas(birth, moonLon);
  const [choice, setChoice] = useState<number[]>(() => {
    if (!running) return [0, 0, 0, 0, 0];
    const i0 = indexOfSpan(mds, running.mahadasha);
    const ads = subdashas(mds[i0]!);
    const i1 = indexOfSpan(ads, running.antardasha);
    const pds = subdashas(ads[i1]!);
    const i2 = indexOfSpan(pds, running.pratyantar);
    const sds = subdashas(pds[i2]!);
    const i3 = indexOfSpan(sds, running.sukshma);
    return [i0, i1, i2, i3, indexOfSpan(subdashas(sds[i3]!), running.prana)];
  });

  let spans = mds;
  const rows = DASHA_LEVELS.map((name, level) => {
    const selected = Math.min(choice[level] ?? 0, Math.max(0, spans.length - 1));
    const row = { name, spans, selected };
    const current = spans[selected];
    spans = current ? subdashas(current) : [];
    return row;
  });
  const runningLords = running
    ? [running.mahadasha, running.antardasha, running.pratyantar, running.sukshma, running.prana].map((span) => GRAHA_NAME[span.lord]).join(" · ")
    : null;

  return (
    <section className="mt-4 border border-line bg-card px-4 py-4">
      <h3 className="font-display text-3xl leading-none">Vimshottari</h3>
      <p className="mt-2 text-sm text-muted">All five levels, from mahadasha to prana. It opens on the period running now.</p>
      {runningLords ? (
        <p className="mt-3 text-sm">Running now: {runningLords}</p>
      ) : (
        <p className="mt-3 text-sm text-muted">Dasha has not started. The clock is still before this birth time.</p>
      )}
      <div className="mt-4 grid gap-4">
        {rows.map((row, level) => (
          <div key={row.name}>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">
              {row.name}
              {row.spans[row.selected] ? (
                <span className="ml-2 font-normal normal-case tracking-normal text-ink">
                  {GRAHA_NAME[row.spans[row.selected]!.lord]} ·{" "}
                  {formatStamp(row.name === "Mahadasha" && row.spans[row.selected]!.start < birth ? birth : row.spans[row.selected]!.start, timeZone)} –{" "}
                  {formatStamp(row.spans[row.selected]!.end, timeZone)}
                </span>
              ) : null}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {row.spans.map((span, index) => (
                <button
                  key={`${level}-${span.lord}-${span.start.toISOString()}`}
                  type="button"
                  className={index === row.selected ? btnOn : btn}
                  onClick={() =>
                    setChoice((current) => {
                      const next = current.slice(0, level);
                      next[level] = index;
                      while (next.length < 5) next.push(0);
                      return next;
                    })
                  }
                >
                  {GRAHA_NAME[span.lord]}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-line bg-card px-3 py-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted">{label}</p>
      <p className="mt-1 text-sm">{value}</p>
    </div>
  );
}

function ProfileForm({
  draft,
  onChange,
  onSave,
  onCancel,
}: {
  draft: BirthProfile;
  onChange: (profile: BirthProfile) => void;
  onSave: (profile: BirthProfile) => void;
  onCancel?: () => void;
}) {
  return (
    <form
      className="mt-6 grid gap-4 border border-line bg-card p-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(draft);
      }}
    >
      <h2 className="font-display text-3xl leading-none">{draft.id ? "Edit chart" : "New chart"}</h2>
      <label className="grid gap-1 text-xs font-semibold uppercase tracking-widest text-muted">
        Name
        <input className={field} required value={draft.name} placeholder="Me" onChange={(event) => onChange({ ...draft, name: event.target.value })} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-xs font-semibold uppercase tracking-widest text-muted">
          Birth date
          <input
            type="date"
            required
            className={field}
            value={`${String(draft.year).padStart(4, "0")}-${String(draft.month).padStart(2, "0")}-${String(draft.day).padStart(2, "0")}`}
            onChange={(event) => {
              const [year, month, day] = event.target.value.split("-").map(Number);
              if (year && month && day) onChange({ ...draft, year, month, day });
            }}
          />
        </label>
        <label className="grid gap-1 text-xs font-semibold uppercase tracking-widest text-muted">
          Birth time
          <input
            type="time"
            step={1}
            required
            className={field}
            value={`${String(draft.hour).padStart(2, "0")}:${String(draft.minute).padStart(2, "0")}:${String(draft.second).padStart(2, "0")}`}
            onChange={(event) => {
              const [hour, minute, second] = event.target.value.split(":").map(Number);
              if (Number.isFinite(hour) && Number.isFinite(minute)) {
                onChange({ ...draft, hour: hour ?? 0, minute: minute ?? 0, second: second ?? 0 });
              }
            }}
          />
        </label>
      </div>
      <PlaceFields idPrefix="birth" place={draft} onChange={(place) => onChange({ ...draft, ...place })} />
      <div className="flex flex-wrap gap-2">
        {(["lahiri", "kp", "raman"] as AyanamsaId[]).map((id) => (
          <button key={id} type="button" className={draft.ayanamsa === id ? btnOn : btn} onClick={() => onChange({ ...draft, ayanamsa: id })}>
            {AYANAMSA_LABEL[id]}
          </button>
        ))}
        <button type="button" className={draft.node === "true" ? btnOn : btn} onClick={() => onChange({ ...draft, node: "true" })}>
          True Rahu
        </button>
        <button type="button" className={draft.node === "mean" ? btnOn : btn} onClick={() => onChange({ ...draft, node: "mean" })}>
          Mean Rahu
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="inline-flex h-12 items-center justify-center rounded-md bg-seal px-4 text-sm font-semibold text-seal-ink">
          Save birth data
        </button>
        {onCancel && (
          <button type="button" className={btn} onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
