import { NextGlobalSolarEclipse, NextLunarEclipse, SearchGlobalSolarEclipse, SearchLunarEclipse, SunPosition, EclipticGeoMoon } from "astronomy-engine";
import { ayanamsaDegrees, degInSign, navamsaSign, norm, signIndex } from "./calc";
import type { AyanamsaId, Division } from "./constants";

const WINDOW_MS = 40 * 24 * 60 * 60 * 1000;

export type EclipseDot = {
  kind: "solar" | "lunar";
  sign: number;
  label: string;
};

function tinyDegree(lon: number): string {
  let x = degInSign(lon);
  let deg = Math.floor(x + 1e-8);
  let minutes = Math.floor((x - deg) * 60 + 1e-8);
  if (minutes >= 60) {
    minutes = 0;
    deg += 1;
  }
  if (deg >= 30) deg = 0;
  return `${deg}°${minutes.toString().padStart(2, "0")}′`;
}

function place(lon: number, division: Division): number {
  return division === "navamsa" ? navamsaSign(lon) : signIndex(lon);
}

function siderealSun(when: Date, ayanamsaId: AyanamsaId): number {
  return norm(SunPosition(when).elon - ayanamsaDegrees(when, ayanamsaId));
}

function siderealMoon(when: Date, ayanamsaId: AyanamsaId): number {
  return norm(EclipticGeoMoon(when).lon - ayanamsaDegrees(when, ayanamsaId));
}

export function eclipseDots(when: Date, ayanamsaId: AyanamsaId, division: Division): EclipseDot[] {
  const start = new Date(when.getTime() - WINDOW_MS - 24 * 60 * 60 * 1000);
  const latest = when.getTime() + WINDOW_MS;
  const dots: EclipseDot[] = [];
  try {
    let solar = SearchGlobalSolarEclipse(start);
    for (let guard = 0; guard < 6; guard++) {
      const peak = solar.peak.date;
      if (peak.getTime() > latest) break;
      if (Math.abs(peak.getTime() - when.getTime()) <= WINDOW_MS) {
        const lon = siderealSun(peak, ayanamsaId);
        dots.push({ kind: "solar", sign: place(lon, division), label: tinyDegree(lon) });
      }
      solar = NextGlobalSolarEclipse(solar.peak);
    }
    let lunar = SearchLunarEclipse(start);
    for (let guard = 0; guard < 8; guard++) {
      const peak = lunar.peak.date;
      if (peak.getTime() > latest) break;
      if (Math.abs(peak.getTime() - when.getTime()) <= WINDOW_MS && (lunar.kind === "partial" || lunar.kind === "total")) {
        const lon = siderealMoon(peak, ayanamsaId);
        dots.push({ kind: "lunar", sign: place(lon, division), label: tinyDegree(lon) });
      }
      lunar = NextLunarEclipse(lunar.peak);
    }
  } catch {
    return [];
  }
  return dots;
}
