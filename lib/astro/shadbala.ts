import { SunPosition } from "astronomy-engine";
import {
  ayanamsaDegrees,
  degInSign,
  houseFrom,
  navamsaSign,
  norm,
  separation,
  signIndex,
  type GrahaPosition,
  type SkySnapshot,
} from "./calc";
import { EXALTATION, GRAHA_NAME, MOOLATRIKONA, OWN_SIGNS, SIGN_LORD, type GrahaId } from "./constants";
import { utcToZonedParts } from "./time";

const SAPTA: GrahaId[] = ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn"];

const NAISARGIKA: Record<GrahaId, number> = {
  sun: 60,
  moon: 51.43,
  mars: 17.14,
  mercury: 25.7,
  jupiter: 34.28,
  venus: 42.85,
  saturn: 8.57,
  rahu: 0,
  ketu: 0,
};

const REQUIRED: Record<GrahaId, number> = {
  sun: 390,
  moon: 360,
  mars: 300,
  mercury: 420,
  jupiter: 390,
  venus: 330,
  saturn: 300,
  rahu: 0,
  ketu: 0,
};

const MEAN_SPEED: Partial<Record<GrahaId, number>> = {
  mars: 0.524,
  mercury: 1.383,
  jupiter: 0.083,
  venus: 1.602,
  saturn: 0.033,
};

const FRIENDS: Record<GrahaId, GrahaId[]> = {
  sun: ["moon", "mars", "jupiter"],
  moon: ["sun", "mercury"],
  mars: ["sun", "moon", "jupiter"],
  mercury: ["sun", "venus"],
  jupiter: ["sun", "moon", "mars"],
  venus: ["mercury", "saturn"],
  saturn: ["mercury", "venus"],
  rahu: [],
  ketu: [],
};

const ENEMIES: Record<GrahaId, GrahaId[]> = {
  sun: ["venus", "saturn"],
  moon: [],
  mars: ["mercury"],
  mercury: ["moon"],
  jupiter: ["mercury", "venus"],
  venus: ["sun", "moon"],
  saturn: ["sun", "moon", "mars"],
  rahu: [],
  ketu: [],
};

const HORA_ORDER: GrahaId[] = ["sun", "venus", "mercury", "moon", "saturn", "jupiter", "mars"];
const WEEK_START = [0, 3, 6, 2, 5, 1, 4];

export type ShadbalaGrade = "Excellent" | "Strong" | "Good" | "Average" | "Weak" | "Bad";

export type ShadbalaRow = {
  id: GrahaId;
  name: string;
  sthana: number;
  dig: number;
  kala: number;
  chesta: number;
  naisargika: number;
  drik: number;
  total: number;
  rupas: number;
  required: number;
  grade: ShadbalaGrade;
  note?: string;
};

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function shadbalaGrade(total: number, required: number): ShadbalaGrade {
  if (!(required > 0)) return "Bad";
  const ratio = total / required;
  if (ratio >= 1.5) return "Excellent";
  if (ratio >= 1.25) return "Strong";
  if (ratio >= 1) return "Good";
  if (ratio >= 0.75) return "Average";
  if (ratio >= 0.5) return "Weak";
  return "Bad";
}

function oddSign(sign: number): boolean {
  return sign % 2 === 0;
}

function vargaSign(kind: "d1" | "hora" | "drek" | "sapta" | "navamsa" | "dwad" | "trim", lon: number): number {
  const sign = signIndex(lon);
  const deg = degInSign(lon);
  if (kind === "d1") return sign;
  if (kind === "navamsa") return navamsaSign(lon);
  if (kind === "hora") {
    const second = deg >= 15;
    if (oddSign(sign)) return second ? 3 : 4;
    return second ? 4 : 3;
  }
  if (kind === "drek") {
    const part = Math.min(2, Math.floor(deg / 10));
    return (sign + [0, 4, 8][part]!) % 12;
  }
  if (kind === "sapta") {
    const part = Math.min(6, Math.floor(deg / (30 / 7)));
    return (sign + (oddSign(sign) ? 0 : 6) + part) % 12;
  }
  if (kind === "dwad") {
    const part = Math.min(11, Math.floor(deg / 2.5));
    return (sign + part) % 12;
  }
  if (oddSign(sign)) {
    if (deg < 5) return 0;
    if (deg < 10) return 10;
    if (deg < 18) return 8;
    if (deg < 25) return 2;
    return 6;
  }
  if (deg < 5) return 1;
  if (deg < 12) return 5;
  if (deg < 20) return 11;
  if (deg < 25) return 9;
  return 7;
}

