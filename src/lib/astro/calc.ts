import {
  Body,
  Ecliptic,
  EclipticGeoMoon,
  GeoVector,
  MakeTime,
  Observer,
  SearchRiseSet,
  SiderealTime,
  SunPosition,
  e_tilt,
} from "astronomy-engine";
import {
  DASHA_LORDS,
  DASHA_YEARS,
  NAKSHATRA_ARC,
  NAKSHATRAS,
  TITHI_NAMES,
  YOGAS,
  type AyanamsaId,
  type GrahaId,
  type NodeMode,
} from "./constants";
import { utcToZonedParts, zonedToUtc } from "./time";

const DEG = Math.PI / 180;
const YEAR_MS = 365.25 * 24 * 3600 * 1000;

export function norm(deg: number): number {
  const x = deg % 360;
  return x < 0 ? x + 360 : x;
}

export function separation(a: number, b: number): number {
  const d = Math.abs(norm(a) - norm(b));
  return Math.min(d, 360 - d);
}

export function signIndex(lon: number): number {
  return Math.floor(norm(lon) / 30) % 12;
}

export function degInSign(lon: number): number {
  return norm(lon) % 30;
}

export function houseFrom(bodySign: number, referenceSign: number): number {
  return ((bodySign - referenceSign + 12) % 12) + 1;
}

export function nakshatraIndex(lon: number): number {
  return Math.floor(norm(lon) / NAKSHATRA_ARC) % 27;
}

export function padaOf(lon: number): number {
  const within = norm(lon) % NAKSHATRA_ARC;
  return Math.floor(within / (NAKSHATRA_ARC / 4)) + 1;
}

/** Dashamsha. Odd signs count from themselves, even signs from the 9th. Each part is 3°. */
export function dashamshaSign(lon: number): number {
  const sign = signIndex(lon);
  const part = Math.min(9, Math.floor(degInSign(lon) / 3));
  const start = sign % 2 === 0 ? sign : (sign + 8) % 12;
  return (start + part) % 12;
}
/** Navamsha. Movable signs count from themselves, fixed from the 9th, dual from the 5th. */
export function navamsaSign(lon: number): number {
  const sign = signIndex(lon);
  const part = Math.min(8, Math.floor(degInSign(lon) / (30 / 9)));
  const start = sign % 3 === 0 ? sign : sign % 3 === 1 ? (sign + 8) % 12 : (sign + 4) % 12;
  return (start + part) % 12;
}

export function ayanamsaDegrees(date: Date, id: AyanamsaId): number {
  const jd = MakeTime(date).ut + 2451545;
  const t = (jd - 2451545) / 36525;
  const t2 = t * t;
  if (id === "raman") return 22.37778 + 1.3825 * t + 0.00015 * t2;
  if (id === "kp") return 23.76056 + 1.39722 * t + 0.00018 * t2;
  return 23.85701 + 1.39722 * t + 0.00018 * t2;
}

function tropicalPlace(body: Body, date: Date): { lon: number; lat: number } {
  if (body === Body.Sun) {
    const sun = SunPosition(date);
    return { lon: norm(sun.elon), lat: sun.elat };
  }
  if (body === Body.Moon) {
    const moon = EclipticGeoMoon(date);
    return { lon: norm(moon.lon), lat: moon.lat };
  }
  const ecl = Ecliptic(GeoVector(body, date, true));
  return { lon: norm(ecl.elon), lat: ecl.elat };
}

function meanNodeTropical(date: Date): number {
  const t = MakeTime(date).tt / 36525;
  return norm(125.0445479 - 1934.1362891 * t + 0.0020754 * t * t + (t * t * t) / 467441);
}

