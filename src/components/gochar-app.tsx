import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { getAlmanac } from "@/lib/almanac/api";
import type { AlmanacBoard } from "@/lib/almanac/types";
import {
  AYANAMSA_LABEL,
  GRAHA_ABBR,
  GRAHA_NAME,
  GRAHA_SANSKRIT,
  NAKSHATRAS,
  NAKSHATRA_LORDS,
  RASHIS,
  SIGN_LORD,
  type AyanamsaId,
  type GrahaId,
  type ChartStyle,
  type Division,
  type NodeMode,
} from "@/lib/astro/constants";
import { guessCity } from "@/lib/astro/cities";
import {
  ayanamsaDegrees,
  bodyLongitude,
  computeSky,
  degInSign,
  houseFrom,
  nakshatraIndex,
  navamsaSign,
  norm,
  padaOf,
  signIndex,
  type PanchangCache,
  type SkySnapshot,
} from "@/lib/astro/calc";
import { formatDms, formatSpeed } from "@/lib/astro/format";
import { getLiveNodeEphemeris, type LiveNodeEphemeris } from "@/lib/astro/ephemeris";
import { aspectsOnSign, dignityOf, isCombust, warsOf } from "@/lib/astro/reading";
import {
  dateInputValue,
  formatStamp,
  isValidTimeZone,
  timeInputValue,
  utcToZonedParts,
  zonedToUtc,
} from "@/lib/astro/time";
import { drishtiLabel, drishtiOffsets, type NodeDrishti } from "@/lib/astro/drishti";
import { eclipseDots } from "@/lib/astro/eclipses";
import { FeedbackBox } from "@/components/feedback-box";
import { ShadbalaTable } from "@/components/shadbala-table";
import { AshtakavargaPanel } from "@/components/ashtakavarga-panel";
import { ashtakavarga, SAPTA } from "@/lib/astro/ashtakavarga";
import { PanchangStrip } from "@/components/panchang-strip";
import { DrishtiMenu, useDrishti } from "@/components/drishti-menu";
import { UpcomingTransits } from "@/components/upcoming-panel";
import { PersonalTransitAlerts } from "@/components/personal-transit-alerts";
import { TransitTimeline } from "@/components/transit-timeline";
import { GoldMenu } from "@/components/gold-menu";
import { KundliChart, type ChartPlanet } from "@/components/kundli-chart";
import { PlaceFields, type PlaceValue } from "@/components/place-fields";
import { deliverPng, downloadBlockedHere, renderChartPng } from "@/lib/astro/save-image";
import {
  loadCachedSky,
  loadSnapshots,
  readShareQuery,
  saveCachedSky,
  saveSnapshots,
  shareHref,
  type NamedSnapshot,
} from "@/lib/astro/library";

const PLACE_KEY = "gochar-place";
const SETTINGS_KEY = "gochar-settings";
const NODE_DEFAULT_MIGRATION_KEY = "gochar-node-default-mean-v1";

type Settings = {
  ayanamsa: AyanamsaId;
  node: NodeMode;
  chart: ChartStyle;
  division: Division;
};

const btn = "inline-flex h-12 min-w-12 items-center justify-center rounded-md border border-line bg-card px-4 text-sm font-medium text-ink hover:bg-paper-2";
const btnOn = "inline-flex h-12 items-center justify-center rounded-md bg-ink px-4 text-sm font-medium text-card";
const field = "h-12 rounded-md border border-line bg-card px-3 text-base text-ink";

type TimeDraft = {
  date: string;
  time: string;
  place: PlaceValue;
  guessed: boolean;
  ayanamsa: AyanamsaId;
  node: NodeMode;
  snapName: string;
};

function draftInstant(draft: TimeDraft): Date | null {
  const [year, month, day] = draft.date.split("-").map(Number);
  const [hour, minute, second = 0] = draft.time.split(":").map(Number);
  if (!year || !month || month < 1 || month > 12 || !day || day < 1 || day > 31) return null;
  if (!Number.isFinite(hour) || hour < 0 || hour > 23 || !Number.isFinite(minute) || minute < 0 || minute > 59 || second < 0 || second > 59) return null;
  if (!isValidTimeZone(draft.place.tz) || !Number.isFinite(draft.place.lat) || !Number.isFinite(draft.place.lon)) return null;
  const when = zonedToUtc(year, month, day, hour, minute, second, draft.place.tz);
  if (Number.isNaN(when.getTime())) return null;
  const back = utcToZonedParts(when, draft.place.tz);
  if (back.year !== year || back.month !== month || back.day !== day) return null;
  return when;
}

function readJson<T>(key: string, guard: (value: unknown) => value is T): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return guard(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function isPlace(value: unknown): value is PlaceValue {
  if (!value || typeof value !== "object") return false;
  const place = value as PlaceValue;
  return (
    typeof place.label === "string" &&
    typeof place.lat === "number" &&
    typeof place.lon === "number" &&
    typeof place.tz === "string"
  );
}

function isSettings(value: unknown): value is Settings {
  if (!value || typeof value !== "object") return false;
  const settings = value as Settings;
  return (
    (settings.ayanamsa === "lahiri" || settings.ayanamsa === "raman" || settings.ayanamsa === "kp") &&
    (settings.node === "true" || settings.node === "mean") &&
    (settings.chart === "north" || settings.chart === "south") &&
    (settings.division === "rashi" || settings.division === "navamsa")
  );
}

function initialSettings(): Settings {
  let saved = readJson(SETTINGS_KEY, isSettings);
  try {
    // Earlier builds defaulted new users to True Rahu. Migrate that implicit
    // default once so the live transit follows the standard mean-node ingress.
    if (localStorage.getItem(NODE_DEFAULT_MIGRATION_KEY) !== "1") {
      if (saved?.node === "true") {
        saved = { ...saved, node: "mean" };
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(saved));
      }
      localStorage.setItem(NODE_DEFAULT_MIGRATION_KEY, "1");
    }
  } catch {
    // Continue with the in-memory default when browser storage is unavailable.
  }
  return saved ?? {
    ayanamsa: "lahiri",
    node: "mean",
    chart: "north",
    division: "rashi",
  };
}