function natural(a: GrahaId, b: GrahaId): "friend" | "neutral" | "enemy" {
  if (FRIENDS[a].includes(b)) return "friend";
  if (ENEMIES[a].includes(b)) return "enemy";
  return "neutral";
}

function compoundPoints(planet: GrahaId, lord: GrahaId, planetSign: number, lordSign: number): number {
  const tempFriend = [2, 3, 4, 10, 11, 12].includes(houseFrom(lordSign, planetSign));
  const nat = natural(planet, lord);
  if (nat === "friend" && tempFriend) return 22.5;
  if (nat === "friend" && !tempFriend) return 7.5;
  if (nat === "neutral" && tempFriend) return 15;
  if (nat === "neutral" && !tempFriend) return 3.75;
  if (nat === "enemy" && tempFriend) return 7.5;
  return 1.875;
}

function saptavargaja(planet: GrahaId, lon: number, signs: Map<GrahaId, number>): number {
  const kinds = ["d1", "hora", "drek", "sapta", "navamsa", "dwad", "trim"] as const;
  let total = 0;
  for (const kind of kinds) {
    const sign = vargaSign(kind, lon);
    const own = OWN_SIGNS[planet]?.includes(sign) ?? false;
    const moola = kind === "d1" && inMoolatrikona(planet, lon);
    if (moola) total += 45;
    else if (own) total += 30;
    else {
      const lord = SIGN_LORD[sign]!;
      const lordSign = signs.get(lord) ?? sign;
      total += compoundPoints(planet, lord, signs.get(planet) ?? signIndex(lon), lordSign);
    }
  }
  return total;
}

function inMoolatrikona(planet: GrahaId, lon: number): boolean {
  const span = MOOLATRIKONA[planet];
  if (!span) return false;
  const sign = signIndex(lon);
  const deg = degInSign(lon);
  return sign === span.sign && deg >= span.start && deg < span.end;
}

function uchcha(planet: GrahaId, lon: number): number {
  const exalt = EXALTATION[planet];
  if (!exalt) return 0;
  const exaltLon = exalt.sign * 30 + exalt.deg;
  const dist = separation(lon, exaltLon);
  return (180 - dist) / 3;
}

function ojayugma(planet: GrahaId, lon: number): number {
  const female = planet === "moon" || planet === "venus";
  const rasi = oddSign(signIndex(lon));
  const nav = oddSign(navamsaSign(lon));
  const likesOdd = !female;
  return (rasi === likesOdd ? 15 : 0) + (nav === likesOdd ? 15 : 0);
}

function kendradi(sign: number, lagnaSign: number): number {
  const house = houseFrom(sign, lagnaSign);
  if (house === 1 || house === 4 || house === 7 || house === 10) return 60;
  if (house === 2 || house === 5 || house === 8 || house === 11) return 30;
  return 15;
}

function drekkanaBala(planet: GrahaId, lon: number): number {
  const part = Math.min(2, Math.floor(degInSign(lon) / 10));
  if ((planet === "sun" || planet === "mars" || planet === "jupiter") && part === 0) return 15;
  if ((planet === "mercury" || planet === "saturn") && part === 1) return 15;
  if ((planet === "moon" || planet === "venus") && part === 2) return 15;
  return 0;
}

function dig(planet: GrahaId, lon: number, lagna: number): number {
  const weak =
    planet === "jupiter" || planet === "mercury"
      ? lagna + 180
      : planet === "sun" || planet === "mars"
        ? lagna + 90
        : planet === "saturn"
          ? lagna
          : lagna + 270;
  return (180 - separation(lon, weak)) / 3;
}

function declination(siderealLon: number, lat: number, ayanamsa: number): number {
  const lambda = (norm(siderealLon + ayanamsa) * Math.PI) / 180;
  const beta = (lat * Math.PI) / 180;
  const eps = (23.439291 * Math.PI) / 180;
  const sinD = Math.sin(beta) * Math.cos(eps) + Math.cos(beta) * Math.sin(eps) * Math.sin(lambda);
  return (Math.asin(Math.max(-1, Math.min(1, sinD))) * 180) / Math.PI;
}

