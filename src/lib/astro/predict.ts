import type { GrahaId } from "./constants";
import { GRAHA_IDS, GRAHA_NAME, RASHIS, SIGN_LORD } from "./constants";
import type { GrahaPosition } from "./calc";
import { degInSign, houseFrom, signIndex, vimshottari } from "./calc";
import { drishtiLabel, drishtiOffsets, type NodeDrishti } from "./drishti";
import { careerReading } from "./career/engine";
import { dignityOf, functionalRole, isCombust } from "./reading";

const HOUSE_TITLE = [
  "1st House — Personality, identity, health and life direction",
  "2nd House — Wealth, savings, family and speech",
  "3rd House — Courage, communication, siblings and efforts",
  "4th House — Home, property, education and mother",
  "5th House — Education, intelligence, creativity and children",
  "6th House — Debts, competition, obstacles and disputes",
  "7th House — Marriage, relationships and partnerships",
  "8th House — Transformation, longevity and sudden developments",
  "9th House — Fortune, higher education, dharma and spirituality",
  "10th House — Career, profession, reputation and status",
  "11th House — Income, gains, networks and fulfilment",
  "12th House — Expenses, foreign residence, isolation and liberation",
];

const SIGNIFICATOR: GrahaId[][] = [
  ["sun"],
  ["jupiter"],
  ["mars"],
  ["moon"],
  ["jupiter"],
  ["mars", "saturn"],
  ["venus"],
  ["saturn"],
  ["jupiter"],
  ["sun", "mercury", "saturn"],
  ["jupiter"],
  ["saturn"],
];

export type PredictionRule = { id: string; text: string; included: boolean; why: string };
export type PredictionSection = { title: string; body: string };

export type HousePrediction = {
  title: string;
  house: number;
  sections: PredictionSection[];
  rules: PredictionRule[];
  support: string[];
  strain: string[];
  disclaimer: string;
};

const DISCLAIMER =
  "This is a traditional reading of the calculated chart. It is not a certain prediction of marriage, health, wealth, death, or any other outcome.";