function initialPlace(): { place: PlaceValue; guessed: boolean; saved: boolean } {
  const saved = readJson(PLACE_KEY, isPlace);
  if (saved && isValidTimeZone(saved.tz)) return { place: saved, guessed: false, saved: true };
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const city = guessCity(isValidTimeZone(tz) ? tz : "Asia/Kolkata");
  const exact = city.tz === tz;
  return {
    place: {
      label: `${city.name}, ${city.region}`,
      lat: city.lat,
      lon: city.lon,
      tz: exact ? tz : city.tz,
    },
    guessed: !exact,
    saved: false,
  };
}

function groupSigns(sky: SkySnapshot, division: Division): { lagnaSign: number; bySign: ChartPlanet[][] } {
  const bySign: ChartPlanet[][] = Array.from({ length: 12 }, () => []);
  const lagnaSign = division === "navamsa" ? navamsaSign(sky.lagna) : signIndex(sky.lagna);
  const sunLon = sky.grahas.find((graha) => graha.id === "sun")?.lon ?? 0;
  for (const graha of sky.grahas) {
    const sign = division === "navamsa" ? navamsaSign(graha.lon) : signIndex(graha.lon);
    bySign[sign]?.push({
      id: graha.id,
      retro: graha.retro,
      combust: isCombust(graha.id, graha.lon, graha.retro, sunLon),
    });
  }
  return { lagnaSign, bySign };
}

function EclipseSwatch({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className="shrink-0">
      <circle cx="8" cy="8" r="6" fill={color} opacity="0.3" />
      <circle cx="8" cy="8" r="2.4" fill={color} />
    </svg>
  );
}

function GocharMark() {
  return (
    <h1 className="gochar-mark">
      <img src="/gochar-icon-192.png" alt="" aria-hidden="true" className="gochar-logo" />
      <span className="gochar-word">Gochar</span>
    </h1>
  );
}

function Shell() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-seal">Sidereal</p>
      <div className="mt-2">
        <GocharMark />
      </div>
      <p className="mt-3 text-muted">Reading the sidereal sky…</p>
    </main>
  );
}

export function GocharApp() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <Shell />;
  return <SkyScreen />;
}