function ayana(planet: GrahaId, decl: number): number {
  const raw = planet === "moon" || planet === "saturn" ? (24 - decl) * 1.25 : (24 + decl) * 1.25;
  return Math.max(0, Math.min(60, raw));
}

function weekday(date: Date, timeZone: string): number {
  const name = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(date);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(name);
}

function siderealSun(date: Date, sky: SkySnapshot): number {
  return norm(SunPosition(date).elon - ayanamsaDegrees(date, sky.ayanamsaId));
}

function yearLord(when: Date, sky: SkySnapshot, timeZone: string): GrahaId {
  let lo = when.getTime() - 370 * 86400000;
  let hi = when.getTime();
  for (let i = 0; i < 22; i++) {
    const mid = (lo + hi) / 2;
    const lon = siderealSun(new Date(mid), sky);
    if (lon > 180) lo = mid;
    else hi = mid;
  }
  const lords: GrahaId[] = ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn"];
  return lords[weekday(new Date(hi), timeZone)] ?? "sun";
}

function horaLord(when: Date, sunrise: Date | null, sunset: Date | null, vara: number): GrahaId {
  let hora = 0;
  if (sunrise && sunset && sunset.getTime() > sunrise.getTime()) {
    const dayLen = sunset.getTime() - sunrise.getTime();
    const nightLen = 86400000 - dayLen;
    const t = when.getTime();
    if (t >= sunrise.getTime() && t < sunset.getTime()) {
      hora = Math.min(11, Math.floor((t - sunrise.getTime()) / (dayLen / 12)));
    } else {
      const nightStart = t >= sunset.getTime() ? sunset.getTime() : sunrise.getTime() - nightLen;
      hora = 12 + Math.min(11, Math.max(0, Math.floor((t - nightStart) / (nightLen / 12))));
    }
  }
  const start = WEEK_START[vara] ?? 0;
  return HORA_ORDER[(start + hora) % 7] ?? "sun";
}

function tribhaga(planet: GrahaId, when: Date, sunrise: Date | null, sunset: Date | null): number {
  if (planet === "jupiter") return 60;
  if (!sunrise || !sunset || sunset.getTime() <= sunrise.getTime()) return 0;
  const dayLen = sunset.getTime() - sunrise.getTime();
  const nightLen = 86400000 - dayLen;
  const t = when.getTime();
  let lord: GrahaId;
  if (t >= sunrise.getTime() && t < sunset.getTime()) {
    const part = Math.min(2, Math.floor((t - sunrise.getTime()) / (dayLen / 3)));
    lord = (["mercury", "sun", "saturn"] as GrahaId[])[part]!;
  } else {
    const nightStart = t >= sunset.getTime() ? sunset.getTime() : sunrise.getTime() - nightLen;
    const part = Math.min(2, Math.floor((t - nightStart) / (nightLen / 3)));
    lord = (["moon", "venus", "mars"] as GrahaId[])[part]!;
  }
  return planet === lord ? 60 : 0;
}

function aspectVirupas(from: number, to: number, id: GrahaId): number {
  const arc = norm(to - from);
  const knots: [number, number][] = [
    [30, 0],
    [60, 15],
    [90, 45],
    [120, 30],
    [150, 15],
    [180, 60],
    [210, 15],
    [240, 30],
    [270, 45],
    [300, 0],
  ];
  let general = 0;
  if (arc > 30 && arc < 300) {
    for (let i = 0; i < knots.length - 1; i++) {
      const a = knots[i]!;
      const b = knots[i + 1]!;
      if (arc >= a[0] && arc <= b[0]) {
        const t = (arc - a[0]) / (b[0] - a[0]);
        general = a[1] + (b[1] - a[1]) * t;
        break;
      }
    }
  }
  const specials =
    id === "mars" ? [90, 210] : id === "jupiter" ? [120, 240] : id === "saturn" ? [60, 270] : [];
  let special = 0;
  for (const peak of specials) {
    const gap = Math.abs(arc - peak);
    if (gap < 30) special = Math.max(special, 60 * (1 - gap / 30));
  }
  if (Math.abs(arc - 180) < 30) special = Math.max(special, 60 * (1 - Math.abs(arc - 180) / 30));
  return Math.max(general, special);
}