export function predictHouse(input: {
  natal: GrahaPosition[];
  lagnaSign: number;
  house: number;
  birth: Date;
  moonLon: number;
  when: Date;
  transit: GrahaPosition[];
  nodes?: NodeDrishti;
  sav?: number | null;
  lagnaLon?: number | null;
}): HousePrediction {
  const house = Math.min(12, Math.max(1, Math.round(input.house)));
  const sign = (input.lagnaSign + house - 1) % 12;
  const nodes = input.nodes ?? "seventh";
  const lordId = SIGN_LORD[sign]!;
  const lord = input.natal.find((graha) => graha.id === lordId);
  const occupants = input.natal.filter((graha) => signIndex(graha.lon) === sign);
  const sun = input.natal.find((graha) => graha.id === "sun");
  const role = functionalRole(input.lagnaSign, lordId);
  const lordHouse = lord ? houseFrom(signIndex(lord.lon), input.lagnaSign) : null;
  const aspects = aspectLines(input.natal.filter((graha) => signIndex(graha.lon) !== sign), sign, nodes);
  const dasha = vimshottari(input.birth, input.moonLon, input.when);
  const support: string[] = [];
  const strain: string[] = [];

  if (role.role === "yogakaraka" || role.role === "benefic") support.push(`The house lord is ${role.role} for this lagna.`);
  if (role.role === "malefic") strain.push("The house lord is functionally malefic for this lagna.");
  if (lordHouse !== null && [1, 4, 5, 7, 9, 10].includes(lordHouse)) support.push(`The lord sits in house ${lordHouse}.`);
  if (lordHouse !== null && [6, 8, 12].includes(lordHouse)) strain.push(`The lord sits in house ${lordHouse}.`);
  if (lord) {
    const dignity = dignityOf(lord.id, lord.lon);
    if (dignity === "exalted" || dignity === "deep exaltation" || dignity === "own sign" || dignity === "moolatrikona") support.push(`The lord is ${dignity}.`);
    if (dignity === "debilitated" || dignity === "deep debilitation") strain.push(`The lord is ${dignity}.`);
    if (lord.retro) strain.push("The lord is retrograde.");
  }
  for (const graha of occupants) {
    const own = functionalRole(input.lagnaSign, graha.id);
    if (own.role === "benefic" || own.role === "yogakaraka") support.push(`${GRAHA_NAME[graha.id]} occupies the house and is ${own.role}.`);
    if (own.role === "malefic") strain.push(`${GRAHA_NAME[graha.id]} occupies the house and is functionally malefic.`);
    if (sun && isCombust(graha.id, graha.lon, graha.retro, sun.lon)) strain.push(`${GRAHA_NAME[graha.id]} is combust.`);
  }
  for (const line of aspects) {
    if (line.startsWith("Jupiter") || line.startsWith("Venus")) support.push(line);
    if (line.startsWith("Saturn") || line.startsWith("Mars") || line.startsWith("Rahu") || line.startsWith("Ketu")) strain.push(line);
  }
  if (typeof input.sav === "number") {
    if (input.sav >= 28) support.push(`Sarvashtakavarga here is ${input.sav}.`);
    if (input.sav <= 25) strain.push(`Sarvashtakavarga here is ${input.sav}.`);
  }

  const transitHere = input.transit.filter((graha) => signIndex(graha.lon) === sign);

  const rules: PredictionRule[] = [
    rule("lord-function", `House lord is ${role.role}`, role.role !== "neutral", `Rules houses ${role.houses.join(", ") || "—"}.`),
    rule("lord-placed", lord ? `${GRAHA_NAME[lordId]} is in house ${lordHouse}` : "Lord placement is missing", Boolean(lord), lord ? place(lord, input.lagnaSign) : "The natal chart has no longitude for this lord."),
    rule("occupants", occupants.length ? occupants.map((graha) => GRAHA_NAME[graha.id]).join(", ") + " occupy the house" : "The house is empty", occupants.length > 0, occupants.length ? "Read from the occupants and the lord." : "An empty house is read from its lord."),
    rule("drishti", aspects.length ? aspects.join("; ") : "No special natal drishti", aspects.length > 0, "Whole-sign drishti from the natal positions."),
    rule("dasha", dasha ? `${GRAHA_NAME[dasha.mahadasha.lord]} mahadasha, ${GRAHA_NAME[dasha.antardasha.lord]} antardasha` : "Dasha has not started", Boolean(dasha), dasha ? "Counted from the natal Moon with Vimshottari." : "The selected time is before birth."),
    rule("gochar", transitHere.length ? transitHere.map((graha) => GRAHA_NAME[graha.id]).join(", ") + " transit this sign" : "No graha is transiting this sign", true, "Transit longitudes are the current sky, not the birth time."),
  ];

  const career = house === 10 ? careerReading({ natal: input.natal, lagnaSign: input.lagnaSign, lagnaLon: input.lagnaLon, birth: input.birth, moonLon: input.moonLon, when: input.when, transit: input.transit, nodes, sav: input.sav }) : null;
  const matter = HOUSE_TITLE[house - 1]?.split("—")[1]?.trim() ?? "this part of life";
  const spoken = speakHouse({
    house,
    matter,
    signName: RASHIS[sign]?.name ?? "this sign",
    lordId,
    lord,
    lordHouse,
    role: role.role,
    occupants,
    natalAspects: aspects,
    natal: input.natal,
    support: career ? career.support : support,
    strain: career ? career.strain : strain,
    dasha,
    lagnaSign: input.lagnaSign,
    moonSign: signIndex(input.moonLon),
    when: input.when,
    transit: input.transit,
    nodes,
    houseSign: sign,
    career,
    sav: input.sav,
  });

  return {
    title: HOUSE_TITLE[house - 1] ?? `House ${house}`,
    house,
    support: career ? career.support : support,
    strain: career ? career.strain : strain,
    rules: career ? [...rules, ...career.rules] : rules,
    disclaimer: DISCLAIMER,
    sections: spoken,
  };
}

function rule(id: string, text: string, included: boolean, why: string): PredictionRule {
  return { id, text, included, why };
}

function place(graha: GrahaPosition, lagnaSign: number): string {
  const sign = signIndex(graha.lon);
  const dignity = dignityOf(graha.id, graha.lon);
  return `${GRAHA_NAME[graha.id]} is in ${RASHIS[sign]?.name} ${Math.floor(degInSign(graha.lon))}°, house ${houseFrom(sign, lagnaSign)}${graha.retro ? ", retrograde" : ""}${dignity ? `, ${dignity}` : ""}`;
}