function SkyScreen() {
  const seeded = useMemo(() => initialPlace(), []);
  const shared = useMemo(() => readShareQuery(window.location.search), []);
  const savedPlace = seeded.saved || shared !== null;
  const [place, setPlace] = useState<PlaceValue>(shared?.place ?? seeded.place);
  const [guessed, setGuessed] = useState(shared ? false : seeded.guessed);
  const [instant, setInstant] = useState(() => shared?.instant ?? new Date());
  const [horizon, setHorizon] = useState(instant);
  const [now, setNow] = useState(() => new Date());
  const [live, setLive] = useState(shared === null);
  const [saveNote, setSaveNote] = useState<string | null>(null);
  const [actionNote, setActionNote] = useState<string | null>(null);
  const [chartFile, setChartFile] = useState<{ url: string; framed: boolean } | null>(null);
  const [board, setBoard] = useState<AlmanacBoard | null>(null);
  const [saving, setSaving] = useState(false);
  const [editor, setEditor] = useState<TimeDraft | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [planetId, setPlanetId] = useState<GrahaId | null>(null);
  const [factsOpen, setFactsOpen] = useState(false);
  const [viewLagna, setViewLagna] = useState<number | null>(null);
  const [snapshots, setSnapshots] = useState<NamedSnapshot[]>([]);
  const [snapName, setSnapName] = useState("");
  const [sky, setSky] = useState<SkySnapshot | null>(() => {
    const cached = loadCachedSky();
    if (!cached) return null;
    const saved = initialSettings();
    const query = readShareQuery(window.location.search);
    const node = query?.node ?? saved.node;
    const ayanamsa = query?.ayanamsa ?? saved.ayanamsa;
    if (cached.nodeMode !== node || cached.ayanamsaId !== ayanamsa) return null;
    return cached;
  });
  const [fromCache, setFromCache] = useState(() => loadCachedSky() !== null);
  const [skyError, setSkyError] = useState<string | null>(null);
  const [jplNode, setJplNode] = useState<LiveNodeEphemeris | null>(null);
  const [jplNodeStatus, setJplNodeStatus] = useState<"loading" | "ready" | "offline" | "not-applicable">("loading");
  const [settings, setSettings] = useState<Settings>(() => initialSettings());
  const viewAyanamsa = shared?.ayanamsa ?? settings.ayanamsa;
  const viewNode = shared?.node ?? settings.node;
  const jplBucket = Math.floor(instant.getTime() / (5 * 60_000)) * (5 * 60_000);

  useEffect(() => {
    let cancel = false;
    if (viewNode !== "true") {
      setJplNode(null);
      setJplNodeStatus("not-applicable");
      return;
    }
    setJplNodeStatus("loading");
    const timer = window.setTimeout(() => {
      getLiveNodeEphemeris({ data: new Date(jplBucket).toISOString() })
        .then((value) => {
          if (cancel) return;
          setJplNode(value);
          setJplNodeStatus("ready");
        })
        .catch(() => {
          if (cancel) return;
          setJplNode(null);
          setJplNodeStatus("offline");
        });
    }, 350);
    return () => {
      cancel = true;
      window.clearTimeout(timer);
    };
  }, [jplBucket, viewNode]);

  const skyCache = useRef<PanchangCache | null>(null);
  const skySavedAt = useRef(0);
  const followNow = useRef(shared === null);
  const drishti = useDrishti("gochar-drishti");

  useEffect(() => {
    const tick = () => setNow(new Date());
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!live) return;
    let timer = 0;
    const arm = () => {
      if (!followNow.current) return;
      const when = new Date();
      setInstant(when);
      timer = window.setTimeout(arm, Math.max(50, 1000 - (Date.now() % 1000)));
    };
    arm();
    return () => window.clearTimeout(timer);
  }, [live]);

  useEffect(() => {
    const id = window.setTimeout(() => setHorizon(instant), 400);
    return () => window.clearTimeout(id);
  }, [instant]);

  useEffect(() => {
    localStorage.setItem(PLACE_KEY, JSON.stringify(place));
  }, [place]);

  useEffect(() => {
    if (!editor) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setEditor(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [editor]);

  useEffect(() => {
    setViewLagna(null);
  }, [settings.division]);

  useEffect(() => {
    setSnapshots(loadSnapshots());
  }, []);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    let cancel = false;
    getAlmanac()
      .then((next) => {
        if (cancel) return;
        setBoard(next);
        if (!savedPlace && isValidTimeZone(next.tz)) {
          setPlace({ label: next.placeLabel, lat: next.lat, lon: next.lon, tz: next.tz });
          setGuessed(false);
        }
      })
      .catch(() => undefined);
    return () => {
      cancel = true;
    };
  }, []);

  const zoneOk = isValidTimeZone(place.tz);
  const coordsOk = place.lat >= -89 && place.lat <= 89 && place.lon >= -180 && place.lon <= 180;
  const parts = zoneOk ? utcToZonedParts(instant, place.tz) : null;
  const transitParts = zoneOk ? utcToZonedParts(instant, place.tz) : null;

  useEffect(() => {
    let cancel = false;
    const timer = window.setTimeout(() => {
      if (!zoneOk) {
        if (!cancel) setSkyError("That time zone name is not recognized.");
        return;
      }
      if (Math.abs(place.lat) > 89) {
        if (!cancel) setSkyError("Lagna is undefined this close to a pole. Move a little toward the equator.");
        return;
      }
      if (!coordsOk) {
        if (!cancel) setSkyError("Latitude must be within ±89° and longitude within ±180°.");
        return;
      }
      try {
        skyCache.current ??= {
          placeKey: "",
          dayKey: "",
          sunrise: null,
          sunset: null,
          tithiIndex: -1,
          tithiEnds: null,
          nakIndex: -1,
          nakEnds: null,
          yogaIndex: -1,
          yogaEnds: null,
          karanaIndex: -1,
          karanaEnds: null,
          speedAt: 0,
          speeds: [],
        };
        const next = computeSky(instant, place.lat, place.lon, place.tz, viewAyanamsa, viewNode, skyCache.current);
        if (cancel) return;
        setSky(next);
        setFromCache(false);
        setSkyError(null);
        if (Date.now() - skySavedAt.current > 30_000) {
          skySavedAt.current = Date.now();
          saveCachedSky(next);
        }
      } catch (error) {
        if (!cancel) setSkyError(error instanceof Error ? error.message : "This moment could not be calculated.");
      }
    }, 0);
    return () => {
      cancel = true;
      window.clearTimeout(timer);
    };
  }, [instant, place.lat, place.lon, place.tz, viewAyanamsa, viewNode, zoneOk, coordsOk]);

  const displaySky = useMemo(() => {
    if (!sky || viewNode !== "true" || !jplNode) return sky;
    const sampledAt = new Date(jplNode.sampledAt);
    if (
      !Number.isFinite(sampledAt.getTime()) ||
      Math.floor(sampledAt.getTime() / (5 * 60_000)) * (5 * 60_000) !== jplBucket
    ) return sky;

    const localAtSample = bodyLongitude("rahu", sampledAt, viewAyanamsa, "true");
    const jplSidereal = norm(jplNode.tropicalLongitude - ayanamsaDegrees(sampledAt, viewAyanamsa));
    let correction = jplSidereal - localAtSample;
    if (correction > 180) correction -= 360;
    if (correction < -180) correction += 360;
    const localRahu = sky.grahas.find((graha) => graha.id === "rahu");
    if (!localRahu) return sky;
    const correctedRahu = norm(localRahu.lon + correction);
    return {
      ...sky,
      grahas: sky.grahas.map((graha) =>
        graha.id === "rahu"
          ? { ...graha, lon: correctedRahu }
          : graha.id === "ketu"
            ? { ...graha, lon: norm(correctedRahu + 180) }
            : graha,
      ),
    };
  }, [sky, viewNode, jplNode, jplBucket, viewAyanamsa]);

  function openEditor() {
    if (!parts) return;
    setEditorError(null);
    setEditor({
      date: dateInputValue(parts),
      time: timeInputValue(parts),
      place,
      guessed,
      ayanamsa: viewAyanamsa,
      node: viewNode,
      snapName,
    });
  }

  function applyEditor() {
    if (!editor) return;
    const when = draftInstant(editor);
    if (!when) {
      setEditorError("Enter a real date, time, and place.");
      return;
    }
    if (!editor.place.label.trim()) {
      setEditorError("Choose a place.");
      return;
    }
    setLive(false);
    followNow.current = false;
    setInstant(when);
    setPlace(editor.place);
    setGuessed(editor.guessed);
    setSettings((current) => ({ ...current, ayanamsa: editor.ayanamsa, node: editor.node }));
    setSnapName(editor.snapName);
    setEditorError(null);
    setEditor(null);
  }

  const lagnaSign = displaySky ? signIndex(displaySky.lagna) : 0;
  const rashi = RASHIS[lagnaSign];
  const chart = displaySky ? groupSigns(displaySky, settings.division) : null;
  const eclipseMinute = Math.floor(instant.getTime() / 60000);
  const eclipses = useMemo(
    () => eclipseDots(new Date(eclipseMinute * 60000), viewAyanamsa, settings.division),
    [eclipseMinute, viewAyanamsa, settings.division],
  );
  const chartLagnaLon = displaySky
    ? settings.division === "navamsa"
      ? null
      : displaySky.lagna
    : null;
  const sun = displaySky?.grahas.find((graha) => graha.id === "sun");

  async function saveChart() {
    if (!displaySky || saving) return;
    setSaving(true);
    setSaveNote(null);
    try {
      const nodes = [...document.querySelectorAll<SVGSVGElement>("svg[data-kundli]")];
      const lines = [
        `${settings.division === "navamsa" ? "Navamsa" : "Rashi"} · ${settings.chart === "north" ? "North" : "South"} Indian`,
        formatStamp(instant, place.tz),
        place.label,
        `${AYANAMSA_LABEL[viewAyanamsa]} · ${formatDms(displaySky.ayanamsa)} · ${viewNode === "true" ? "True" : "Mean"} Rahu ${RASHIS[signIndex(displaySky.grahas.find((graha) => graha.id === "rahu")?.lon ?? 0)]?.name}`,
        ...displaySky.grahas.map((graha) => `${GRAHA_ABBR[graha.id]}${graha.retro ? "R" : ""} ${RASHIS[signIndex(graha.lon)]?.abbr} ${formatDms(degInSign(graha.lon), true)}`),
      ];
      const picture = await renderChartPng(nodes, lines);
      const framed = downloadBlockedHere();
      const delivered = await deliverPng(picture.blob, "gochar-chart.png");
      setChartFile({ url: picture.dataUrl, framed: framed || delivered === "blocked" });
      setSaveNote(
        delivered === "shared"
          ? "Share sheet opened."
          : delivered === "saved"
            ? "Download started. If nothing arrived, use the picture."
            : "This preview blocks file downloads. Hold the picture to save it.",
      );
    } catch (error) {
      setSaveNote(error instanceof Error ? error.message : "The chart could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  const occupants =
    picked !== null && displaySky
      ? displaySky.grahas.filter((graha) => (settings.division === "navamsa" ? navamsaSign(graha.lon) : signIndex(graha.lon)) === picked)
      : [];
  const pickedNote =
    picked !== null && displaySky
      ? `${picked + 1} ${RASHIS[picked]?.name ?? ""} · lord ${GRAHA_NAME[SIGN_LORD[picked]!]}${
          occupants.length
            ? ` · ${occupants
                .map((graha) => {
                  const dignity = dignityOf(graha.id, graha.lon);
                  const combust = sun ? isCombust(graha.id, graha.lon, graha.retro, sun.lon) : false;
                  return `${GRAHA_NAME[graha.id]} ${formatDms(degInSign(graha.lon), true)}${graha.retro ? ", retrograde" : ", direct"}${dignity ? `, ${dignity}` : ""}${combust ? ", combust" : ""}`;
                })
                .join("; ")}`
            : " · empty"
        }`
      : null;

  async function copyText(text: string, note: string) {
    try {
      await navigator.clipboard.writeText(text);
      setActionNote(note);
    } catch {
      setActionNote(text);
    }
  }

  return (
    <main className="gochar-page mx-auto min-h-screen w-full max-w-3xl px-4 pb-8 pt-4 sm:pt-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-max flex-col items-start">
          <GocharMark />

        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            className="gochar-edit inline-flex h-10 items-center justify-center rounded-md border border-line bg-card px-2 text-[11px] font-medium leading-none text-ink sm:h-12 sm:px-3 sm:text-sm"
            onClick={openEditor}
          >
            Edit time / place
          </button>
          <button
            type="button"
            className="live-beacon inline-flex h-10 shrink-0 items-center justify-center rounded-md bg-seal px-3 text-sm font-semibold text-seal-ink sm:h-12 sm:px-5"
            onClick={() => {
              followNow.current = true;
              setLive(true);
              setInstant(new Date());
              setViewLagna(null);
              setPicked(null);
            }}
          >
            Now
          </button>
        </div>
      </header>
      {board?.notice ? <p className="mt-4 border border-line bg-card px-4 py-3 text-sm">{board.notice}</p> : null}

      <div className="gochar-controls mt-4 grid grid-cols-2 items-center gap-2">
        <GoldChoice
          label="Chart Style"
          value={settings.chart}
          options={[
            ["north", "North Indian"],
            ["south", "South Indian"],
          ]}
          onChange={(chart) => setSettings({ ...settings, chart: chart as ChartStyle })}
        />
        <GoldChoice
          label="Chart Type"
          value={settings.division}
          options={[
            ["rashi", "Rashi"],
            ["navamsa", "Navamsa"],
          ]}
          onChange={(division) => setSettings({ ...settings, division: division as Division })}
        />
      </div>

      <div className="gochar-controls mt-2 grid grid-cols-2 items-center gap-2">
        <Link
          to="/charts"
          className="inline-flex h-12 w-full items-center justify-center rounded-md bg-seal px-3 text-sm font-semibold text-seal-ink"
        >
          Birth charts
        </Link>
        <DrishtiMenu
          compact
          appliedIds={drishti.ids}
          appliedNodes={drishti.nodes}
          onApply={(ids, nodes) => {
            drishti.setIds(ids);
            drishti.setNodes(nodes);
          }}
          note={settings.division === "navamsa" ? "Shown on the rashi chart. Navamsa houses are not the houses of this drishti." : null}
        />
      </div>

      <p className="gochar-section-label mx-auto mt-3 flex max-w-xl items-center gap-3 text-[10px] font-semibold uppercase">
        <span className="h-px min-w-0 flex-1 bg-gradient-to-r from-transparent to-[rgb(240_193_78_/_0.4)]" />
        Transit / Gochar
        <span className="h-px min-w-0 flex-1 bg-gradient-to-l from-transparent to-[rgb(240_193_78_/_0.4)]" />
      </p>
      <div className="kundli-frame mx-auto mt-1 max-w-xl p-2">
        {displaySky && chart && rashi ? (
          <KundliChart
            style={settings.chart}
            lagnaSign={viewLagna ?? chart.lagnaSign}
            bySign={chart.bySign}
            caption={settings.division === "navamsa" ? "Navamsa" : "Lagna"}
            headline=""
            detail={
              viewLagna !== null
                ? "Asc"
                : chartLagnaLon === null
                  ? "D9"
                  : formatDms(degInSign(chartLagnaLon), true)
            }
            label={`${settings.chart === "north" ? "North" : "South"} Indian ${settings.division} chart. Lagna ${RASHIS[(viewLagna ?? chart.lagnaSign)]?.name}.`}
            mark="transit"
            eclipses={eclipses}
            drishti={settings.division === "rashi" ? { ids: drishti.ids, nodes: drishti.nodes } : null}
            selectedSign={picked}
            onPick={(sign) => {
              setViewLagna(sign);
              setPicked(sign);
              setPlanetId(null);
            }}
            selectedPlanet={planetId}
            onPlanet={(id) => setPlanetId((current) => (current === id ? null : id))}
          />
        ) : (
          <p className="px-4 py-16 text-center text-sm text-muted">{skyError ?? "Reading the sidereal sky…"}</p>
        )}
      </div>
      {displaySky ? (
        <RahuLine
          sky={displaySky}
          ayanamsa={viewAyanamsa}
          node={viewNode}
          navamsa={settings.division === "navamsa"}
          lagnaSign={viewLagna ?? chart?.lagnaSign ?? lagnaSign}
          source={viewNode === "mean" ? "Calculated mean lunar node" : jplNodeStatus === "ready" ? "NASA/JPL Horizons true-node reference" : jplNodeStatus === "offline" ? "Astronomy Engine fallback · Horizons unavailable" : "Astronomy Engine · checking NASA/JPL Horizons"}
          updatedAt={viewNode === "true" ? jplNode?.retrievedAt ?? null : null}
        />
      ) : null}
      {displaySky && planetId && <PlanetPanel sky={displaySky} id={planetId} division={settings.division} lagnaSign={viewLagna ?? chart?.lagnaSign ?? lagnaSign} nodes={drishti.nodes} onClose={() => setPlanetId(null)} />}
      {displaySky && chart && <SkyFacts sky={displaySky} division={settings.division} lagnaSign={viewLagna ?? chart.lagnaSign} open={factsOpen} onToggle={() => setFactsOpen((current) => !current)} />}
      <TransitTimeline
        instant={instant}
        now={now}
        timeZone={place.tz}
        onSeek={(when) => {
          followNow.current = false;
          setLive(false);
          setInstant(when);
          setViewLagna(null);
          setPicked(null);
        }}
      />
      <UpcomingTransits from={horizon} now={now} timeZone={place.tz} ayanamsa={viewAyanamsa} node={viewNode} nodes={drishti.nodes} />
      <PersonalTransitAlerts />
      {eclipses.length > 0 && (
        <div className="mx-auto mt-2 flex max-w-xl flex-col items-center gap-1 text-center text-[11px] leading-snug text-muted">
          <p className="inline-flex items-center gap-2">
            <EclipseSwatch color="#f0c14e" />
            golden dot is an approaching solar eclipse, or one just past
          </p>
          <p className="inline-flex items-center gap-2">
            <EclipseSwatch color="#f7f4ee" />
            white dot is an approaching lunar eclipse, or one just past
          </p>
          <p>Shown only from 40 days before until 40 days after.</p>
        </div>
      )}
      {pickedNote && !planetId && <p className="mt-2 border border-line bg-card px-4 py-3 text-sm">{pickedNote}</p>}
      {saveNote && <p className="mt-2 text-sm text-muted">{saveNote}</p>}

      <p className="mt-3 text-[13px] text-muted">
        <span>{place.label}</span>
        {transitParts ? <span className="tabular-nums"> · {formatStamp(instant, place.tz)}:{transitParts.second.toString().padStart(2, "0")}</span> : null}
        <span className="font-semibold text-seal"> · {viewState(instant, now, live)}</span>
        {fromCache ? <span> · last chart</span> : null}
      </p>

      {editor && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 sm:items-center"
          data-no-swipe
          onClick={() => {
            setEditor(null);
            setEditorError(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-time-title"
            className="flex max-h-[min(40rem,calc(100dvh-1.5rem))] w-full max-w-lg flex-col border border-[#a68534] bg-paper shadow-[0_24px_60px_rgb(0_0_0_/_0.55)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
              <h2 id="edit-time-title" className="font-display text-3xl leading-none">
                Edit Time & Location
              </h2>
              <button
                type="button"
                aria-label="Close"
                className="inline-flex h-10 w-10 items-center justify-center text-xl text-seal"
                onClick={() => {
                  setEditor(null);
                  setEditorError(null);
                }}
              >
                ×
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              <div className="flex flex-wrap items-end gap-3">
                <label className="grid gap-1 text-xs font-semibold uppercase tracking-widest text-muted">
                  Date
                  <input
                    type="date"
                    className={field}
                    value={editor.date}
                    onChange={(event) => setEditor({ ...editor, date: event.target.value })}
                  />
                </label>
                <label className="grid gap-1 text-xs font-semibold uppercase tracking-widest text-muted">
                  Time
                  <input
                    type="time"
                    step={1}
                    className={`${field} tabular-nums`}
                    value={editor.time}
                    onChange={(event) => setEditor({ ...editor, time: event.target.value })}
                  />
                </label>
              </div>
              <div className="mt-3">
                <PlaceFields
                  idPrefix="sky"
                  place={editor.place}
                  onChange={(next) => setEditor({ ...editor, place: next, guessed: false })}
                />
              </div>
              {editor.guessed && <p className="mt-2 text-sm text-muted">Place was guessed from the time zone. Search the city or use this device.</p>}
              <div className="mt-4 flex flex-wrap gap-2">
                <Select
                  label="Ayanamsa"
                  value={editor.ayanamsa}
                  onChange={(ayanamsa) => setEditor({ ...editor, ayanamsa: ayanamsa as AyanamsaId })}
                  options={[
                    ["lahiri", "Lahiri"],
                    ["kp", "Krishnamurti"],
                    ["raman", "B.V. Raman"],
                  ]}
                />
                <Select
                  label="Nodes"
                  value={editor.node}
                  onChange={(node) => setEditor({ ...editor, node: node as NodeMode })}
                  options={[
                    ["true", "True Rahu"],
                    ["mean", "Mean Rahu"],
                  ]}
                />
              </div>
              <div className="mt-4 flex flex-wrap items-end gap-2">
                <label className="grid min-w-48 flex-1 gap-1 text-xs font-semibold uppercase tracking-widest text-muted">
                  Name this moment
                  <input
                    className={field}
                    value={editor.snapName}
                    placeholder="interview 10am"
                    onChange={(event) => setEditor({ ...editor, snapName: event.target.value })}
                  />
                </label>
                <button
                  type="button"
                  className={btn}
                  onClick={() => {
                    const name = editor.snapName.trim();
                    const when = draftInstant(editor);
                    if (!name || !when) {
                      setEditorError(name ? "Enter a real date, time, and place." : "Name this moment first.");
                      return;
                    }
                    const next = [
                      { id: crypto.randomUUID(), name, instant: when.toISOString(), place: editor.place, ayanamsa: editor.ayanamsa, node: editor.node },
                      ...snapshots,
                    ].slice(0, 12);
                    setSnapshots(next);
                    saveSnapshots(next);
                    setEditor({ ...editor, snapName: "" });
                    setEditorError(null);
                  }}
                >
                  Save snapshot
                </button>
              </div>
              {snapshots.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {snapshots.map((snap) => (
                    <button
                      key={snap.id}
                      type="button"
                      className={btn}
                      onClick={() => {
                        const when = new Date(snap.instant);
                        if (Number.isNaN(when.getTime()) || !isValidTimeZone(snap.place.tz)) return;
                        const next = utcToZonedParts(when, snap.place.tz);
                        setEditor({
                          ...editor,
                          date: dateInputValue(next),
                          time: timeInputValue(next),
                          place: snap.place,
                          guessed: false,
                          ayanamsa: snap.ayanamsa,
                          node: snap.node,
                        });
                        setEditorError(null);
                      }}
                    >
                      {snap.name}
                    </button>
                  ))}
                </div>
              )}
              {editorError ? <p className="mt-3 text-sm text-seal">{editorError}</p> : null}
            </div>
            <div className="border-t border-line p-3">
              <button type="button" className="h-12 w-full rounded-md bg-[#f0c14e] text-sm font-semibold text-[#1c1406]" onClick={applyEditor}>
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {displaySky && rashi && chart && (
        <div className="mt-8 grid min-w-0 grid-cols-1 gap-4 *:min-w-0">
          <div className="min-w-0 border border-line bg-card p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-seal">Lagna</p>
            <h2 className="mt-1 break-words font-display text-4xl leading-none">{rashi.sanskrit}</h2>
            <p className="mt-2 break-words">
              {rashi.name}
              <span className="tabular-nums"> · {formatDms(degInSign(displaySky.lagna), true)}</span>
            </p>
            <p className="mt-1 break-words text-sm text-muted">
              {NAKSHATRAS[nakshatraIndex(displaySky.lagna)]} · pada {padaOf(displaySky.lagna)} · lord {GRAHA_NAME[SIGN_LORD[lagnaSign]!]}
            </p>
          </div>
          <PanchangStrip sky={displaySky} timeZone={place.tz} instant={instant} />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={btn}
              onClick={() =>
                void copyText(
                  [`Lagna ${formatDms(displaySky.lagna)}`, ...displaySky.grahas.map((graha) => `${GRAHA_NAME[graha.id]} ${formatDms(graha.lon)}${graha.retro ? " R" : ""}`)].join("\n"),
                  "Degrees copied.",
                )
              }
            >
              Copy degrees
            </button>
            <button
              type="button"
              className={btn}
              onClick={() =>
                void copyText(
                  [
                    "Graha\tRashi\tDegree\tNakshatra\tPada",
                    `Lagna\t${RASHIS[signIndex(displaySky.lagna)]?.name}\t${formatDms(degInSign(displaySky.lagna), true)}\t${NAKSHATRAS[nakshatraIndex(displaySky.lagna)]}\t${padaOf(displaySky.lagna)}`,
                    ...displaySky.grahas.map(
                      (graha) =>
                        `${GRAHA_NAME[graha.id]}\t${RASHIS[signIndex(graha.lon)]?.name}\t${formatDms(degInSign(graha.lon), true)}\t${NAKSHATRAS[nakshatraIndex(graha.lon)]}\t${padaOf(graha.lon)}`,
                    ),
                  ].join("\n"),
                  "Table copied.",
                )
              }
            >
              Copy table
            </button>
            <button
              type="button"
              className={btn}
              onClick={() => void copyText(shareHref(window.location.origin, instant, place, viewAyanamsa, viewNode), "Share link copied.")}
            >
              Share link
            </button>
          </div>
          {actionNote && <p className="text-sm text-muted">{actionNote}</p>}
          <GrahaTable sky={displaySky} sunLon={sun?.lon ?? 0} lagnaSign={lagnaSign} />
          <ShadbalaTable sky={displaySky} when={instant} timeZone={place.tz} title="Shadbala" />
          <AshtakavargaPanel
            chart={ashtakavarga(displaySky.grahas, displaySky.lagna)}
            lagnaSign={lagnaSign}
            transits={SAPTA.flatMap((id) => {
              const graha = displaySky.grahas.find((item) => item.id === id);
              return graha ? [{ id, sign: signIndex(graha.lon) }] : [];
            })}
            note="These bindus belong to the chart at the time above. Move the time to read an earlier or later transit."
          />
          {warsOf(displaySky.grahas).length > 0 && <p className="text-sm text-muted">Graha yuddha: {warsOf(displaySky.grahas).join("; ")}.</p>}
        </div>
      )}

      <footer className="mt-8 border-t border-line pt-4 text-sm text-muted">
        {board?.footer ? <p className="mb-2 text-ink">{board.footer}</p> : null}
        <p>Whole-sign houses. True node is the default Rahu. Not a substitute for a jyotishi.</p>
        <a href="/?install=1" className="mt-2 inline-block text-ink">
          Add to Home Screen
        </a>
      </footer>
      <FeedbackBox page="gochar" />

      <div className="mt-6 flex justify-end border-t border-line pt-4">
        <Link to="/developer" className="developer-button">
          <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
            <circle cx="8" cy="8" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.2" />
            <path d="M8 1.5 V4 M8 12 V14.5 M1.5 8 H4 M12 8 H14.5 M3.4 3.4 L5.1 5.1 M10.9 10.9 L12.6 12.6 M12.6 3.4 L10.9 5.1 M5.1 10.9 L3.4 12.6" fill="none" stroke="currentColor" strokeWidth="1.2" />
          </svg>
          <span className="developer-button__label">Developer</span>
        </Link>
      </div>

      {chartFile && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-veil/80 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="save-chart-title">
          <div className="max-h-[92vh] w-full max-w-md overflow-auto border border-line bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <h2 id="save-chart-title" className="font-display text-3xl leading-none">
                Save this chart
              </h2>
              <button type="button" className={btn} onClick={() => setChartFile(null)}>
                Close
              </button>
            </div>
            <p className="mt-3 text-sm text-muted">
              {chartFile.framed
                ? "The chat preview is not allowed to send a file to your device. Press and hold the picture (or right-click it) and choose Save image."
                : "The picture includes the chart and the degree table. If the file did not download, press and hold the picture."}
            </p>
            <img src={chartFile.url} alt="Gochar chart to save" className="mt-4 max-h-[50vh] w-full border border-line bg-paper object-contain" />
            {!chartFile.framed && (
              <a href={chartFile.url} download="gochar-chart.png" className={`${btnOn} mt-4 no-underline`}>
                Download PNG
              </a>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

function RahuLine({
  sky,
  ayanamsa,
  node,
  navamsa,
  lagnaSign,
  source,
  updatedAt,
}: {
  sky: SkySnapshot;
  ayanamsa: AyanamsaId;
  node: NodeMode;
  navamsa: boolean;
  lagnaSign: number;
  source: string;
  updatedAt: string | null;
}) {
  const rahu = sky.grahas.find((graha) => graha.id === "rahu");
  const ketu = sky.grahas.find((graha) => graha.id === "ketu");
  if (!rahu || !ketu) return null;

  const rahuSign = navamsa ? navamsaSign(rahu.lon) : signIndex(rahu.lon);
  const ketuSign = navamsa ? navamsaSign(ketu.lon) : signIndex(ketu.lon);
  const rahuHouse = houseFrom(rahuSign, lagnaSign);
  const ketuHouse = houseFrom(ketuSign, lagnaSign);

  return (
    <section className="mx-auto mt-2 max-w-xl border border-[rgb(240_193_78_/_0.3)] bg-card px-3 py-2.5" aria-label="Rahu and Ketu nodal axis">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-seal">Rahu · Ketu axis</p>
        <p className="text-[10px] text-muted">
          {node === "true" ? "True node" : "Mean node"} · {AYANAMSA_LABEL[ayanamsa]} · {navamsa ? "Navamsa" : "Rashi"}
          <span className="block">{source}{updatedAt ? ` · checked ${new Date(updatedAt).toLocaleTimeString()}` : ""}</span>
        </p>
      </div>
      <div className="mt-2 grid grid-cols-2 divide-x divide-line">
        <div className="min-w-0 pr-3">
          <p className="text-xs font-semibold text-seal">Rahu · House {rahuHouse}</p>
          <p className="mt-0.5 font-display text-xl leading-tight">{RASHIS[rahuSign]?.name}</p>
          <p className="mt-0.5 text-xs tabular-nums text-muted">{formatDms(degInSign(rahu.lon), true)}</p>
        </div>
        <div className="min-w-0 pl-3 text-right">
          <p className="text-xs font-semibold text-seal">Ketu · House {ketuHouse}</p>
          <p className="mt-0.5 font-display text-xl leading-tight">{RASHIS[ketuSign]?.name}</p>
          <p className="mt-0.5 text-xs tabular-nums text-muted">{formatDms(degInSign(ketu.lon), true)}</p>
        </div>
      </div>
    </section>
  );
}

function viewState(instant: Date, now: Date, live: boolean): string {
  const skew = instant.getTime() - now.getTime();
  if (live || Math.abs(skew) < 90_000) return "LIVE";
  return skew < 0 ? "HISTORICAL VIEW" : "FUTURE VIEW";
}

function SkyFacts({
  sky,
  division,
  lagnaSign,
  open,
  onToggle,
}: {
  sky: SkySnapshot;
  division: Division;
  lagnaSign: number;
  open: boolean;
  onToggle: () => void;
}) {
  const moon = sky.grahas.find((graha) => graha.id === "moon");
  if (!moon) return null;
  const moonSign = division === "navamsa" ? navamsaSign(moon.lon) : signIndex(moon.lon);
  const nak = nakshatraIndex(moon.lon);
  return (
    <div className="mx-auto mt-2 max-w-xl">
      <button type="button" aria-expanded={open} className="flex w-full items-center justify-between gap-3 border border-line bg-card px-3 py-2 text-left text-xs text-muted" onClick={onToggle}>
        <span className="min-w-0 truncate">
          <span className="text-seal">Lagna</span> {RASHIS[lagnaSign]?.name}
          <span className="text-seal"> · Moon</span> {RASHIS[moonSign]?.name}
          <span className="text-seal"> · </span>
          {NAKSHATRAS[nak]}
        </span>
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-seal">{open ? "Hide" : "More"}</span>
      </button>
      {open ? (
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 border border-t-0 border-line bg-card px-3 py-2 text-sm">
          <p>Lagna {formatDms(degInSign(sky.lagna), true)}</p>
          <p>Moon {formatDms(degInSign(moon.lon), true)}</p>
          <p>
            {NAKSHATRAS[nak]} · pada {padaOf(moon.lon)}
          </p>
          <p>Transit · Moon in house {houseFrom(moonSign, lagnaSign)}</p>
        </div>
      ) : null}
    </div>
  );
}

function PlanetPanel({
  sky,
  id,
  division,
  lagnaSign,
  nodes,
  onClose,
}: {
  sky: SkySnapshot;
  id: GrahaId;
  division: Division;
  lagnaSign: number;
  nodes: NodeDrishti;
  onClose: () => void;
}) {
  const graha = sky.grahas.find((item) => item.id === id);
  const sun = sky.grahas.find((item) => item.id === "sun");
  if (!graha) return null;
  const rashi = signIndex(graha.lon);
  const shown = division === "navamsa" ? navamsaSign(graha.lon) : rashi;
  const nak = nakshatraIndex(graha.lon);
  const combust = sun ? isCombust(graha.id, graha.lon, graha.retro, sun.lon) : false;
  const dignity = dignityOf(graha.id, graha.lon);
  const casts = drishtiOffsets(graha.id, nodes).map((offset) => `${drishtiLabel(offset)} ${RASHIS[(rashi + offset) % 12]?.name}`);
  const received = sky.grahas
    .filter((other) => other.id !== graha.id && drishtiOffsets(other.id, nodes).some((offset) => (signIndex(other.lon) + offset) % 12 === rashi))
    .map((other) => GRAHA_NAME[other.id]);
  return (
    <section className="mx-auto mt-2 max-w-xl border border-[rgb(240_193_78_/_0.35)] bg-card px-3 py-2.5" aria-label={`${GRAHA_NAME[id]} details`}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-2xl leading-none">{GRAHA_NAME[id]}</h2>
        <button type="button" className="text-xs font-semibold uppercase tracking-[0.14em] text-seal" onClick={onClose}>
          Close
        </button>
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
        <div>
          <dt className="text-[10px] uppercase tracking-[0.14em] text-muted">Degree</dt>
          <dd className="tabular-nums">{formatDms(degInSign(graha.lon), true)}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-[0.14em] text-muted">Sign</dt>
          <dd>
            {RASHIS[rashi]?.name}
            {division === "navamsa" ? ` · D9 ${RASHIS[shown]?.name}` : ""}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-[0.14em] text-muted">Nakshatra</dt>
          <dd>
            {NAKSHATRAS[nak]} · pada {padaOf(graha.lon)}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-[0.14em] text-muted">House</dt>
          <dd>{houseFrom(shown, lagnaSign)}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-[0.14em] text-muted">Motion</dt>
          <dd>{graha.retro ? "Retrograde" : "Direct"}{dignity ? ` · ${dignity}` : ""}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-[0.14em] text-muted">Combustion</dt>
          <dd>{combust ? "Combust" : "Not combust"}</dd>
        </div>
      </dl>
      <p className="mt-2 text-xs leading-relaxed text-muted">
        Drishti {casts.join(", ") || "none"}.
        {received.length ? ` Aspected by ${received.join(", ")}.` : " No graha aspects this sign."}
        {division === "navamsa" ? " Drishti is read from the rashi." : ""}
      </p>
    </section>
  );
}

function GoldChoice({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: [string, string][];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find(([id]) => id === value)?.[1] ?? value;
  return (
    <GoldMenu className="gochar-gold-control" label={label} summary={current} open={open} onOpenChange={setOpen}>
      {options.map(([id, name]) => (
        <button
          key={id}
          type="button"
          className="flex h-10 w-full items-center px-1 text-left text-sm text-ink"
          onClick={() => {
            onChange(id);
            setOpen(false);
          }}
        >
          {name}
        </button>
      ))}
    </GoldMenu>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
}) {
  const [open, setOpen] = useState(false);
  const current = options.find(([id]) => id === value)?.[1] ?? value;
  return (
    <GoldMenu className="min-w-40 flex-1" label={label} summary={current} open={open} onOpenChange={setOpen}>
      {options.map(([id, name]) => (
        <button
          key={id}
          type="button"
          className="flex h-10 w-full items-center px-1 text-left text-sm text-ink"
          onClick={() => {
            onChange(id);
            setOpen(false);
          }}
        >
          {name}
        </button>
      ))}
    </GoldMenu>
  );
}

function GrahaTable({ sky, sunLon, lagnaSign }: { sky: SkySnapshot; sunLon: number; lagnaSign: number }) {
  return (
    <div className="min-w-0 overflow-x-auto border border-line bg-card" data-no-swipe>
      <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
        <caption className="sr-only">Sidereal positions at the chosen moment</caption>
        <thead>
          <tr className="border-b border-line text-xs uppercase tracking-widest text-muted">
            <th className="sticky left-0 bg-card px-3 py-3 font-semibold">Graha</th>
            <th className="px-3 py-3 font-semibold">Rashi</th>
            <th className="px-3 py-3 font-semibold">Degree</th>
            <th className="px-3 py-3 font-semibold">Nakshatra</th>
            <th className="px-3 py-3 font-semibold">Pa</th>
            <th className="px-3 py-3 font-semibold">D9</th>
            <th className="px-3 py-3 font-semibold">Motion</th>
            <th className="px-3 py-3 font-semibold">H</th>
          </tr>
        </thead>
        <tbody>
          <PositionRow
            name="Lagna"
            sanskrit="Lagna"
            lon={sky.lagna}
            retro={false}
            speed={null}
            dignity={null}
            combust={false}
            house={1}
            emphasize
          />
          {sky.grahas.map((graha) => (
            <PositionRow
              key={graha.id}
              name={GRAHA_ABBR[graha.id]}
              sanskrit={GRAHA_SANSKRIT[graha.id]}
              lon={graha.lon}
              retro={graha.retro}
              speed={graha.speed}
              dignity={dignityOf(graha.id, graha.lon)}
              combust={isCombust(graha.id, graha.lon, graha.retro, sunLon)}
              house={houseFrom(signIndex(graha.lon), lagnaSign)}
            />
          ))}
        </tbody>
      </table>
      <p className="px-3 py-2 text-xs text-muted">
        H is the whole-sign house from this moment’s lagna. R is retrograde. Degrees sit inside the rashi. The table stays in rashi even when the chart shows navamsa.
      </p>
    </div>
  );
}

function PositionRow({
  name,
  sanskrit,
  lon,
  retro,
  speed,
  dignity,
  combust,
  house,
  emphasize = false,
}: {
  name: string;
  sanskrit: string;
  lon: number;
  retro: boolean;
  speed: number | null;
  dignity: string | null;
  combust: boolean;
  house: number;
  emphasize?: boolean;
}) {
  const sign = signIndex(lon);
  const nak = nakshatraIndex(lon);
  return (
    <tr className={emphasize ? "border-b border-ink bg-paper" : "border-b border-line"}>
      <th className={`sticky left-0 px-3 py-2 text-left font-medium ${emphasize ? "bg-paper" : "bg-card"}`}>
        {name}
        <span className="mt-0.5 block text-xs font-normal text-muted">{sanskrit}</span>
      </th>
      <td className="px-3 py-2">
        {RASHIS[sign]?.name}
        <span className="mt-0.5 block text-xs text-muted">{RASHIS[sign]?.sanskrit}</span>
      </td>
      <td className="px-3 py-2 tabular-nums">{formatDms(degInSign(lon), true)}</td>
      <td className="px-3 py-2">
        {NAKSHATRAS[nak]}
        <span className="mt-0.5 block text-xs text-muted">{GRAHA_NAME[NAKSHATRA_LORDS[nak % 9]!]}</span>
      </td>
      <td className="px-3 py-2 tabular-nums">{padaOf(lon)}</td>
      <td className="px-3 py-2">{RASHIS[navamsaSign(lon)]?.abbr}</td>
      <td className="px-3 py-2">
        {speed === null ? (
          <span className="text-muted">rising</span>
        ) : (
          <span className="tabular-nums">
            {retro ? <span className="text-seal">R </span> : null}
            {formatSpeed(speed)}
          </span>
        )}
        {dignity && <span className="mt-0.5 block text-xs text-muted">{dignity}</span>}
        {combust && <span className="mt-0.5 block text-xs text-seal">combust</span>}
      </td>
      <td className="px-3 py-2 tabular-nums">{house}</td>
    </tr>
  );
}
