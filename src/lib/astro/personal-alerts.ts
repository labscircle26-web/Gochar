import { bodyLongitude, computeSky, houseFrom, mahadashas, subdashas, signIndex } from "./calc";
import { drishtiLabel, drishtiOffsets } from "./drishti";
import { GRAHA_NAME, RASHIS, type AyanamsaId, type GrahaId, type NodeMode } from "./constants";
import type { BirthProfile } from "./library";
import { zonedToUtc } from "./time";
import { crossesAngularBoundary } from "./personal-alerts-math";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const DEFAULT_HORIZON_DAYS = 180;
const SAMPLE_STEP = 12 * HOUR;
const WATCHABLE_GRAHAS: GrahaId[] = ["jupiter", "saturn", "rahu", "ketu"];

export type PersonalAlertKind = "house" | "natal-contact" | "mahadasha" | "antardasha";

export type PersonalTransitAlert = {
  id: string;
  at: number;
  kind: PersonalAlertKind;
  title: string;
  line: string;
  detail: string;
};

export type PersonalAlertOptions = {
  houseChanges: boolean;
  natalContacts: boolean;
  dashaChanges: boolean;
  transitingGrahas: GrahaId[];
};

type Sample = { at: number; lon: number };

function interpolateCrossing(
  valueAt: (time: number) => number,
  start: number,
  end: number,
  before: number,
  target: number,
): number {
  let low = start;
  let high = end;
  for (let iteration = 0; iteration < 20; iteration++) {
    const middle = Math.floor((low + high) / 2);
    if (crossesAngularBoundary(before, valueAt(middle), target)) high = middle;
    else low = middle;
  }
  return high;
}

function birthInstant(profile: BirthProfile): Date {
  return zonedToUtc(
    profile.year,
    profile.month,
    profile.day,
    profile.hour,
    profile.minute,
    profile.second,
    profile.tz,
  );
}

function eventId(kind: string, ...parts: (string | number)[]): string {
  return [kind, ...parts].join("|");
}

function pushUnique(events: PersonalTransitAlert[], seen: Set<string>, event: PersonalTransitAlert) {
  if (!Number.isFinite(event.at) || seen.has(event.id)) return;
  seen.add(event.id);
  events.push(event);
}

function getTransitSamples(
  id: GrahaId,
  from: number,
  until: number,
  ayanamsa: AyanamsaId,
  node: NodeMode,
): Sample[] {
  const samples: Sample[] = [];
  const longitude = (at: number) => bodyLongitude(id, new Date(at), ayanamsa, node);
  for (let at = from; at < until; at += SAMPLE_STEP) samples.push({ at, lon: longitude(at) });
  samples.push({ at: until, lon: longitude(until) });
  return samples;
}

/**
 * Finds personalized whole-sign house ingress, exact Parashari contact, and
 * Vimshottari major/sub-period changes for one locally saved birth profile.
 * Transit positions use the profile's own ayanamsa and node mode.
 */