function aspectLines(grahas: GrahaPosition[], targetSign: number, nodes: NodeDrishti): string[] {
  const lines: string[] = [];
  for (const graha of grahas) {
    const from = signIndex(graha.lon);
    for (const offset of drishtiOffsets(graha.id, nodes)) {
      if ((from + offset) % 12 === targetSign) lines.push(`${GRAHA_NAME[graha.id]} by ${drishtiLabel(offset)} aspect`);
    }
  }
  return lines;
}

function speakHouse(input: {
  house: number;
  matter: string;
  signName: string;
  lordId: GrahaId;
  lord: GrahaPosition | undefined;
  lordHouse: number | null;
  role: string;
  occupants: GrahaPosition[];
  natalAspects: string[];
  natal: GrahaPosition[];
  support: string[];
  strain: string[];
  dasha: ReturnType<typeof vimshottari>;
  lagnaSign: number;
  moonSign: number;
  when: Date;
  transit: GrahaPosition[];
  nodes: NodeDrishti;
  houseSign: number;
  career: ReturnType<typeof careerReading> | null;
  sav?: number | null;
}): PredictionSection[] {
  const lordName = GRAHA_NAME[input.lordId];
  const lean = input.support.length && input.strain.length ? "mixed" : input.support.length ? "helpful" : input.strain.length ? "careful" : "quiet";
  const career = input.career?.facts ?? null;
  const sky = readSky(input);
  const lordSentence = input.lord
    ? `${lordName}, lord of this house, is in ${RASHIS[signIndex(input.lord.lon)]?.name} in the ${ordinal(input.lordHouse ?? 1)} house${dignityClause(input.lord)}.`
    : `${lordName} rules this house, but its position is not in the chart.`;
  const occupantSentence = input.occupants.length
    ? `${list(input.occupants.map((graha) => named(graha)))} ${input.occupants.length === 1 ? "sits" : "sit"} in this house and colours it directly.`
    : "No planet sits in the house itself, so it is read through its lord.";
  const aspectSentence = input.natalAspects.length
    ? `${input.natalAspects.map((line) => line.replace(" by ", " looks at it by a ").replace(" aspect", "")).join(", ")}.`
    : "";
  const seeds = (SIGNIFICATOR[input.house - 1] ?? []).map((id) => GRAHA_NAME[id]);
  const libra = career?.libra ? soften(career.libra) : "";
  const directions = career?.directions.slice(0, 3) ?? [];

  const overall = [
    `${input.signName} governs ${input.matter} in this chart.`,
    lordSentence,
    lean === "mixed"
      ? "The birth chart gives this area both a helping hand and a real difficulty."
      : lean === "helpful"
        ? "The birth chart is more helpful than difficult here."
        : lean === "careful"
          ? "The birth chart asks for patience here."
          : "The birth chart does not push this area strongly either way.",
    directions.length ? `The fields that suit this chart are ${directions.join("; ")}.` : "",
  ].filter(Boolean).join(" ");

  const detailed = [
    occupantSentence,
    aspectSentence,
    career?.style ? cap(career.style) : "",
    input.lord ? `For this ascendant, its lord ${roleClause(input.role)}.` : "",
    career?.navamsa ?? "",
    career?.dashamsha ?? "",
    libra,
    seeds.length ? `By nature, ${list(seeds)} also ${seeds.length === 1 ? "speaks" : "speak"} for this part of life.` : "",
    input.sav != null && input.sav >= 28 ? `This sign carries a high strength count (${input.sav}), which agrees with a fuller result but does not decide it.` : "",
    input.sav != null && input.sav <= 25 ? `This sign's strength count is low (${input.sav}), so results take more effort.` : "",
  ].filter(Boolean).join(" ");

  const positive = input.support.length
    ? input.support.map(humanize).join(" ")
    : "No extra helping factor stands out. The result then depends on effort and on the period that is running.";
  const challenges = input.strain.length
    ? input.strain.map(humanize).join(" ")
    : "No strong affliction stands on this house. Ordinary difficulty can still appear.";

  const practical = [
    LIFE[input.house - 1] ?? "",
    career?.employment ?? "",
    career && career.labels.length
      ? `If the current period brings a career event, it is more likely to look like ${list(career.labels)}. These are different outcomes, not one prediction, and none of them is a fixed date.`
      : "",
  ].filter(Boolean).join(" ");

  const timing = timingOf(input, sky, career);
  const conclusion = [
    lean === "mixed"
      ? "Taken together, this is a mixed area: use the helpful placements, and do not ignore the strain."
      : lean === "helpful"
        ? "Taken together, the birth chart supports this area, without turning that support into a promise."
        : lean === "careful"
          ? "Taken together, treat this area with care. A helpful period can still improve it, and a difficult one can make it heavier."
          : "Taken together, this area stays moderate until a running period or a relevant transit wakes it.",
    sky.lead ? `${sky.lead} is the transit most involved just now. It can time a result. It cannot create a result the birth chart does not hold.` : "No major transit is sitting on this house or its lord just now.",
    input.dasha ? `The nearer period is ${GRAHA_NAME[input.dasha.antardasha.lord]}, until ${pretty(input.dasha.antardasha.end)}.` : "",
  ].filter(Boolean).join(" ");

  const sections: PredictionSection[] = [
    { title: "Overall prediction", body: overall },
    { title: "Detailed interpretation", body: detailed },
    { title: "Positive indications", body: positive },
    { title: "Challenges and possible obstacles", body: challenges },
    { title: "Practical life outcomes", body: practical },
    { title: "Relevant timing and upcoming periods", body: timing },
    { title: "Final conclusion", body: conclusion },
  ];
  if (career) {
    const cites = ["Phaladeepika, on livelihood and the tenth house", ...career.citations];
    sections.push({ title: "References", body: unique(cites).join(". ") + "." });
  }
  return sections;
}

