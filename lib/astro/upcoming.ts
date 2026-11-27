import { NextGlobalSolarEclipse, NextLunarEclipse, SearchGlobalSolarEclipse, SearchLunarEclipse } from "astronomy-engine";
import { bodyLongitude, nakshatraIndex, norm, padaOf, signIndex } from "./calc";
import {
  COMBUST_ORB,
  GRAHA_NAME,
  NAKSHATRAS,
  NAKSHATRA_ARC,
  RASHIS,
  type AyanamsaId,
  type GrahaId,
  type NodeMode,
} from "./constants";
import { drishtiLabel, drishtiOffsets, type NodeDrishti } from "./drishti";
import { formatDms } from "./format";
import { HOUSE_THEME } from "./reading";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const HORIZON = 90 * DAY;
const STEP = 4 * HOUR;
const PADA_ARC = NAKSHATRA_ARC / 4;

const TRACKS: GrahaId[] = ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn", "rahu"];
const STATIONS: GrahaId[] = ["mercury", "venus", "mars", "jupiter", "saturn"];
const COMBUST: GrahaId[] = ["moon", "mars", "mercury", "jupiter", "venus", "saturn"];

export type TransitKind =
  | "sign"
  | "nakshatra"
  | "pada"
  | "retrograde"
  | "direct"
  | "conjunction"
  | "drishti"
  | "combust-start"
  | "combust-end"
  | "eclipse-solar"
  | "eclipse-lunar";

export type TransitEvent = {
  id: string;
  at: number;
  kind: TransitKind;
  graha: GrahaId;
  other?: GrahaId;
  title: string;
  line: string;
  detail: string;
};

type Sample = { t: number; lon: number };