function trueNodeTropical(date: Date): number {
  // Estimate the Moon's instantaneous orbital plane with a symmetric
  // one-hour velocity difference to avoid a forward-only chord bias.
  const halfStep = 60 * 60 * 1000;
  const center = EclipticGeoMoon(date);
  const before = EclipticGeoMoon(new Date(date.getTime() - halfStep));
  const after = EclipticGeoMoon(new Date(date.getTime() + halfStep));
  const xyz = (lonDeg: number, latDeg: number, dist: number): [number, number, number] => {
    const lon = lonDeg * DEG;
    const lat = latDeg * DEG;
    const cosLat = Math.cos(lat);
    return [
      dist * cosLat * Math.cos(lon),
      dist * cosLat * Math.sin(lon),
      dist * Math.sin(lat),
    ];
  };
  const p = xyz(center.lon, center.lat, center.dist);
  const a = xyz(before.lon, before.lat, before.dist);
  const b = xyz(after.lon, after.lat, after.dist);
  const vx = b[0] - a[0];
  const vy = b[1] - a[1];
  const vz = b[2] - a[2];
  let hx = p[1] * vz - p[2] * vy;
  let hy = p[2] * vx - p[0] * vz;
  const hz = p[0] * vy - p[1] * vx;
  if (Math.hypot(hx, hy) < 1e-18) throw new Error("The Moon's orbital node is undefined at this instant.");
  if (hz < 0) {
    hx = -hx;
    hy = -hy;
  }
  return norm(Math.atan2(hx, -hy) / DEG);
}

export function tropicalAscendant(date: Date, latitude: number, longitude: number): number {
  const ramc = norm(SiderealTime(date) * 15 + longitude) * DEG;
  const eps = e_tilt(MakeTime(date)).tobl * DEG;
  const phi = latitude * DEG;
  const asc = Math.atan2(
    Math.cos(ramc),
    -(Math.sin(ramc) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps)),
  );
  return norm(asc / DEG);
}

function dailySpeed(at: (date: Date) => number, date: Date): number {
  const before = at(new Date(date.getTime() - 12 * 3600 * 1000));
  const after = at(new Date(date.getTime() + 12 * 3600 * 1000));
  let delta = after - before;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return delta;
}

const PLANETS: { id: GrahaId; body: Body }[] = [
  { id: "sun", body: Body.Sun },
  { id: "moon", body: Body.Moon },
  { id: "mars", body: Body.Mars },
  { id: "mercury", body: Body.Mercury },
  { id: "jupiter", body: Body.Jupiter },
  { id: "venus", body: Body.Venus },
  { id: "saturn", body: Body.Saturn },
];

export type GrahaPosition = {
  id: GrahaId;
  lon: number;
  lat: number;
  speed: number;
  retro: boolean;
};

export type Boundary = {
  index: number;
  name: string;
  paksha?: "Shukla" | "Krishna";
  ends: Date | null;
};

export type Panchang = {
  vara: number;
  sunrise: Date | null;
  sunset: Date | null;
  tithi: Boundary;
  nakshatra: Boundary;
  yoga: Boundary;
  karana: Boundary;
};

export type PanchangCache = {
  placeKey: string;
  dayKey: string;
  sunrise: Date | null;
  sunset: Date | null;
  tithiIndex: number;
  tithiEnds: Date | null;
  nakIndex: number;
  nakEnds: Date | null;
  yogaIndex: number;
  yogaEnds: Date | null;
  karanaIndex: number;
  karanaEnds: Date | null;
  speedAt: number;
  speeds: number[];
};

function boundaryStillGood(index: number, cachedIndex: number, ends: Date | null, now: number): boolean {
  return index === cachedIndex && !!ends && ends.getTime() > now + 250;
}

function nextForwardBoundary(start: Date, valueAt: (date: Date) => number, step: number): Date | null {
  const origin = norm(valueAt(start));
  const into = origin % step;
  const goal = into < 1e-4 ? step : step - into;
  const probe = norm(valueAt(new Date(start.getTime() + 6 * 3600 * 1000)));
  let rate = probe - origin;
  if (rate < -180) rate += 360;
  if (rate <= 0.01) rate = 0.2;
  const progressed = (date: Date) => {
    let delta = norm(valueAt(date)) - origin;
    if (delta < -0.05) delta += 360;
    return delta;
  };
  let lo = start.getTime();
  const estimateDays = Math.min(40, Math.max(0.15, (goal / rate) * 0.5));
  let hi = start.getTime() + estimateDays * 86400000;
  if (progressed(new Date(hi)) < goal) hi = start.getTime() + 40 * 86400000;
  if (progressed(new Date(hi)) < goal) return null;
  for (let i = 0; i < 46; i++) {
    const mid = (lo + hi) / 2;
    if (progressed(new Date(mid)) < goal) lo = mid;
    else hi = mid;
  }
  return new Date(hi);
}

