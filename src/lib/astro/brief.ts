import {
  degInSign,
  houseFrom,
  nakshatraIndex,
  navamsaSign,
  padaOf,
  signIndex,
  type SkySnapshot,
} from "./calc";
import { GRAHA_NAME, NAKSHATRAS, RASHIS, VARAS, type GrahaId } from "./constants";
import { formatDms } from "./format";
import { dignityOf, isCombust } from "./reading";
import { shadbala } from "./shadbala";
import { formatStamp } from "./time";

function placeOf(lon: number): string {
  const sign = RASHIS[signIndex(lon)]?.name ?? "—";
  const nak = NAKSHATRAS[nakshatraIndex(lon)] ?? "—";
  return `${sign} ${formatDms(degInSign(lon), true)}, ${nak} pada ${padaOf(lon)}, navamsa ${RASHIS[navamsaSign(lon)]?.name ?? "—"}`;
}

export function chartBrief(input: {
  kind: "gochar" | "birth";
  title: string;
  whenLabel: string;
  place: string;
  ayanamsaLabel: string;
  nodeLabel: string;
  sky: SkySnapshot;
  when: Date;
  timeZone: string;
  viewedLagna: number | null;
  dasha: string | null;
  eclipses: string | null;
}): string {
  const lagnaSign = signIndex(input.sky.lagna);
  const sunLon = input.sky.grahas.find((graha) => graha.id === "sun")?.lon ?? 0;
  const lines = input.sky.grahas.map((graha) => {
    const dignity = dignityOf(graha.id, graha.lon);
    const combust = isCombust(graha.id, graha.lon, graha.retro, sunLon);
    const house = houseFrom(signIndex(graha.lon), lagnaSign);
    return [
      GRAHA_NAME[graha.id as GrahaId],
      placeOf(graha.lon),
      `house ${house}`,
      graha.retro ? "retrograde" : "direct",
      `${graha.speed >= 0 ? "+" : ""}${graha.speed.toFixed(3)}°/d`,
      dignity ?? "no special dignity",
      combust ? "combust" : "not combust",
    ].join(", ");
  });
  const strength = shadbala(input.sky, input.when, input.timeZone)
    .map((row) => `${row.name} ${row.grade} (${row.rupas} rupas, required ${row.required} virupas)`)
    .join("; ");
  const panchang = input.sky.panchang;
  const vara = VARAS[panchang.vara] ?? "—";
  const viewed =
    input.viewedLagna === null
      ? "The chart is drawn from the true lagna."
      : `The drawn chart is rotated so ${RASHIS[input.viewedLagna]?.name ?? "that sign"} sits as the ascendant. Houses below are still counted from the true lagna.`;
  return [
    input.kind === "gochar" ? "Chart: live sidereal transit (gochar)." : "Chart: natal birth chart (janma).",
    `Title: ${input.title}`,
    `Moment: ${input.whenLabel}`,
    `Place: ${input.place}`,
    `Ayanamsa: ${input.ayanamsaLabel} ${formatDms(input.sky.ayanamsa)}`,
    `Nodes: ${input.nodeLabel}`,
    `Lagna: ${placeOf(input.sky.lagna)}`,
    viewed,
    `Panchang: vara ${vara}; tithi ${panchang.tithi.name}${panchang.tithi.paksha ? ` ${panchang.tithi.paksha}` : ""}; moon nakshatra ${panchang.nakshatra.name}; yoga ${panchang.yoga.name}; karana ${panchang.karana.name}; sunrise ${panchang.sunrise ? formatStamp(panchang.sunrise, input.timeZone) : "unknown"}; sunset ${panchang.sunset ? formatStamp(panchang.sunset, input.timeZone) : "unknown"}.`,
    "Grahas:",
    ...lines.map((line) => `- ${line}`),
    `Shadbala: ${strength}`,
    input.dasha ? `Vimshottari now: ${input.dasha}` : "Vimshottari: not included.",
    input.eclipses ? `Eclipses within 40 days: ${input.eclipses}` : "Eclipses within 40 days: none shown.",
  ].join("\n");
}