export function countdown(at: number, now: number): string {
  const ms = Math.max(0, at - now);
  const total = Math.floor(ms / 1000);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins.toString().padStart(2, "0")}m`;
  return `${mins}m ${secs.toString().padStart(2, "0")}s`;
}

function unwrap(from: number, to: number): number {
  let delta = to - from;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return delta;
}

function crosses(before: number, after: number, target: number): boolean {
  const delta = unwrap(before, after);
  if (Math.abs(delta) < 1e-8) return false;
  let need = target - before;
  if (need > 180) need -= 360;
  if (need <= -180) need += 360;
  if (delta > 0) return need >= -1e-6 && need <= delta + 1e-6;
  return need <= 1e-6 && need >= delta - 1e-6;
}

function placeLine(lon: number): string {
  const sign = RASHIS[signIndex(lon)]?.name ?? "";
  const nak = NAKSHATRAS[nakshatraIndex(lon)] ?? "";
  return `${sign} · ${formatDms(lon, true)} · ${nak} pada ${padaOf(lon)}`;
}

export function findUpcoming(from: Date, ayanamsa: AyanamsaId, node: NodeMode, nodes: NodeDrishti): TransitEvent[] {
  const origin = from.getTime();
  const until = origin + HORIZON;
  const times: number[] = [];
  for (let t = origin; t <= until; t += STEP) times.push(t);
  if (times[times.length - 1] !== until) times.push(until);

  const cache = new Map<string, number>();
  const longitude = (id: GrahaId, t: number): number => {
    if (id === "ketu") return norm(longitude("rahu", t) + 180);
    const key = `${id}:${t}`;
    const hit = cache.get(key);
    if (hit !== undefined) return hit;
    const value = bodyLongitude(id, new Date(t), ayanamsa, node);
    cache.set(key, value);
    return value;
  };

  const tracks = new Map<GrahaId, Sample[]>();
  for (const id of TRACKS) tracks.set(id, times.map((t) => ({ t, lon: longitude(id, t) })));
  tracks.set(
    "ketu",
    tracks.get("rahu")!.map((sample) => ({ t: sample.t, lon: norm(sample.lon + 180) })),
  );

  const events: TransitEvent[] = [];
  const seen = new Set<string>();
  const push = (event: TransitEvent) => {
    if (event.at <= origin + 1000 || event.at > until) return;
    const key = `${event.kind}|${event.graha}|${event.other ?? ""}|${Math.round(event.at / 60000)}`;
    if (seen.has(key)) return;
    seen.add(key);
    events.push(event);
  };

  const refine = (id: GrahaId, t0: number, t1: number, target: number, lon0: number) => {
    let lo = t0;
    let hi = t1;
    for (let i = 0; i < 18; i++) {
      const mid = (lo + hi) / 2;
      if (crosses(lon0, longitude(id, mid), target)) hi = mid;
      else lo = mid;
    }
    return hi;
  };

  for (const [id, samples] of tracks) {
    for (let i = 0; i < samples.length - 1; i++) {
      const a = samples[i]!;
      const b = samples[i + 1]!;
      const delta = unwrap(a.lon, b.lon);
      if (Math.abs(delta) < 1e-6) continue;
      const edges = [
        { step: 30, kind: "sign" as const },
        { step: NAKSHATRA_ARC, kind: "nakshatra" as const },
        { step: PADA_ARC, kind: "pada" as const },
      ];
      for (const edge of edges) {
        const dir = delta > 0 ? 1 : -1;
        let target = dir > 0 ? (Math.floor(norm(a.lon) / edge.step + 1e-8) + 1) * edge.step : Math.floor((norm(a.lon) - 1e-8) / edge.step) * edge.step;
        target = norm(target);
        if (!crosses(a.lon, b.lon, target)) continue;
        const at = refine(id, a.t, b.t, target, a.lon);
        const lon = longitude(id, at + 2000);
        const sign = signIndex(lon);
        const fromSign = (sign - dir + 12) % 12;
        const nak = nakshatraIndex(lon);
        const pada = padaOf(lon);
        if (edge.kind === "sign") {
          push({
            id: `sign-${id}-${at}`,
            at,
            kind: "sign",
            graha: id,
            title: `${GRAHA_NAME[id]} enters ${RASHIS[sign]?.name}`,
            line: `${RASHIS[fromSign]?.name} → ${RASHIS[sign]?.name}`,
            detail: `${GRAHA_NAME[id]} crosses into ${RASHIS[sign]?.name} at ${placeLine(lon)}.`,
          });
        } else if (edge.kind === "nakshatra") {
          push({
            id: `nak-${id}-${at}`,
            at,
            kind: "nakshatra",
            graha: id,
            title: `${GRAHA_NAME[id]} enters ${NAKSHATRAS[nak]}`,
            line: `${RASHIS[sign]?.name} · pada ${pada}`,
            detail: `${GRAHA_NAME[id]} enters the nakshatra ${NAKSHATRAS[nak]}, pada ${pada}, at ${placeLine(lon)}.`,
          });
        } else {
          push({
            id: `pada-${id}-${at}`,
            at,
            kind: "pada",
            graha: id,
            title: `${GRAHA_NAME[id]} enters ${NAKSHATRAS[nak]} pada ${pada}`,
            line: RASHIS[sign]?.name ?? "",
            detail: `${GRAHA_NAME[id]} changes nakshatra pada to ${NAKSHATRAS[nak]} ${pada} at ${placeLine(lon)}.`,
          });
        }
      }
    }
  }

  for (const id of STATIONS) {
    const samples = tracks.get(id)!;
    const speeds = samples.slice(0, -1).map((sample, index) => unwrap(sample.lon, samples[index + 1]!.lon));
    for (let i = 0; i < speeds.length - 1; i++) {
      const before = speeds[i]!;
      const after = speeds[i + 1]!;
      if (before === 0 || after === 0 || before > 0 === after > 0) continue;
      let lo = samples[i + 1]!.t;
      let hi = samples[i + 2]!.t;
      const pace = (t: number) => unwrap(longitude(id, t - 6 * HOUR), longitude(id, t + 6 * HOUR));
      const wantNegative = after < 0;
      for (let n = 0; n < 16; n++) {
        const mid = (lo + hi) / 2;
        if (pace(mid) < 0 === wantNegative) hi = mid;
        else lo = mid;
      }
      const lon = longitude(id, hi);
      const retro = wantNegative;
      push({
        id: `${retro ? "retro" : "direct"}-${id}-${hi}`,
        at: hi,
        kind: retro ? "retrograde" : "direct",
        graha: id,
        title: retro ? `${GRAHA_NAME[id]} stations retrograde` : `${GRAHA_NAME[id]} turns direct`,
        line: placeLine(lon),
        detail: `Geocentric motion of ${GRAHA_NAME[id]} changes sign at ${placeLine(lon)}. ${retro ? "Retrograde begins." : "Direct motion resumes."}`,
      });
    }
  }

  const pairIds = [...tracks.keys()];
  for (let i = 0; i < pairIds.length; i++) {
    for (let j = i + 1; j < pairIds.length; j++) {
      const left = pairIds[i]!;
      const right = pairIds[j]!;
      if ((left === "rahu" && right === "ketu") || (left === "ketu" && right === "rahu")) continue;
      const a = tracks.get(left)!;
      const b = tracks.get(right)!;
      for (let k = 0; k < a.length - 1; k++) {
        const before = unwrap(a[k]!.lon, b[k]!.lon);
        const after = unwrap(a[k + 1]!.lon, b[k + 1]!.lon);
        if (before === 0 || Math.abs(before) > 20 || Math.abs(after) > 20) continue;
        if (before > 0 === after > 0 && after !== 0) continue;
        let lo = a[k]!.t;
        let hi = a[k + 1]!.t;
        for (let n = 0; n < 16; n++) {
          const mid = (lo + hi) / 2;
          const gap = unwrap(longitude(left, mid), longitude(right, mid));
          if (gap === 0 || gap > 0 === before > 0) lo = mid;
          else hi = mid;
        }
        const lon = longitude(left, hi);
        push({
          id: `conj-${left}-${right}-${hi}`,
          at: hi,
          kind: "conjunction",
          graha: left,
          other: right,
          title: `${GRAHA_NAME[left]} conjunct ${GRAHA_NAME[right]}`,
          line: placeLine(lon),
          detail: `${GRAHA_NAME[left]} and ${GRAHA_NAME[right]} share the same sidereal longitude at ${placeLine(lon)}.`,
        });
      }
    }
  }

  for (const id of pairIds) {
    const offsets = drishtiOffsets(id, nodes);
    for (const other of pairIds) {
      if (other === id) continue;
      const source = tracks.get(id)!;
      const target = tracks.get(other)!;
      for (const offset of offsets) {
        const angle = (offset * 30) % 360;
        for (let k = 0; k < source.length - 1; k++) {
          const before = norm(target[k]!.lon - source[k]!.lon);
          const after = norm(target[k + 1]!.lon - source[k + 1]!.lon);
          if (!crosses(before, after, angle)) continue;
          const at = (() => {
            let lo = source[k]!.t;
            let hi = source[k + 1]!.t;
            for (let n = 0; n < 16; n++) {
              const mid = (lo + hi) / 2;
              const rel = norm(longitude(other, mid) - longitude(id, mid));
              if (crosses(before, rel, angle)) hi = mid;
              else lo = mid;
            }
            return hi;
          })();
          const lon = longitude(other, at);
          push({
            id: `drishti-${id}-${offset}-${other}-${at}`,
            at,
            kind: "drishti",
            graha: id,
            other,
            title: `${GRAHA_NAME[id]}'s ${drishtiLabel(offset)} drishti exact on ${GRAHA_NAME[other]}`,
            line: placeLine(lon),
            detail: `The ${drishtiLabel(offset)} aspect of ${GRAHA_NAME[id]} is exact on ${GRAHA_NAME[other]} at ${placeLine(longitude(id, at))}. ${GRAHA_NAME[other]} is at ${placeLine(lon)}.`,
          });
        }
      }
    }
  }

  for (const id of COMBUST) {
    const samples = tracks.get(id)!;
    const sun = tracks.get("sun")!;
    const hot = samples.map((sample, index) => {
      const next = samples[Math.min(index + 1, samples.length - 1)]!;
      const retro = unwrap(sample.lon, next.lon) < 0 && id !== "moon";
      const orb = COMBUST_ORB[id]!;
      const within = Math.abs(unwrap(sun[index]!.lon, sample.lon)) <= (retro ? orb.retro : orb.direct);
      return within;
    });
    for (let i = 0; i < hot.length - 1; i++) {
      if (hot[i] === hot[i + 1]) continue;
      const begins = hot[i + 1] === true;
      let lo = samples[i]!.t;
      let hi = samples[i + 1]!.t;
      for (let n = 0; n < 16; n++) {
        const mid = (lo + hi) / 2;
        const retro = unwrap(longitude(id, mid - 6 * HOUR), longitude(id, mid + 6 * HOUR)) < 0 && id !== "moon";
        const orb = retro ? COMBUST_ORB[id]!.retro : COMBUST_ORB[id]!.direct;
        const within = Math.abs(unwrap(longitude("sun", mid), longitude(id, mid))) <= orb;
        if (within === begins) hi = mid;
        else lo = mid;
      }
      const lon = longitude(id, hi);
      push({
        id: `combust-${begins ? "in" : "out"}-${id}-${hi}`,
        at: hi,
        kind: begins ? "combust-start" : "combust-end",
        graha: id,
        other: "sun",
        title: begins ? `${GRAHA_NAME[id]} combustion begins` : `${GRAHA_NAME[id]} combustion ends`,
        line: placeLine(lon),
        detail: `${GRAHA_NAME[id]} ${begins ? "enters" : "leaves"} the solar combustion orb at ${placeLine(lon)}. The Sun is at ${placeLine(longitude("sun", hi))}.`,
      });
    }
  }

  try {
    let solar = SearchGlobalSolarEclipse(new Date(origin));
    for (let guard = 0; guard < 4; guard++) {
      const at = solar.peak.date.getTime();
      if (at > until) break;
      if (at > origin) {
        const lon = longitude("sun", at);
        push({
          id: `solar-${at}`,
          at,
          kind: "eclipse-solar",
          graha: "sun",
          other: "moon",
          title: "Solar eclipse",
          line: placeLine(lon),
          detail: `Solar eclipse peak. The Sun is at ${placeLine(lon)}. The Moon is at ${placeLine(longitude("moon", at))}.`,
        });
      }
      solar = NextGlobalSolarEclipse(solar.peak);
    }
    let lunar = SearchLunarEclipse(new Date(origin));
    for (let guard = 0; guard < 6; guard++) {
      const at = lunar.peak.date.getTime();
      if (at > until) break;
      if (at > origin && (lunar.kind === "partial" || lunar.kind === "total")) {
        const lon = longitude("moon", at);
        push({
          id: `lunar-${at}`,
          at,
          kind: "eclipse-lunar",
          graha: "moon",
          other: "sun",
          title: `${lunar.kind === "total" ? "Total" : "Partial"} lunar eclipse`,
          line: placeLine(lon),
          detail: `${lunar.kind === "total" ? "Total" : "Partial"} lunar eclipse peak. The Moon is at ${placeLine(lon)}.`,
        });
      }
      lunar = NextLunarEclipse(lunar.peak);
    }
  } catch {
    /* no eclipse in range */
  }

  events.sort((a, b) => a.at - b.at);
  return events;
}