function karanaName(index: number): string {
  if (index <= 0) return "Kimstughna";
  if (index === 57) return "Shakuni";
  if (index === 58) return "Chatushpada";
  if (index >= 59) return "Nagava";
  const repeating = ["Bava", "Balava", "Kaulava", "Taitila", "Gara", "Vanija", "Vishti"] as const;
  return repeating[(index - 1) % 7] ?? "Bava";
}

function tithiOf(diff: number): { index: number; name: string; paksha: "Shukla" | "Krishna" } {
  const index = Math.min(29, Math.floor(norm(diff) / 12));
  const paksha = index < 15 ? "Shukla" : "Krishna";
  const within = index % 15;
  const name = within === 14 ? (paksha === "Shukla" ? "Purnima" : "Amavasya") : (TITHI_NAMES[within] ?? "Pratipada");
  return { index, name, paksha };
}

function weekdayIndex(date: Date, timeZone: string): number {
  const label = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(date);
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[label.slice(0, 3)] ?? 0;
}

function sunEventOnCivilDay(
  date: Date,
  timeZone: string,
  observer: Observer,
  direction: 1 | -1,
): Date | null {
  const parts = utcToZonedParts(date, timeZone);
  const midnight = zonedToUtc(parts.year, parts.month, parts.day, 0, 0, 0, timeZone);
  let cursor = new Date(midnight.getTime() - 8 * 3600 * 1000);
  for (let i = 0; i < 4; i++) {
    const found = SearchRiseSet(Body.Sun, observer, direction, cursor, 2);
    if (!found) return null;
    const hit = utcToZonedParts(found.date, timeZone);
    if (hit.year === parts.year && hit.month === parts.month && hit.day === parts.day) return found.date;
    cursor = new Date(found.date.getTime() + 60 * 1000);
  }
  return null;
}

export function bodyLongitude(id: GrahaId, date: Date, ayanamsaId: AyanamsaId, nodeMode: NodeMode): number {
  const sidereal = (tropical: number) => norm(tropical - ayanamsaDegrees(date, ayanamsaId));
  if (id === "ketu") return norm(bodyLongitude("rahu", date, ayanamsaId, nodeMode) + 180);
  if (id === "rahu") return sidereal(nodeMode === "mean" ? meanNodeTropical(date) : trueNodeTropical(date));
  const planet = PLANETS.find((item) => item.id === id);
  if (!planet) return 0;
  return sidereal(tropicalPlace(planet.body, date).lon);
}

export type SkySnapshot = {
  ayanamsa: number;
  ayanamsaId: AyanamsaId;
  nodeMode: NodeMode;
  lagna: number;
  grahas: GrahaPosition[];
  panchang: Panchang;
};