const LIFE = [
  "In ordinary life this shows in health, confidence and the impression you make.",
  "In ordinary life this shows in savings, family and the way you speak about money.",
  "In ordinary life this shows in courage, skills, siblings and short journeys.",
  "In ordinary life this shows in home, mother, property and peace of mind.",
  "In ordinary life this shows in study, children, creativity and advice you give.",
  "In ordinary life this shows in work routine, debts, competition and health complaints.",
  "In ordinary life this shows in marriage, partners and contracts.",
  "In ordinary life this shows in shared money, sudden changes, research and what is kept private.",
  "In ordinary life this shows in teachers, father, belief and long travel.",
  "In ordinary life this shows in work, reputation and the role other people see.",
  "In ordinary life this shows in income, friends and the goals that actually complete.",
  "In ordinary life this shows in expenses, sleep, foreign stays and endings.",
];

function timingOf(
  input: {
    houseSign: number;
    natal: GrahaPosition[];
    dasha: ReturnType<typeof vimshottari>;
    nodes: NodeDrishti;
    when: Date;
    transit: GrahaPosition[];
  },
  sky: SkyRead,
  career: ReturnType<typeof careerReading>["facts"] | null,
): string {
  if (!input.dasha && sky.missing.length === GRAHA_IDS.length) {
    return "This moment is before a usable chart period, and today's planetary positions were not available. No date is invented.";
  }
  const period = input.dasha
    ? `${GRAHA_NAME[input.dasha.mahadasha.lord]} runs until ${pretty(input.dasha.mahadasha.end)}. Inside it, ${GRAHA_NAME[input.dasha.antardasha.lord]} runs until ${pretty(input.dasha.antardasha.end)}. ${link(input.dasha.mahadasha.lord, input)} ${link(input.dasha.antardasha.lord, input)}`
    : "This moment is before birth, so no period is running.";
  const later = career?.upcoming && /\d{4}/.test(career.upcoming) && !career.upcoming.startsWith("No later") && !career.upcoming.startsWith("Upcoming")
    ? career.upcoming
    : "";
  return [period, sky.text, later, "A transit can open or close a window. It never guarantees the event by itself."].filter(Boolean).join(" ");
}

type SkyHit = {
  id: GrahaId;
  weight: number;
  sentence: string;
  upcoming: string;
};

type SkyRead = { text: string; lead: string; missing: GrahaId[] };