function chestaOf(planet: GrahaId, speed: number, ayanaBala: number, paksha: number): number {
  if (planet === "sun") return ayanaBala;
  if (planet === "moon") return paksha;
  const mean = MEAN_SPEED[planet] ?? 0.5;
  if (speed < 0) return 30 + 30 * Math.min(1, Math.abs(speed) / mean);
  return Math.max(0, 60 * (1 - Math.min(2, speed / mean) / 2));
}

export function shadbala(sky: SkySnapshot, when: Date, timeZone: string): ShadbalaRow[] {
  const byId = new Map(sky.grahas.map((graha) => [graha.id, graha]));
  const signs = new Map<GrahaId, number>();
  for (const graha of sky.grahas) signs.set(graha.id, signIndex(graha.lon));
  const lagnaSign = signIndex(sky.lagna);
  const sun = byId.get("sun");
  const moon = byId.get("moon");
  const parts = utcToZonedParts(when, timeZone);
  const hours = parts.hour + parts.minute / 60 + parts.second / 3600;
  let dayArc = (hours / 24) * 360;
  if (dayArc > 180) dayArc = 360 - dayArc;
  const diurnal = dayArc / 3;
  const phase = sun && moon ? separation(moon.lon, sun.lon) / 3 : 30;
  const sunrise = sky.panchang.sunrise;
  const sunset = sky.panchang.sunset;
  const vara = sky.panchang.vara;
  const varaLord = (["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn"] as GrahaId[])[vara] ?? "sun";
  const hora = horaLord(when, sunrise, sunset, vara);
  const masa = sun ? SIGN_LORD[signIndex(sun.lon)]! : "sun";
  const abda = yearLord(when, sky, timeZone);
  const benefics = new Set<GrahaId>(["jupiter", "venus"]);
  if (moon && phase >= 30) benefics.add("moon");
  const mercury = byId.get("mercury");
  if (mercury) {
    const withMalefic = sky.grahas.some(
      (graha) => graha.id !== "mercury" && signIndex(graha.lon) === signIndex(mercury.lon) && ["sun", "mars", "saturn"].includes(graha.id),
    );
    if (!withMalefic) benefics.add("mercury");
  }

  return SAPTA.map((id) => {
    const graha = byId.get(id);
    if (!graha) {
      return {
        id,
        name: GRAHA_NAME[id],
        sthana: 0,
        dig: 0,
        kala: 0,
        chesta: 0,
        naisargika: NAISARGIKA[id],
        drik: 0,
        total: 0,
        rupas: 0,
        required: REQUIRED[id],
        grade: "Bad",
        note: "Not in this sky.",
      };
    }
    const decl = declination(graha.lon, graha.lat, sky.ayanamsa);
    const ay = ayana(id, decl);
    const uchchaBala = uchcha(id, graha.lon);
    const sapta = saptavargaja(id, graha.lon, signs);
    const sthana = uchchaBala + sapta + ojayugma(id, graha.lon) + kendradi(signIndex(graha.lon), lagnaSign) + drekkanaBala(id, graha.lon);
    const digBala = dig(id, graha.lon, sky.lagna);
    const nath = id === "mercury" ? 60 : id === "sun" || id === "jupiter" || id === "venus" ? diurnal : 60 - diurnal;
    const paksha = id === "moon" ? phase * 2 : benefics.has(id) ? phase : 60 - phase;
    const lords = (id === varaLord ? 15 : 0) + (id === hora ? 15 : 0) + (id === masa ? 15 : 0) + (id === abda ? 15 : 0);
    const kala = nath + paksha + tribhaga(id, when, sunrise, sunset) + lords + ay;
    const chesta = chestaOf(id, graha.speed, ay, id === "moon" ? phase * 2 : phase);
    let drik = 0;
    for (const other of sky.grahas) {
      if (other.id === id || !SAPTA.includes(other.id)) continue;
      const aspect = aspectVirupas(other.lon, graha.lon, other.id) / 4;
      const gives = benefics.has(other.id) ? 1 : -1;
      drik += aspect * gives;
    }
    const total = sthana + digBala + kala + chesta + NAISARGIKA[id] + drik;
    return {
      id,
      name: GRAHA_NAME[id],
      sthana: round1(sthana),
      dig: round1(digBala),
      kala: round1(kala),
      chesta: round1(chesta),
      naisargika: NAISARGIKA[id],
      drik: round1(drik),
      total: round1(total),
      rupas: round1(total / 60),
      required: REQUIRED[id],
      grade: shadbalaGrade(total, REQUIRED[id]),
    };
  });
}