export function computeSky(
  date: Date,
  latitude: number,
  longitude: number,
  timeZone: string,
  ayanamsaId: AyanamsaId,
  nodeMode: NodeMode,
  cache?: PanchangCache | null,
): SkySnapshot {
  const ayanamsa = ayanamsaDegrees(date, ayanamsaId);
  const siderealAt = (tropical: number, when: Date) =>
    norm(tropical - ayanamsaDegrees(when, ayanamsaId));
  const parts = utcToZonedParts(date, timeZone);
  const placeKey = `${latitude.toFixed(4)}|${longitude.toFixed(4)}|${timeZone}|${ayanamsaId}|${nodeMode}`;
  const dayKey = `${parts.year}-${parts.month}-${parts.day}`;
  const stored = cache && cache.placeKey === placeKey ? cache : null;
  const speedsFresh =
    !!stored &&
    Math.abs(date.getTime() - stored.speedAt) <= 60_000 &&
    stored.speeds.length === 9;

  const grahas: GrahaPosition[] = PLANETS.map(({ id, body }, index) => {
    const place = tropicalPlace(body, date);
    const speed = speedsFresh ? stored.speeds[index]! : dailySpeed((when) => siderealAt(tropicalPlace(body, when).lon, when), date);
    return {
      id,
      lon: siderealAt(place.lon, date),
      lat: place.lat,
      speed,
      retro: id !== "sun" && id !== "moon" && speed < 0,
    };
  });

  const nodeTropical = (when: Date) => (nodeMode === "mean" ? meanNodeTropical(when) : trueNodeTropical(when));
  const rahuSpeed = speedsFresh ? stored.speeds[7]! : dailySpeed((when) => siderealAt(nodeTropical(when), when), date);
  const rahuLon = siderealAt(nodeTropical(date), date);
  grahas.push({ id: "rahu", lon: rahuLon, lat: 0, speed: rahuSpeed, retro: rahuSpeed < 0 });
  grahas.push({
    id: "ketu",
    lon: norm(rahuLon + 180),
    lat: 0,
    speed: rahuSpeed,
    retro: rahuSpeed < 0,
  });

  const sun = grahas.find((graha) => graha.id === "sun")!;
  const moon = grahas.find((graha) => graha.id === "moon")!;
  const elongation = norm(moon.lon - sun.lon);
  const tithi = tithiOf(elongation);
  const nakIndex = nakshatraIndex(moon.lon);
  const yogaIndex = Math.floor(norm(moon.lon + sun.lon) / NAKSHATRA_ARC) % 27;
  const karanaIndex = Math.min(59, Math.floor(elongation / 6));

  const sameDay = !!stored && stored.dayKey === dayKey;
  const observer = new Observer(latitude, longitude, 0);
  const sunrise = sameDay ? stored.sunrise : sunEventOnCivilDay(date, timeZone, observer, +1);
  const sunset = sameDay ? stored.sunset : sunEventOnCivilDay(date, timeZone, observer, -1);
  const vara =
    sunrise && date.getTime() < sunrise.getTime()
      ? weekdayIndex(new Date(date.getTime() - 18 * 3600 * 1000), timeZone)
      : weekdayIndex(date, timeZone);
  const now = date.getTime();
  const tithiEnds = stored && boundaryStillGood(tithi.index, stored.tithiIndex, stored.tithiEnds, now)
    ? stored.tithiEnds
    : nextForwardBoundary(date, (when) => norm(tropicalPlace(Body.Moon, when).lon - tropicalPlace(Body.Sun, when).lon), 12);
  const nakEnds = stored && boundaryStillGood(nakIndex, stored.nakIndex, stored.nakEnds, now)
    ? stored.nakEnds
    : nextForwardBoundary(date, (when) => siderealAt(tropicalPlace(Body.Moon, when).lon, when), NAKSHATRA_ARC);
  const yogaEnds = stored && boundaryStillGood(yogaIndex, stored.yogaIndex, stored.yogaEnds, now)
    ? stored.yogaEnds
    : nextForwardBoundary(date, (when) => {
        const ay = ayanamsaDegrees(when, ayanamsaId);
        return norm(tropicalPlace(Body.Sun, when).lon + tropicalPlace(Body.Moon, when).lon - 2 * ay);
      }, NAKSHATRA_ARC);
  const karanaEnds = stored && boundaryStillGood(karanaIndex, stored.karanaIndex, stored.karanaEnds, now)
    ? stored.karanaEnds
    : nextForwardBoundary(date, (when) => norm(tropicalPlace(Body.Moon, when).lon - tropicalPlace(Body.Sun, when).lon), 6);

  if (cache) {
    cache.placeKey = placeKey;
    cache.dayKey = dayKey;
    cache.sunrise = sunrise;
    cache.sunset = sunset;
    cache.tithiIndex = tithi.index;
    cache.tithiEnds = tithiEnds;
    cache.nakIndex = nakIndex;
    cache.nakEnds = nakEnds;
    cache.yogaIndex = yogaIndex;
    cache.yogaEnds = yogaEnds;
    cache.karanaIndex = karanaIndex;
    cache.karanaEnds = karanaEnds;
    if (!speedsFresh) {
      cache.speedAt = now;
      cache.speeds = [...grahas.map((graha) => graha.speed), rahuSpeed, rahuSpeed];
    }
  }

  return {
    ayanamsa,
    ayanamsaId,
    nodeMode,
    lagna: siderealAt(tropicalAscendant(date, latitude, longitude), date),
    grahas,
    panchang: {
      vara,
      sunrise,
      sunset,
      tithi: { ...tithi, ends: tithiEnds },
      nakshatra: {
        index: nakIndex,
        name: NAKSHATRAS[nakIndex] ?? "Ashwini",
        ends: nakEnds,
      },
      yoga: {
        index: yogaIndex,
        name: YOGAS[yogaIndex] ?? "Vishkambha",
        ends: yogaEnds,
      },
      karana: {
        index: karanaIndex,
        name: karanaName(karanaIndex),
        ends: karanaEnds,
      },
    },
  };
}

