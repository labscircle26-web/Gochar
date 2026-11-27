import {
  COMBUST_ORB,
  EXALTATION,
  GRAHA_NAME,
  MOOLATRIKONA,
  NAKSHATRAS,
  NAKSHATRA_LORDS,
  OWN_SIGNS,
  RASHIS,
  SIGN_LORD,
  type GrahaId,
} from "./constants";
import { type GrahaPosition, degInSign, houseFrom, nakshatraIndex, padaOf, separation, signIndex } from "./calc";

export type Dignity = "deep exaltation" | "moolatrikona" | "exalted" | "deep debilitation" | "debilitated" | "own sign";

export function dignityOf(id: GrahaId, lon: number): Dignity | null {
  const sign = signIndex(lon);
  const deg = degInSign(lon);
  const exalt = EXALTATION[id];
  const mt = MOOLATRIKONA[id];
  if (mt && sign === mt.sign && deg >= mt.start && deg < mt.end) return "moolatrikona";
  if (exalt && sign === exalt.sign) {
    return Math.abs(deg - exalt.deg) < 1 ? "deep exaltation" : "exalted";
  }
  if (exalt && sign === (exalt.sign + 6) % 12) {
    return Math.abs(deg - exalt.deg) < 1 ? "deep debilitation" : "debilitated";
  }
  if (OWN_SIGNS[id]?.includes(sign)) return "own sign";
  return null;
}

export function isCombust(id: GrahaId, lon: number, retro: boolean, sunLon: number): boolean {
  const orb = COMBUST_ORB[id];
  if (!orb) return false;
  return separation(lon, sunLon) <= (retro ? orb.retro : orb.direct);
}

const WAR_BODIES: GrahaId[] = ["mars", "mercury", "jupiter", "venus", "saturn"];

export function warsOf(grahas: GrahaPosition[]): string[] {
  const notes: string[] = [];
  for (let i = 0; i < WAR_BODIES.length; i++) {
    for (let j = i + 1; j < WAR_BODIES.length; j++) {
      const a = grahas.find((graha) => graha.id === WAR_BODIES[i]);
      const b = grahas.find((graha) => graha.id === WAR_BODIES[j]);
      if (!a || !b) continue;
      const gap = separation(a.lon, b.lon);
      if (gap <= 1) notes.push(`${GRAHA_NAME[a.id]} and ${GRAHA_NAME[b.id]} within ${gap.toFixed(2)}°`);
    }
  }
  return notes;
}

const ASPECT_OFFSETS: Record<GrahaId, number[]> = {
  sun: [6],
  moon: [6],
  mercury: [6],
  venus: [6],
  mars: [3, 6, 7],
  jupiter: [4, 6, 8],
  saturn: [2, 6, 9],
  rahu: [4, 6, 8],
  ketu: [4, 6, 8],
};

const ASPECT_NAME: Record<number, string> = {
  2: "3rd",
  3: "4th",
  4: "5th",
  6: "7th",
  7: "8th",
  8: "9th",
  9: "10th",
};

export function aspectsOnSign(grahas: GrahaPosition[], targetSign: number): string[] {
  const lines: string[] = [];
  for (const graha of grahas) {
    const from = signIndex(graha.lon);
    const house = houseFrom(targetSign, from);
    const offset = house - 1;
    if (ASPECT_OFFSETS[graha.id].includes(offset)) {
      lines.push(`${GRAHA_NAME[graha.id]} by ${ASPECT_NAME[offset] ?? "aspect"}`);
    }
  }
  return lines;
}

export type SadeSati = "opening" | "peak" | "setting";

export function sadeSatiPhase(saturnSign: number, natalMoonSign: number): SadeSati | null {
  const house = houseFrom(saturnSign, natalMoonSign);
  if (house === 12) return "opening";
  if (house === 1) return "peak";
  if (house === 2) return "setting";
  return null;
}

const FROM_MOON = [
  "on the natal Moon",
  "in the 2nd from the Moon — household, speech, savings",
  "in the 3rd — courage, siblings, short journeys",
  "in the 4th — home, mother, inner ease",
  "in the 5th — children, intelligence, speculation",
  "in the 6th — work, illness, competition",
  "in the 7th — partnership and open conflict",
  "in the 8th — sudden change, shared resources",
  "in the 9th — dharma, teachers, long travel",
  "in the 10th — karma, status, public work",
  "in the 11th — gains, friends, hopes",
  "in the 12th — loss, retreat, foreign places",
];

