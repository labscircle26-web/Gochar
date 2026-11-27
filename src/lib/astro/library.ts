import type { AyanamsaId, ChartStyle, GrahaId, NodeMode } from "@/lib/astro/constants";
import type { GrahaPosition, SkySnapshot } from "@/lib/astro/calc";
import type { PlaceValue } from "@/components/place-fields";
import { isValidTimeZone } from "@/lib/astro/time";

export type BirthProfile = PlaceValue & {
  id: string;
  name: string;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  ayanamsa: AyanamsaId;
  node: NodeMode;
  chart: ChartStyle;
};

export type NamedSnapshot = {
  id: string;
  name: string;
  instant: string;
  place: PlaceValue;
  ayanamsa: AyanamsaId;
  node: NodeMode;
};

const PROFILES_KEY = "gochar-profiles";
const ACTIVE_KEY = "gochar-active-profile";
const SNAP_KEY = "gochar-snapshots";
const CACHE_KEY = "gochar-last-sky";
const JANMA_KEY = "gochar-janma";

function readRaw(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function isAyanamsa(value: unknown): value is AyanamsaId {
  return value === "lahiri" || value === "raman" || value === "kp";
}

function isNode(value: unknown): value is NodeMode {
  return value === "true" || value === "mean";
}

function isChart(value: unknown): value is ChartStyle {
  return value === "north" || value === "south";
}

function isPlace(value: unknown): value is PlaceValue {
  if (!value || typeof value !== "object") return false;
  const place = value as PlaceValue;
  return (
    typeof place.label === "string" &&
    typeof place.lat === "number" &&
    typeof place.lon === "number" &&
    typeof place.tz === "string" &&
    isValidTimeZone(place.tz)
  );
}

function isProfile(value: unknown): value is BirthProfile {
  if (!isPlace(value)) return false;
  const profile = value as BirthProfile;
  return (
    typeof profile.id === "string" &&
    typeof profile.name === "string" &&
    typeof profile.year === "number" &&
    typeof profile.month === "number" &&
    typeof profile.day === "number" &&
    typeof profile.hour === "number" &&
    typeof profile.minute === "number" &&
    typeof profile.second === "number" &&
    isAyanamsa(profile.ayanamsa) &&
    isNode(profile.node) &&
    isChart(profile.chart)
  );
}

export function loadProfiles(): BirthProfile[] {
  const parsed = readRaw(PROFILES_KEY);
  if (Array.isArray(parsed)) {
    const profiles = parsed.filter(isProfile);
    if (profiles.length > 0) return profiles;
  }
  const legacy = readRaw(JANMA_KEY);
  if (!legacy || typeof legacy !== "object" || !isPlace(legacy)) return [];
  const janma = legacy as BirthProfile;
  if (typeof janma.year !== "number") return [];
  const profile: BirthProfile = {
    id: crypto.randomUUID(),
    name: typeof janma.name === "string" && janma.name ? janma.name : "Me",
    label: janma.label,
    lat: janma.lat,
    lon: janma.lon,
    tz: janma.tz,
    year: janma.year,
    month: janma.month,
    day: janma.day,
    hour: janma.hour,
    minute: janma.minute,
    second: janma.second ?? 0,
    ayanamsa: "lahiri",
    node: "true",
    chart: "north",
  };
  localStorage.setItem(PROFILES_KEY, JSON.stringify([profile]));
  localStorage.setItem(ACTIVE_KEY, profile.id);
  return [profile];
}

export function saveProfiles(profiles: BirthProfile[]) {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
}

export function loadActiveId(): string | null {
  return localStorage.getItem(ACTIVE_KEY);
}

export function saveActiveId(id: string) {
  localStorage.setItem(ACTIVE_KEY, id);
}

function isSnapshot(value: unknown): value is NamedSnapshot {
  if (!value || typeof value !== "object") return false;
  const snap = value as NamedSnapshot;
  return typeof snap.id === "string" && typeof snap.name === "string" && typeof snap.instant === "string" && isPlace(snap.place) && isAyanamsa(snap.ayanamsa) && isNode(snap.node);
}

export function loadSnapshots(): NamedSnapshot[] {
  const parsed = readRaw(SNAP_KEY);
  return Array.isArray(parsed) ? parsed.filter(isSnapshot) : [];
}

export function saveSnapshots(snapshots: NamedSnapshot[]) {
  localStorage.setItem(SNAP_KEY, JSON.stringify(snapshots));
}

function asDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function loadCachedSky(): SkySnapshot | null {
  const parsed = readRaw(CACHE_KEY);
  if (!parsed || typeof parsed !== "object") return null;
  const raw = parsed as SkySnapshot & { cachedAt?: unknown };
  if (typeof raw.cachedAt !== "number" || Date.now() - raw.cachedAt > 15 * 60_000) return null;
  if (raw.nodeMode !== "true" && raw.nodeMode !== "mean") return null;
  if (raw.ayanamsaId !== "lahiri" && raw.ayanamsaId !== "raman" && raw.ayanamsaId !== "kp") return null;
  if (typeof raw.lagna !== "number" || !Array.isArray(raw.grahas) || !raw.panchang) return null;
  const grahas = raw.grahas.filter((graha): graha is GrahaPosition => {
    return !!graha && typeof graha.id === "string" && typeof graha.lon === "number";
  });
  if (grahas.length < 9) return null;
  const panchang = raw.panchang;
  return {
    ...raw,
    grahas,
    panchang: {
      ...panchang,
      sunrise: asDate(panchang.sunrise),
      sunset: asDate(panchang.sunset),
      tithi: { ...panchang.tithi, ends: asDate(panchang.tithi?.ends) },
      nakshatra: { ...panchang.nakshatra, ends: asDate(panchang.nakshatra?.ends) },
      yoga: { ...panchang.yoga, ends: asDate(panchang.yoga?.ends) },
      karana: { ...panchang.karana, ends: asDate(panchang.karana?.ends) },
    },
  };
}

export function saveCachedSky(sky: SkySnapshot) {
  localStorage.setItem(CACHE_KEY, JSON.stringify({ ...sky, cachedAt: Date.now() }));
}

export type ShareQuery = {
  instant: Date;
  place: PlaceValue;
  ayanamsa?: AyanamsaId;
  node?: NodeMode;
};

export function readShareQuery(search: string): ShareQuery | null {
  const params = new URLSearchParams(search);
  const t = params.get("t");
  const lat = Number(params.get("lat"));
  const lon = Number(params.get("lon"));
  const tz = params.get("tz") ?? "";
  const label = params.get("place") ?? "";
  if (!t || !label || !isValidTimeZone(tz) || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const instant = new Date(t);
  if (Number.isNaN(instant.getTime())) return null;
  const ayanamsa = params.get("ay");
  const node = params.get("node");
  return {
    instant,
    place: { label, lat, lon, tz },
    ayanamsa: isAyanamsa(ayanamsa) ? ayanamsa : undefined,
    node: isNode(node) ? node : undefined,
  };
}

export function shareHref(origin: string, instant: Date, place: PlaceValue, ayanamsa: AyanamsaId, node: NodeMode): string {
  const url = new URL("/", origin);
  url.searchParams.set("t", instant.toISOString());
  url.searchParams.set("lat", String(place.lat));
  url.searchParams.set("lon", String(place.lon));
  url.searchParams.set("tz", place.tz);
  url.searchParams.set("place", place.label);
  url.searchParams.set("ay", ayanamsa);
  url.searchParams.set("node", node);
  return url.toString();
}

export function grahaIdOf(value: string): value is GrahaId {
  return ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn", "rahu", "ketu"].includes(value);
}