export type DashaSpan = {
  lord: GrahaId;
  start: Date;
  end: Date;
};

export type Vimshottari = {
  mahadasha: DashaSpan;
  antardasha: DashaSpan;
  pratyantar: DashaSpan;
  sukshma: DashaSpan;
  prana: DashaSpan;
};

function lordIndex(id: GrahaId): number {
  const index = DASHA_LORDS.indexOf(id);
  return index < 0 ? 0 : index;
}

export function mahadashas(birth: Date, moonLon: number): DashaSpan[] {
  const startLord = nakshatraIndex(moonLon) % 9;
  const elapsedFrac = (norm(moonLon) % NAKSHATRA_ARC) / NAKSHATRA_ARC;
  let startMs = birth.getTime() - elapsedFrac * DASHA_YEARS[startLord]! * YEAR_MS;
  const spans: DashaSpan[] = [];
  let lord = startLord;
  for (let i = 0; i < 9; i++) {
    const years = DASHA_YEARS[lord]!;
    const endMs = startMs + years * YEAR_MS;
    spans.push({ lord: DASHA_LORDS[lord]!, start: new Date(startMs), end: new Date(endMs) });
    startMs = endMs;
    lord = (lord + 1) % 9;
  }
  return spans;
}

export function subdashas(parent: DashaSpan): DashaSpan[] {
  const parentYears = (parent.end.getTime() - parent.start.getTime()) / YEAR_MS;
  let idx = lordIndex(parent.lord);
  let startMs = parent.start.getTime();
  const spans: DashaSpan[] = [];
  for (let i = 0; i < 9; i++) {
    const years = (parentYears * DASHA_YEARS[idx]!) / 120;
    const endMs = startMs + years * YEAR_MS;
    spans.push({ lord: DASHA_LORDS[idx]!, start: new Date(startMs), end: new Date(endMs) });
    startMs = endMs;
    idx = (idx + 1) % 9;
  }
  return spans;
}

function spanAt(spans: DashaSpan[], when: number): DashaSpan {
  return spans.find((span) => when < span.end.getTime()) ?? spans[spans.length - 1]!;
}

export function vimshottari(birth: Date, moonLon: number, when: Date): Vimshottari | null {
  if (when.getTime() < birth.getTime()) return null;
  const mahadasha = spanAt(mahadashas(birth, moonLon), when.getTime());
  const antardasha = spanAt(subdashas(mahadasha), when.getTime());
  const pratyantar = spanAt(subdashas(antardasha), when.getTime());
  const sukshma = spanAt(subdashas(pratyantar), when.getTime());
  const prana = spanAt(subdashas(sukshma), when.getTime());
  return { mahadasha, antardasha, pratyantar, sukshma, prana };
}