export function moonHouseNote(id: GrahaId, sign: number, moonSign: number): string {
  const house = houseFrom(sign, moonSign);
  const theme = FROM_MOON[house - 1];
  return theme ? `${GRAHA_NAME[id]} ${theme}` : "";
}

export function exactContacts(
  transit: GrahaPosition[],
  natal: { label: string; lon: number }[],
): { transit: GrahaId; natal: string; gap: number }[] {
  const hits: { transit: GrahaId; natal: string; gap: number }[] = [];
  for (const graha of transit) {
    if (graha.id === "ketu") continue;
    for (const point of natal) {
      const gap = separation(graha.lon, point.lon);
      if (gap <= 1) hits.push({ transit: graha.id, natal: point.label, gap });
    }
  }
  return hits.sort((a, b) => a.gap - b.gap);
}

export const HOUSE_THEME = [
  "the body, self, and how life starts",
  "family, speech, and stored wealth",
  "courage, siblings, and personal effort",
  "home, mother, and emotional ground",
  "children, intelligence, and past credit",
  "illness, debt, service, and opponents",
  "marriage, partnership, and the other person",
  "sudden change, longevity, and what is hidden",
  "dharma, teachers, father, and fortune",
  "work, status, and visible karma",
  "gains, friends, and fulfilled hopes",
  "loss, sleep, foreign places, and release",
];

const NATURAL_MALEFIC: GrahaId[] = ["sun", "mars", "saturn", "rahu", "ketu"];

export type FunctionalRole = "yogakaraka" | "benefic" | "malefic" | "mixed" | "neutral";

export function functionalRole(lagnaSign: number, id: GrahaId): { role: FunctionalRole; houses: number[] } {
  if (id === "rahu" || id === "ketu") return { role: "malefic", houses: [] };
  const houses: number[] = [];
  for (let sign = 0; sign < 12; sign++) {
    if (SIGN_LORD[sign] === id) houses.push(houseFrom(sign, lagnaSign));
  }
  const trikona = houses.some((house) => house === 1 || house === 5 || house === 9);
  const kendra = houses.some((house) => house === 4 || house === 7 || house === 10);
  const dusthana = houses.some((house) => house === 6 || house === 8 || house === 12);
  const upachayaMalefic = houses.some((house) => house === 3 || house === 11);
  if (kendra && trikona && !dusthana) return { role: "yogakaraka", houses };
  if (trikona && (dusthana || upachayaMalefic)) return { role: "mixed", houses };
  if (trikona) return { role: "benefic", houses };
  if (dusthana || upachayaMalefic) return { role: "malefic", houses };
  if (kendra) return { role: "neutral", houses };
  return { role: "neutral", houses };
}

function placePhrase(graha: GrahaPosition, lagnaSign: number): string {
  const sign = signIndex(graha.lon);
  const nak = nakshatraIndex(graha.lon);
  const dignity = dignityOf(graha.id, graha.lon);
  return `${GRAHA_NAME[graha.id]} in ${RASHIS[sign]?.name}, house ${houseFrom(sign, lagnaSign)}, ${formatDeg(graha.lon)}${graha.retro ? ", retrograde" : ""}${dignity ? `, ${dignity}` : ""}, ${NAKSHATRAS[nak]} pada ${padaOf(graha.lon)} (lord ${GRAHA_NAME[NAKSHATRA_LORDS[nak % 9]!]})`;
}

function formatDeg(lon: number): string {
  const deg = degInSign(lon);
  const d = Math.floor(deg);
  const m = Math.floor((deg - d) * 60);
  return `${d}°${String(m).padStart(2, "0")}′`;
}