function readSky(input: {
  transit: GrahaPosition[];
  houseSign: number;
  lord: GrahaPosition | undefined;
  lordId: GrahaId;
  natal: GrahaPosition[];
  dasha: ReturnType<typeof vimshottari>;
  lagnaSign: number;
  moonSign: number;
  nodes: NodeDrishti;
  when: Date;
}): SkyRead {
  const missing = GRAHA_IDS.filter((id) => !input.transit.some((graha) => graha.id === id));
  if (input.transit.length === 0) {
    return {
      missing: [...GRAHA_IDS],
      lead: "",
      text: "Today's planetary positions were not available, so no transit is described and none is invented. The birth chart and any running period still stand.",
    };
  }
  const lordSign = input.lord ? signIndex(input.lord.lon) : null;
  const periodLords = input.dasha ? [input.dasha.mahadasha.lord, input.dasha.antardasha.lord] : [];
  const hits: SkyHit[] = [];
  for (const graha of input.transit) {
    const sign = signIndex(graha.lon);
    let weight = 0;
    const reasons: string[] = [];
    if (sign === input.houseSign) {
      weight += 5;
      reasons.push("passing through this house");
    }
    if (sign !== input.houseSign && aspectLines([graha], input.houseSign, input.nodes).length) {
      weight += 4;
      reasons.push("looking at this house");
    }
    if (lordSign !== null && sign === lordSign && graha.id !== input.lordId) {
      weight += 4;
      reasons.push("in the same sign as the house lord");
    } else if (lordSign !== null && sign !== lordSign && aspectLines([graha], lordSign, input.nodes).length) {
      weight += 3;
      reasons.push("looking at the house lord");
    }
    for (const id of periodLords) {
      const natal = input.natal.find((item) => item.id === id);
      if (natal && sign === signIndex(natal.lon) && graha.id !== id) {
        weight += 3;
        reasons.push(`sharing a sign with natal ${GRAHA_NAME[id]}`);
      }
    }
    if (weight === 0) continue;
    if (SLOW.has(graha.id)) weight += 1;
    const motion = Math.abs(graha.speed) < 0.02 ? ", nearly stationary," : graha.retro ? ", moving retrograde," : "";
    const fromMoon = houseFrom(sign, input.moonSign);
    const fromLagna = houseFrom(sign, input.lagnaSign);
    const moonClause = fromMoon === fromLagna ? "" : ` and the ${ordinal(fromMoon)} from the Moon`;
    const tone = SUPPORT.has(graha.id)
      ? "This is a helpful influence while it lasts, not a permanent promise."
      : PRESSURE.has(graha.id)
        ? "This adds pressure while it lasts. It does not rewrite the birth chart."
        : graha.id === "moon"
          ? "The Moon colours a few days, not the year."
          : "This is a passing influence.";
    const edge = signEdge(graha, input.houseSign, input.when);
    hits.push({
      id: graha.id,
      weight,
      sentence: `${GRAHA_NAME[graha.id]}${motion} is in ${RASHIS[sign]?.name}, the ${ordinal(fromLagna)} house from the ascendant${moonClause}, ${unique(reasons).join(" and ")}. ${tone}`,
      upcoming: edge,
    });
  }
  hits.sort((a, b) => b.weight - a.weight);
  const told = hits.filter((hit) => hit.weight >= 4);
  const chosen = told.length ? told.slice(0, 4) : hits.slice(0, 2);
  const gap = missing.length ? `${missing.map((id) => GRAHA_NAME[id]).join(" and ")} ${missing.length === 1 ? "is" : "are"} not in the current sky, so ${missing.length === 1 ? "that position is" : "those positions are"} left out.` : "";
  const body = chosen.length
    ? chosen.map((hit) => [hit.sentence, hit.upcoming].filter(Boolean).join(" ")).join(" ")
    : "None of the nine planets is currently activating this house, its lord, or the planets of the running period.";
  return { missing, lead: chosen[0] ? GRAHA_NAME[chosen[0].id] : "", text: [body, gap].filter(Boolean).join(" ") };
}

function link(lord: GrahaId, input: { houseSign: number; natal: GrahaPosition[]; nodes: NodeDrishti }): string {
  const graha = input.natal.find((item) => item.id === lord);
  const name = GRAHA_NAME[lord];
  if (SIGN_LORD[input.houseSign] === lord) return `${name} rules this house, so the period speaks to it directly.`;
  if (graha && signIndex(graha.lon) === input.houseSign) return `${name} sits in this house in the birth chart, so the period wakes it.`;
  if (graha && aspectLines([graha], input.houseSign, input.nodes).length) return `${name} looks at this house, so the period can reach it.`;
  return `${name} does not rule or occupy this house, so its period is indirect.`;
}