export function findPersonalTransitAlerts(
  profile: BirthProfile,
  from: Date,
  options: PersonalAlertOptions,
  horizonDays = DEFAULT_HORIZON_DAYS,
): PersonalTransitAlert[] {
  const start = from.getTime();
  const until = start + Math.max(1, Math.min(365, horizonDays)) * DAY;
  const birth = birthInstant(profile);
  const natal = computeSky(birth, profile.lat, profile.lon, profile.tz, profile.ayanamsa, profile.node);
  const natalLagna = signIndex(natal.lagna);
  const natalGrahas = natal.grahas;
  const events: PersonalTransitAlert[] = [];
  const seen = new Set<string>();

  const selected = WATCHABLE_GRAHAS.filter((id) => options.transitingGrahas.includes(id));
  for (const transitId of selected) {
    const samples = getTransitSamples(transitId, start, until, profile.ayanamsa, profile.node);

    if (options.houseChanges) {
      for (let index = 0; index < samples.length - 1; index++) {
        const before = samples[index]!;
        const after = samples[index + 1]!;
        for (let boundary = 0; boundary < 360; boundary += 30) {
          if (!crossesAngularBoundary(before.lon, after.lon, boundary)) continue;
          const at = interpolateCrossing(
            (time) => bodyLongitude(transitId, new Date(time), profile.ayanamsa, profile.node),
            before.at,
            after.at,
            before.lon,
            boundary,
          );
          const beforeLon = bodyLongitude(transitId, new Date(Math.max(start, at - 5 * 60_000)), profile.ayanamsa, profile.node);
          const afterLon = bodyLongitude(transitId, new Date(Math.min(until, at + 5 * 60_000)), profile.ayanamsa, profile.node);
          const fromSign = signIndex(beforeLon);
          const toSign = signIndex(afterLon);
          if (fromSign === toSign) continue;
          const house = houseFrom(toSign, natalLagna);
          pushUnique(events, seen, {
            id: eventId("house", transitId, at),
            at,
            kind: "house",
            title: `${GRAHA_NAME[transitId]} enters ${RASHIS[toSign]?.name}`,
            line: `Your ${house}${house === 1 ? "st" : house === 2 ? "nd" : house === 3 ? "rd" : "th"} house · ${RASHIS[fromSign]?.name} → ${RASHIS[toSign]?.name}`,
            detail: `${GRAHA_NAME[transitId]} moves from ${RASHIS[fromSign]?.name} into ${RASHIS[toSign]?.name}, activating your ${house}${house === 1 ? "st" : house === 2 ? "nd" : house === 3 ? "rd" : "th"} whole-sign house from ${RASHIS[natalLagna]?.name} Lagna.`,
          });
        }
      }
    }

    if (!options.natalContacts) continue;
    const aspectOffsets = drishtiOffsets(transitId, "seventh");
    const contactOffsets = [0, ...aspectOffsets];

    for (const natalGraha of natalGrahas) {
      const natalHouse = houseFrom(signIndex(natalGraha.lon), natalLagna);
      for (const offset of contactOffsets) {
        const target = norm(offset * 30);
        const relative = (at: number) =>
          norm(natalGraha.lon - bodyLongitude(transitId, new Date(at), profile.ayanamsa, profile.node));

        for (let index = 0; index < samples.length - 1; index++) {
          const before = samples[index]!;
          const after = samples[index + 1]!;
          const relBefore = norm(natalGraha.lon - before.lon);
          const relAfter = norm(natalGraha.lon - after.lon);
          if (!crossesAngularBoundary(relBefore, relAfter, target)) continue;

          const at = interpolateCrossing(relative, before.at, after.at, relBefore, target);
          const contactName =
            offset === 0
              ? "conjunction"
              : `${drishtiLabel(offset)} aspect`;
          const title =
            offset === 0
              ? `${GRAHA_NAME[transitId]} conjuncts your natal ${GRAHA_NAME[natalGraha.id]}`
              : `${GRAHA_NAME[transitId]}'s ${contactName} reaches your natal ${GRAHA_NAME[natalGraha.id]}`;
          pushUnique(events, seen, {
            id: eventId("contact", transitId, natalGraha.id, offset, at),
            at,
            kind: "natal-contact",
            title,
            line: `Natal ${GRAHA_NAME[natalGraha.id]} · ${RASHIS[signIndex(natalGraha.lon)]?.name} · house ${natalHouse}`,
            detail: `${GRAHA_NAME[transitId]} makes an exact ${contactName} to your natal ${GRAHA_NAME[natalGraha.id]} in your ${natalHouse}${natalHouse === 1 ? "st" : natalHouse === 2 ? "nd" : natalHouse === 3 ? "rd" : "th"} house.`,
          });
        }
      }
    }
  }

  if (options.dashaChanges) {
    const moon = natalGrahas.find((graha) => graha.id === "moon");
    if (moon) {
      const major = mahadashas(birth, moon.lon);
      for (const span of major) {
        const majorAt = span.start.getTime();
        if (majorAt > start && majorAt <= until) {
          pushUnique(events, seen, {
            id: eventId("mahadasha", span.lord, majorAt),
            at: majorAt,
            kind: "mahadasha",
            title: `${GRAHA_NAME[span.lord]} Mahadasha begins`,
            line: "Vimshottari · Mahadasha",
            detail: `Your ${GRAHA_NAME[span.lord]} Mahadasha begins.`,
          });
        }
        for (const sub of subdashas(span)) {
          const subAt = sub.start.getTime();
          if (subAt <= start || subAt > until) continue;
          pushUnique(events, seen, {
            id: eventId("antardasha", span.lord, sub.lord, subAt),
            at: subAt,
            kind: "antardasha",
            title: `${GRAHA_NAME[sub.lord]} Antardasha begins`,
            line: `Inside ${GRAHA_NAME[span.lord]} Mahadasha`,
            detail: `Your ${GRAHA_NAME[sub.lord]} Antardasha begins within ${GRAHA_NAME[span.lord]} Mahadasha.`,
          });
        }
      }
    }
  }

  return events
    .filter((event) => event.at > start + 60_000 && event.at <= until)
    .sort((left, right) => left.at - right.at)
    .slice(0, 60);
}