export function houseReading(grahas: GrahaPosition[], lagnaSign: number, sign: number): {
  title: string;
  lord: string;
  occupants: string;
  conjunction: string;
  nature: string;
  drishti: string;
  effect: string;
} {
  const house = houseFrom(sign, lagnaSign);
  const lordId = SIGN_LORD[sign]!;
  const lord = grahas.find((graha) => graha.id === lordId);
  const role = functionalRole(lagnaSign, lordId);
  const occupants = grahas.filter((graha) => signIndex(graha.lon) === sign);
  const aspectLines = aspectsOnSign(
    grahas.filter((graha) => signIndex(graha.lon) !== sign),
    sign,
  );

  const lordText = lord
    ? `${placePhrase(lord, lagnaSign)}. Rules house${role.houses.length === 1 ? "" : "s"} ${role.houses.join(" and ") || "—"}. For this lagna the lord is ${role.role}.`
    : `${GRAHA_NAME[lordId]} rules this house.`;

  const occupantText =
    occupants.length === 0
      ? "No graha occupies this house. Read it from the lord."
      : occupants.map((graha) => placePhrase(graha, lagnaSign)).join(". ") + ".";

  let conjunction = "No conjunction. The house is empty or holds a single graha.";
  if (occupants.length > 1) {
    const pairs: string[] = [];
    for (let i = 0; i < occupants.length; i++) {
      for (let j = i + 1; j < occupants.length; j++) {
        const gap = separation(occupants[i]!.lon, occupants[j]!.lon);
        pairs.push(
          `${GRAHA_NAME[occupants[i]!.id]} with ${GRAHA_NAME[occupants[j]!.id]}${gap <= 8 ? `, close (${gap.toFixed(1)}°)` : ` (${gap.toFixed(1)}° apart in the same sign)`}`,
        );
      }
    }
    conjunction = pairs.join("; ") + ".";
  }

  const natureBits = occupants.map((graha) => {
    const own = functionalRole(lagnaSign, graha.id);
    const natural = NATURAL_MALEFIC.includes(graha.id) ? "natural malefic" : graha.id === "jupiter" || graha.id === "venus" ? "natural benefic" : "natural neutral";
    return `${GRAHA_NAME[graha.id]} is ${own.role} for this lagna and a ${natural}`;
  });
  if (natureBits.length === 0 && lord) {
    const natural = NATURAL_MALEFIC.includes(lordId) ? "natural malefic" : lordId === "jupiter" || lordId === "venus" ? "natural benefic" : "natural neutral";
    natureBits.push(`The lord ${GRAHA_NAME[lordId]} is ${role.role} for this lagna and a ${natural}`);
  }
  const nature = natureBits.join(". ") + ".";

  const drishti =
    aspectLines.length === 0
      ? "No special drishti on this house beyond occupation. Occupying grahas do not aspect their own house."
      : `${aspectLines.join("; ")}. Whole-sign drishti falls on the house and on every graha in it.`;

  let score = 0;
  if (role.role === "yogakaraka" || role.role === "benefic") score += 2;
  if (role.role === "malefic") score -= 2;
  if (role.role === "mixed") score -= 1;
  if (lord) {
    const lordHouse = houseFrom(signIndex(lord.lon), lagnaSign);
    if (lordHouse === 1 || lordHouse === 4 || lordHouse === 5 || lordHouse === 7 || lordHouse === 9 || lordHouse === 10) score += 1;
    if (lordHouse === 6 || lordHouse === 8 || lordHouse === 12) score -= 1;
    const dignity = dignityOf(lord.id, lord.lon);
    if (dignity === "exalted" || dignity === "deep exaltation" || dignity === "own sign" || dignity === "moolatrikona") score += 1;
    if (dignity === "debilitated" || dignity === "deep debilitation") score -= 1;
  }
  for (const graha of occupants) {
    const own = functionalRole(lagnaSign, graha.id);
    if (own.role === "benefic" || own.role === "yogakaraka") score += 1;
    if (own.role === "malefic") score -= 1;
  }
  for (const line of aspectLines) {
    if (line.startsWith("Jupiter") || line.startsWith("Venus")) score += 1;
    if (line.startsWith("Saturn") || line.startsWith("Mars") || line.startsWith("Rahu") || line.startsWith("Ketu")) score -= 1;
  }
  const tone = score >= 2 ? "more supportive than strained" : score >= 0 ? "mixed, and it works when effort is steady" : "more strained, and it asks for care";
  const effect = `House ${house} concerns ${HOUSE_THEME[house - 1]}. Taken together — lord, occupancy, nakshatra, conjunction, functional nature, and drishti — this house looks ${tone} for the native. This is a sketch from the chart, not a prediction.`;

  return {
    title: `House ${house} · ${RASHIS[sign]?.name ?? ""}`,
    lord: lordText,
    occupants: occupantText,
    conjunction,
    nature,
    drishti,
    effect,
  };
}