export function effectForChart(
  event: TransitEvent,
  ayanamsa: AyanamsaId,
  node: NodeMode,
  natal: { name: string; lagnaSign: number } | null,
): string {
  if (!natal) return "No birth chart is selected. Choose one under Birth charts to read this transit in a natal chart.";
  const who = natal.name.trim() || "the selected chart";
  const houseOf = (id: GrahaId) => {
    const sign = signIndex(bodyLongitude(id, new Date(event.at), ayanamsa, node));
    const house = ((sign - natal.lagnaSign + 12) % 12) + 1;
    return { sign: RASHIS[sign]?.name ?? "", house, theme: HOUSE_THEME[house - 1] ?? "" };
  };
  const main = houseOf(event.graha);
  const other = event.other ? houseOf(event.other) : null;
  if (event.kind === "conjunction" && other) {
    if (main.house === other.house) {
      return `In ${who}'s chart both grahas meet in house ${main.house}, which concerns ${main.theme}.`;
    }
    return `In ${who}'s chart this conjunction joins house ${main.house} (${main.theme}) and house ${other.house} (${other.theme}).`;
  }
  if (event.kind === "drishti" && other) {
    return `${GRAHA_NAME[event.graha]} aspects from house ${main.house}. ${GRAHA_NAME[event.other!]} receives it in house ${other.house} of ${who}'s chart, which concerns ${other.theme}.`;
  }
  return `${GRAHA_NAME[event.graha]} is in ${main.sign}, house ${main.house} of ${who}'s chart. That house concerns ${main.theme}.`;
}