function signEdge(graha: GrahaPosition, houseSign: number, when: Date): string {
  if (Math.abs(graha.speed) < 0.02) return "";
  const sign = signIndex(graha.lon);
  const next = graha.speed > 0 ? (sign + 1) % 12 : (sign + 11) % 12;
  const deg = degInSign(graha.lon);
  const days = graha.speed > 0 ? (30 - deg) / graha.speed : deg / Math.abs(graha.speed);
  if (!Number.isFinite(days) || days <= 0 || days > 180) return "";
  const enters = next === houseSign;
  const leaves = sign === houseSign;
  if (!enters && !leaves && !(SLOW.has(graha.id) && days <= 120)) return "";
  const whenText = pretty(new Date(when.getTime() + days * 86_400_000));
  const target = RASHIS[next]?.name ?? "the next sign";
  if (enters) return `Around ${whenText}, ${GRAHA_NAME[graha.id]} enters this house.`;
  if (leaves) return `Around ${whenText}, ${GRAHA_NAME[graha.id]} leaves this house for ${target}.`;
  return `Around ${whenText}, ${GRAHA_NAME[graha.id]} changes sign into ${target}.`;
}

function plainDignity(dignity: string | null): string {
  if (dignity === "moolatrikona") return "strong in its own sign";
  if (dignity === "deep exaltation") return "at its strongest degree";
  if (dignity === "exalted") return "strong by sign";
  if (dignity === "deep debilitation") return "at its weakest degree";
  if (dignity === "debilitated") return "weak by sign";
  if (dignity === "own sign") return "in its own sign";
  return dignity ?? "";
}

function named(graha: GrahaPosition): string {
  const dignity = plainDignity(dignityOf(graha.id, graha.lon));
  const state = [graha.retro ? "retrograde" : "", dignity].filter(Boolean).join(", ");
  return `${GRAHA_NAME[graha.id]}${state ? ` (${state})` : ""}`;
}

function dignityClause(graha: GrahaPosition): string {
  const bits = [plainDignity(dignityOf(graha.id, graha.lon)), graha.retro ? "retrograde" : ""].filter(Boolean);
  return bits.length ? `, ${bits.join(" and ")}` : "";
}

function roleClause(role: string): string {
  if (role === "yogakaraka") return "helps both stability and growth";
  if (role === "benefic") return "tends to help";
  if (role === "malefic") return "brings pressure as well as effort";
  if (role === "mixed") return "helps in one way and complicates another";
  return "is neither a clear help nor a clear burden";
}

function humanize(line: string): string {
  return line
    .replace(/functionally malefic/g, "a source of pressure")
    .replace(/yogakaraka/g, "helpful for both growth and stability")
    .replace(/Sarvashtakavarga here is (\d+)\./g, "The sign's strength count is $1.")
    .replace(/The house lord is helpful for both growth and stability for this lagna\./g, "The lord of this house helps both growth and stability.")
    .replace(/The house lord is benefic for this lagna\./g, "The lord of this house tends to help.")
    .replace(/The house lord is a source of pressure for this lagna\./g, "The lord of this house brings pressure as well as effort.")
    .replace(/The 10th lord/g, "The lord of career")
    .replace(/is moolatrikona/g, "is strong in the preferred degrees of its own sign")
    .replace(/is deep exaltation/g, "is at its strongest degree")
    .replace(/is deep debilitation/g, "is at its weakest degree")
    .replace(/is exalted/g, "is strong by sign")
    .replace(/is own sign/g, "is in its own sign")
    .replace(/is debilitated/g, "is weak by sign")
    .replace(/a classical caution for the house it rules/g, "a place that asks for care");
}

function soften(text: string): string {
  return text
    .replace(/The chapter links /g, "")
    .replace(/the chapter links /g, "")
    .replace(/the chapter mentions /g, "")
    .replace(/the chapter describes /g, "")
    .replace(/the chapter gives /g, "")
    .replace(/the chapter is /g, "")
    .replace(/The chapter's direct entry is cautionary, mentioning /g, "")
    .replace(/the book's entry still mentions /g, "still carries ")
    .replace(/\s+/g, " ")
    .trim();
}

function cap(text: string): string {
  const trimmed = text.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() + trimmed.slice(1) : "";
}

function ordinal(house: number): string {
  return ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"][house - 1] ?? String(house);
}

function list(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function unique(items: string[]): string[] {
  return [...new Set(items)];
}

function pretty(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

const SLOW = new Set<GrahaId>(["saturn", "jupiter", "rahu", "ketu"]);
const SUPPORT = new Set<GrahaId>(["jupiter", "venus"]);
const PRESSURE = new Set<GrahaId>(["saturn", "mars", "rahu", "ketu", "sun"]);
