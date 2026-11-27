import type { GrahaId } from "../constants";
import { GRAHA_NAME, RASHIS, SIGN_LORD } from "../constants";
import type { GrahaPosition } from "../calc";
import { dashamshaSign, degInSign, houseFrom, navamsaSign, signIndex, subdashas, vimshottari } from "../calc";
import { drishtiLabel, drishtiOffsets, type NodeDrishti } from "../drishti";
import { dignityOf, functionalRole, isCombust } from "../reading";
import { careerRule, libraMoonHouseRuleId, libraTenthOccupantRuleId, navamsaRuleId, occupantRuleId, type CareerRule } from "./rules";

export type CareerFacts = {
  strength: "strong" | "mixed" | "weak";
  directions: string[];
  employment: string;
  labels: string[];
  style: string;
  navamsa: string;
  dashamsha: string;
  libra: string;
  upcoming: string;
  citations: string[];
};

export type CareerBundle = {
  sections: { title: string; body: string }[];
  rules: { id: string; text: string; included: boolean; why: string }[];
  support: string[];
  strain: string[];
  facts: CareerFacts;
};

const FAMILIES: { id: string; label: string; planets: GrahaId[] }[] = [
  { id: "government", label: "Government and administrative work", planets: ["sun", "saturn", "jupiter"] },
  { id: "private", label: "Private employment", planets: ["saturn", "mercury"] },
  { id: "business", label: "Business and entrepreneurship", planets: ["mercury", "venus", "mars"] },
  { id: "management", label: "Management and leadership", planets: ["sun", "mars", "jupiter"] },
  { id: "education", label: "Education and research", planets: ["jupiter", "mercury"] },
  { id: "finance", label: "Finance, accounting and banking", planets: ["mercury", "jupiter"] },
  { id: "engineering", label: "Engineering and technical work", planets: ["mars", "saturn"] },
  { id: "health", label: "Healthcare and medicine", planets: ["sun", "mars", "jupiter"] },
  { id: "media", label: "Communication, writing and media", planets: ["mercury", "venus"] },
  { id: "technology", label: "Technology and software", planets: ["mercury", "rahu"] },
  { id: "consulting", label: "Consulting and advisory work", planets: ["jupiter", "mercury"] },
  { id: "operations", label: "Manufacturing and operations", planets: ["saturn", "mars"] },
  { id: "land", label: "Agriculture and property-related work", planets: ["saturn", "moon", "mars"] },
  { id: "foreign", label: "Foreign employment and remote work", planets: ["rahu", "moon", "saturn"] },
  { id: "confidential", label: "Research, investigation and confidential work", planets: ["rahu", "saturn", "mars"] },
];

const METHOD_RULES = new Set([
  "pd-v-1",
  "pd-xv",
  "pd-v-9",
  "bphs-21",
  "bphs-d10",
  "bs-timing",
  "gochar-timing",
  "pd-xxvi",
  "bs-libra-frame",
  "bs-libra-moon-houses",
  "gochar-libra-not-fixed",
]);

const BENEFIC: GrahaId[] = ["jupiter", "venus", "mercury", "moon"];

export function careerReading(input: {
  natal: GrahaPosition[];
  lagnaSign: number;
  lagnaLon?: number | null;
  birth: Date;
  moonLon: number;
  when: Date;
  transit: GrahaPosition[];
  nodes?: NodeDrishti;
  sav?: number | null;
}): CareerBundle {
  const nodes = input.nodes ?? "seventh";
  const lagna = ((input.lagnaSign % 12) + 12) % 12;
  const tenthSign = (lagna + 9) % 12;
  const lordId = SIGN_LORD[tenthSign]!;
  const lord = input.natal.find((graha) => graha.id === lordId);
  const sun = input.natal.find((graha) => graha.id === "sun");
  const moon = input.natal.find((graha) => graha.id === "moon");
  const occupants = input.natal.filter((graha) => signIndex(graha.lon) === tenthSign);
  const lordHouse = lord ? houseFrom(signIndex(lord.lon), lagna) : null;
  const lordDignity = lord ? dignityOf(lord.id, lord.lon) : null;
  const lordNavamsa = lord ? navamsaSign(lord.lon) : null;
  const navamsaLord = lordNavamsa === null ? null : SIGN_LORD[lordNavamsa]!;
  const aspects = aspecting(input.natal.filter((graha) => signIndex(graha.lon) !== tenthSign), tenthSign, nodes);
  const lordAspects = lord ? aspecting(input.natal.filter((graha) => graha.id !== lord.id), signIndex(lord.lon), nodes) : [];
  const dasha = vimshottari(input.birth, input.moonLon, input.when);
  const libra = lagna === 6;
  const matched: CareerRule[] = [];
  const take = (id: string | undefined) => {
    const rule = id ? careerRule(id) : undefined;
    if (rule && !matched.some((item) => item.id === rule.id)) matched.push(rule);
  };
  take("pd-v-1");
  take("pd-xv");
  take("bphs-21");
  take("bphs-d10");
  take("bs-timing");
  take("gochar-timing");
  take("pd-xxvi");
  if (navamsaLord) take(navamsaRuleId(navamsaLord));
  take("pd-v-9");
  for (const graha of occupants) take(occupantRuleId(graha.id));
  if (libra) {
    take("bs-libra-frame");
    take("bs-libra-moon-houses");
    take("gochar-libra-not-fixed");
  }

  const support: string[] = [];
  const strain: string[] = [];
  let score = 0;
  if (lordDignity === "exalted" || lordDignity === "deep exaltation" || lordDignity === "own sign" || lordDignity === "moolatrikona") {
    score += 2;
    support.push(`The 10th lord is ${lordDignity}.`);
  }
  if (lordDignity === "debilitated" || lordDignity === "deep debilitation") {
    score -= 2;
    strain.push(`The 10th lord is ${lordDignity}.`);
  }
  if (lordHouse !== null && [1, 4, 5, 7, 9, 10].includes(lordHouse)) {
    score += 1;
    support.push(`The 10th lord occupies house ${lordHouse}.`);
  }
  if (lordHouse !== null && [6, 8, 12].includes(lordHouse)) {
    score -= 1;
    strain.push(`The 10th lord occupies house ${lordHouse}, a classical caution for the house it rules.`);
  }
  if (lord && sun && isCombust(lord.id, lord.lon, lord.retro, sun.lon)) {
    score -= 1;
    strain.push("The 10th lord is combust.");
  }
  for (const line of aspects) {
    if (BENEFIC.includes(line.id)) {
      score += 1;
      support.push(`${GRAHA_NAME[line.id]} aspects the 10th by ${line.label}.`);
    } else {
      score -= 1;
      strain.push(`${GRAHA_NAME[line.id]} aspects the 10th by ${line.label}.`);
    }
  }
  const strength = score >= 2 ? "strong" : score <= -1 ? "weak" : "mixed";

  const exaltedMoonMars = libra && moon && signIndex(moon.lon) === 1 && houseFrom(1, lagna) === 8 && input.natal.some((graha) => graha.id === "mars" && signIndex(graha.lon) === 1);
  if (exaltedMoonMars) {
    take("bs-libra-moon-8");
    take("bs-libra-mars-8");
    strain.push("For this Libra chart the exalted Moon sits with Mars in the 8th. Wealth and occupation stay uncertain even though the Moon is strong by sign. That is not a fixed job loss, and it is not the result of every Libra chart.");
  }

  const families = rankFamilies(navamsaLord, occupants.map((graha) => graha.id), lordId);
  const directions = families.slice(0, 4);
  const houseLords = relatedLords(lagna);
  const active = dasha ? [dasha.mahadasha.lord, dasha.antardasha.lord] : [];
  const labels = eventLabels(active, houseLords);
  const d10 = divisionalTenth(input.lagnaLon, input.natal, lagna);
  const paksha = sun && moon ? (normDiff(moon.lon, sun.lon) < 180 ? "waxing" : "waning") : null;
  const tenthFromMoon = moon ? (signIndex(moon.lon) + 9) % 12 : null;
  if (active.includes(lordId) && strength === "strong") take("pd-xx-11");
  if (active.includes(lordId) && strength === "weak") take("pd-xx-19");
  if (libra && moon) take(libraMoonHouseRuleId(houseFrom(signIndex(moon.lon), lagna)));
  if (libra) for (const graha of occupants) take(libraTenthOccupantRuleId(graha.id));
  if (active.includes(houseLords[6]!) && dignifiedAndClear(input.natal, houseLords[6]!, lagna, sun)) take("pd-xx-7");
  if (active.includes(houseLords[11]!) && dignifiedAndClear(input.natal, houseLords[11]!, lagna, sun)) take("pd-xx-12");
  const amalaLagna = occupants.filter((graha) => amalaBenefic(graha.id, paksha === "waxing"));
  const amalaMoon = tenthFromMoon === null ? [] : input.natal.filter((graha) => signIndex(graha.lon) === tenthFromMoon && amalaBenefic(graha.id, paksha === "waxing"));
  const sameAmalaHouse = tenthFromMoon === tenthSign;
  if (amalaLagna.length || (!sameAmalaHouse && amalaMoon.length)) take("pd-amala");
  const lordFirm = Boolean(lord && dignifiedAndClear(input.natal, lord.id, lagna, sun) && lordHouse !== null && [1, 4, 5, 7, 9, 10].includes(lordHouse));
  const lagnaLord = SIGN_LORD[lagna]!;
  const lagnaLordInTenth = occupants.some((graha) => graha.id === lagnaLord);
  if ((amalaLagna.length > 0 && lordFirm) || lagnaLordInTenth) take("pd-xvi-27");
  const sunOrMarsInTenth = occupants.some((graha) => graha.id === "sun" || graha.id === "mars");
  if (sunOrMarsInTenth && (strength === "strong" || lordFirm)) take("pd-xvi-28");

  const overview = [
    `${RASHIS[lagna]?.name} lagna. The 10th house is ${RASHIS[tenthSign]?.name}, ruled by ${GRAHA_NAME[lordId]}.`,
    lord ? place(lord, lagna) + "." : "The 10th lord has no longitude, so placement is missing.",
    occupants.length ? `In the 10th: ${occupants.map((graha) => GRAHA_NAME[graha.id]).join(", ")}.` : "No planet occupies the 10th.",
    `The 10th lord's Navamsa is ${lordNavamsa === null ? "unknown" : RASHIS[lordNavamsa]?.name}, so the livelihood indicator is ${navamsaLord ? GRAHA_NAME[navamsaLord] : "not calculated"}. This is not the Dashamsha 10th lord.`,
    libra ? "Libra rules are used only because this lagna is Libra. They are not applied to other lagnas." : "Libra-only Bhrigu rules are not used, because this lagna is not Libra.",
    tenthFromMoon === null
      ? "The Moon longitude is missing, so the 10th from the Moon is not calculated."
      : `The 10th from the Moon is ${RASHIS[tenthFromMoon]?.name}. Phaladeepika V.1 compares Lagna and Moon before choosing a livelihood reference. This reading does not guess which is stronger. The Lagna 10th stays the main house.`,
  ].join(" ");

  const style = [
    lord ? `${GRAHA_NAME[lordId]} as 10th lord describes the working style: ${styleOf(lordId)}` : "",
    paksha && lordId === "moon" ? `The Moon is ${paksha}, so its public and changing quality is read with that phase, not as a full paksha-bala score.` : "",
    occupants.length ? `Occupants add ${occupants.map((graha) => styleOf(graha.id)).join(" ")}` : "With an empty 10th, the style is read from the lord rather than from an occupant.",
  ].filter(Boolean).join(" ");

  const employmentStory = employmentBody(houseLords, lordHouse, occupants, lagna, input.natal);
  const employment = `${employmentStory} Related lords: ${relatedLine(houseLords, input.natal, lagna)}.`;
  const challenges = strain.length ? strain.join(" ") : "No calculated affliction of the 10th or its lord stood out. That does not mean the career is free of ordinary difficulty.";
  const promotion = promotionBody(houseLords, strength, active);
  const change = changeBody(labels, dasha, active, houseLords);
  const dashaBody = dasha
    ? `${GRAHA_NAME[dasha.mahadasha.lord]} mahadasha runs until ${stamp(dasha.mahadasha.end)}. ${GRAHA_NAME[dasha.antardasha.lord]} antardasha runs ${stamp(dasha.antardasha.start)} to ${stamp(dasha.antardasha.end)}. ${periodEffect(dasha.mahadasha.lord, houseLords, strength)} ${periodEffect(dasha.antardasha.lord, houseLords, strength)}`
    : "The selected time is before birth, so no dasha is running and no career date is given.";
  const upcoming = upcomingBody(dasha, houseLords, input.when);
  const transitBody = transitBodyOf(input.transit, lagna, moon ? signIndex(moon.lon) : null, tenthSign, nodes, Boolean(dasha && labels.length));
  const references = matched.map((rule) => `${rule.book} ${rule.ref} (${rule.kind}): ${rule.text}`).join(" ");
  const amalaText = amalaTextOf(amalaLagna, amalaMoon, sameAmalaHouse);
  const statusText = statusTextOf(amalaLagna.length > 0, lordFirm, lagnaLordInTenth, sunOrMarsInTenth, strength);
  const libraText = matched
    .filter((rule) => rule.id.startsWith("bs-libra-10-") || /^bs-libra-moon-h\d+$/.test(rule.id) || rule.id === "bs-libra-moon-8" || rule.id === "bs-libra-mars-8")
    .map((rule) => rule.text)
    .join(" ");
  const nodeText = nodes === "seventh"
    ? "Rahu and Ketu use only the 7th aspect, which is the Bhrigu list followed here."
    : "Rahu and Ketu special aspects follow the selected chart setting. The Bhrigu list used for Libra does not give them a special aspect.";
  const savText = typeof input.sav === "number"
    ? `Sarvashtakavarga of this 10th sign is ${input.sav}. It is an extra check, not a substitute for the lord.`
    : "No sarvashtakavarga score was supplied, so none is used.";

  const rules = matched.map((rule) => ({
    id: rule.id,
    text: `${rule.book} ${rule.ref}`,
    included: true,
    why: rule.scope === "libra" ? "Included because the lagna is Libra and the condition matched." : rule.text,
  }));
  rules.push({
    id: "d10-separate",
    text: d10.tenthLord ? `Dashamsha 10th lord is ${GRAHA_NAME[d10.tenthLord]}` : "Dashamsha 10th lord was not calculated",
    included: Boolean(d10.tenthLord),
    why: navamsaLord ? `Navamsa lord of the natal 10th lord is ${GRAHA_NAME[navamsaLord]}. These two lords are not interchangeable.` : "Navamsa lord is missing.",
  });

  const facts: CareerFacts = {
    strength,
    directions: directions.map((item) => item.label),
    employment: employmentStory,
    labels,
    style: [
      styleOf(lordId),
      paksha && lordId === "moon" ? `The Moon is ${paksha}, so its public quality shifts with that phase.` : "",
      occupants.length ? `Planets in the house add ${occupants.map((graha) => styleOf(graha.id)).join(" ")}` : "",
    ].filter(Boolean).join(" "),
    navamsa: navamsaLord && lordNavamsa !== null
      ? `${GRAHA_NAME[lordId]} is in the navamsa of ${RASHIS[lordNavamsa]?.name}, so the work also carries ${styleOf(navamsaLord)}`
      : "",
    dashamsha: d10.tenthLord ? `In the career division, the tenth is ruled by ${GRAHA_NAME[d10.tenthLord]}.` : "",
    libra: libraText,
    upcoming,
    citations: matched
      .filter((rule) => !METHOD_RULES.has(rule.id))
      .map((rule) => `${rule.book} ${rule.ref}`),
  };

  return {
    support,
    strain,
    rules,
    facts,
    sections: [
      { title: "Career overview", body: overview },
      { title: "Professional personality and working style", body: style },
      { title: "Most suitable career directions", body: directions.length ? directions.map((item, index) => `${index + 1}. ${item.label}: ${item.why}`).join(" ") : "The chart does not separate a narrow occupation. No job title is assigned." },
      { title: "Employment versus business potential", body: employment },
      { title: "Strength of the 10th house and its lord", body: `The 10th lord is judged ${strength} from dignity, house, combustion and aspects. ${support.concat(strain).join(" ") || "Neither a clear strength nor a clear weakness was calculated."} ${lordAspects.length ? `Aspects on the 10th lord: ${lordAspects.map((line) => `${GRAHA_NAME[line.id]} by ${line.label}`).join("; ")}.` : "No listed aspect falls on the 10th lord."} Karakas named in Phaladeepika XV.17, who are not the functional 10th lord: ${karakaLine(input.natal, lagna)}. ${savText} ${statusText}` },
      { title: "Planetary combinations and aspects", body: [occupants.length ? occupants.map((graha) => `${GRAHA_NAME[graha.id]} in the 10th is ${functionalRole(lagna, graha.id).role} for this lagna.`).join(" ") : "The 10th is empty.", aspects.length ? `Aspects on the 10th: ${aspects.map((line) => `${GRAHA_NAME[line.id]} by ${line.label}`).join("; ")}.` : "No special natal aspect falls on the 10th.", nodeText, amalaText, libraText, exaltedMoonMars ? "This chart, not every Libra chart, has exalted Moon with Mars in Taurus in the 8th. Read research, shared resources, contracts and occupational uncertainty together, and do not turn that into a fixed job loss." : ""].filter(Boolean).join(" ") },
      { title: "D9 and D10 confirmation", body: d10.body },
      { title: "Career challenges and obstacles", body: challenges },
      { title: "Promotion and salary-growth potential", body: promotion },
      { title: "Job-change possibilities", body: change },
      { title: "Current Mahadasha and Antardasha effects", body: dashaBody },
      { title: "Important upcoming career periods", body: upcoming },
      { title: "Transit-based timing", body: transitBody },
      { title: "Classical references supporting the conclusion", body: references || "No stored career rule matched this chart." },
    ],
  };
}

function rankFamilies(navamsaLord: GrahaId | null, occupants: GrahaId[], tenthLord: GrahaId) {
  return FAMILIES.map((family) => {
    let score = 0;
    const why: string[] = [];
    if (navamsaLord && family.planets.includes(navamsaLord)) {
      score += 3;
      why.push(`the Navamsa lord of the 10th lord is ${GRAHA_NAME[navamsaLord]}`);
    }
    for (const id of occupants) {
      if (family.planets.includes(id)) {
        score += 2;
        why.push(`${GRAHA_NAME[id]} occupies the 10th`);
      }
    }
    if (family.planets.includes(tenthLord)) {
      score += 1;
      why.push(`the 10th lord is ${GRAHA_NAME[tenthLord]}`);
    }
    return { ...family, score, why: why.join("; ") };
  })
    .filter((family) => family.score > 0)
    .sort((a, b) => b.score - a.score);
}

function relatedLords(lagna: number): Record<number, GrahaId> {
  const lords: Record<number, GrahaId> = {};
  for (let house = 1; house <= 12; house += 1) lords[house] = SIGN_LORD[(lagna + house - 1) % 12]!;
  return lords;
}

function eventLabels(active: GrahaId[], lords: Record<number, GrahaId>): string[] {
  const has = (house: number) => active.includes(lords[house]!);
  const labels: string[] = [];
  if (has(10) && has(11)) labels.push("promotion or income growth");
  if (has(10) && has(6)) labels.push("service pressure or an employer-related change");
  if (has(10) && has(4)) labels.push("transfer or a change of workplace");
  if (has(10) && has(7)) labels.push("business, clients or a partnership role");
  if (has(10) && has(12)) labels.push("foreign, remote or separating conditions");
  if (has(10) && has(8)) labels.push("interruption, restructuring or a non-linear change");
  if (has(10) && labels.length === 0) labels.push("career activation without a narrower event label");
  return labels;
}

function employmentBody(lords: Record<number, GrahaId>, lordHouse: number | null, occupants: GrahaPosition[], lagna: number, natal: GrahaPosition[]): string {
  const sixth = lords[6]!;
  const seventh = lords[7]!;
  const sixthGraha = natal.find((graha) => graha.id === sixth);
  const service = sixthGraha ? houseFrom(signIndex(sixthGraha.lon), lagna) : null;
  const business = lordHouse === 7 || occupants.some((graha) => graha.id === seventh);
  const serviceLean = service === 10 || service === 6 || service === 1;
  if (serviceLean && business) return `Both service and independent work are indicated. ${GRAHA_NAME[sixth]}, the 6th lord, connects with work conditions, and the 7th lord ${GRAHA_NAME[seventh]} also touches the career houses. Do not collapse this into one employer or one business.`;
  if (business) return `The 7th lord ${GRAHA_NAME[seventh]} is tied to the 10th, so clients, contracts or independent work are stronger than a pure service reading. Employment is not ruled out.`;
  if (serviceLean) return `${GRAHA_NAME[sixth]} as 6th lord is placed for duties and employment conditions. This leans toward service or an organisation more than toward a partnership business.`;
  return `Neither the 6th lord nor the 7th lord gives a one-sided employment or business verdict. The livelihood still follows the 10th lord and its Navamsa lord.`;
}

function promotionBody(lords: Record<number, GrahaId>, strength: string, active: GrahaId[]): string {
  const linked = active.includes(lords[10]!) && active.includes(lords[11]!);
  const income = `Income houses: 2nd lord ${GRAHA_NAME[lords[2]!]} and 11th lord ${GRAHA_NAME[lords[11]!]} .`;
  if (linked && strength !== "weak") return `The running period includes both the 10th lord and the 11th lord while the 10th lord is ${strength}. That is a stronger window for recognition or income than for a forced break. ${income} No salary figure is calculated.`;
  if (strength === "weak") return `The 10th lord is weak, so a gain period is less reliable even if the 11th lord is active. ${income}`;
  return `Promotion is not the default reading of the current period. It becomes more relevant when the 10th and 11th lords run together. ${income}`;
}

function changeBody(labels: string[], dasha: ReturnType<typeof vimshottari>, active: GrahaId[], lords: Record<number, GrahaId>): string {
  if (!dasha) return "No job-change date is given because no dasha is running.";
  if (!active.includes(lords[10]!) && labels.length === 0) return `The current ${GRAHA_NAME[dasha.mahadasha.lord]}/${GRAHA_NAME[dasha.antardasha.lord]} period does not rule or occupy the career combination used here, so a job change is not timed from this period alone.`;
  return `Within ${stamp(dasha.antardasha.start)} to ${stamp(dasha.antardasha.end)}, the supported labels are: ${labels.join("; ") || "career activity without a narrower event"}. These are windows, not a resignation date. Natal promise stays in force outside the window.`;
}

function periodEffect(lord: GrahaId, lords: Record<number, GrahaId>, strength: string): string {
  const houses = Object.entries(lords).filter(([, id]) => id === lord).map(([house]) => house);
  if (!houses.length) return "";
  const tenth = houses.includes("10");
  return `${GRAHA_NAME[lord]} rules house ${houses.join(" and ")}${tenth ? ` and is the 10th lord, judged ${strength}` : ""}.`;
}

function upcomingBody(dasha: ReturnType<typeof vimshottari>, lords: Record<number, GrahaId>, when: Date): string {
  if (!dasha) return "Upcoming periods are not listed before birth.";
  const next = subdashas(dasha.mahadasha)
    .filter((span) => span.start.getTime() > when.getTime())
    .map((span) => ({ span, labels: eventLabels([dasha.mahadasha.lord, span.lord], lords) }))
    .filter((item) => item.labels.length)
    .slice(0, 3);
  if (!next.length) return `No later antardasha in this mahadasha joins the 10th lord with a 6th, 11th, 4th, 7th, 8th or 12th lord. The mahadasha itself ends ${stamp(dasha.mahadasha.end)}.`;
  return next.map((item) => `${GRAHA_NAME[item.span.lord]} antardasha ${stamp(item.span.start)} to ${stamp(item.span.end)}: ${item.labels.join("; ")}.`).join(" ");
}

function transitBodyOf(transit: GrahaPosition[], lagna: number, moonSign: number | null, tenthSign: number, nodes: NodeDrishti, dashaAgrees: boolean): string {
  const slow = transit.filter((graha) => ["saturn", "jupiter", "rahu", "ketu"].includes(graha.id));
  const lines = slow.map((graha) => {
    const sign = signIndex(graha.lon);
    const fromLagna = houseFrom(sign, lagna);
    const fromMoon = moonSign === null ? null : houseFrom(sign, moonSign);
    return `${GRAHA_NAME[graha.id]} transits ${RASHIS[sign]?.name}, house ${fromLagna} from Lagna${fromMoon ? ` and house ${fromMoon} from the Moon` : ""}${sign === tenthSign ? ", which is the natal 10th" : ""}.`;
  });
  const trigger = dashaAgrees ? "The dasha already touches a career combination, so these transits can time it. They do not create a separate event." : "The current dasha does not by itself establish the career event, so these transits are noted and not turned into a prediction.";
  return `${lines.join(" ")} ${trigger} Transit from the Moon and transit through the Lagna 10th are kept separate, following Phaladeepika XXVI.`;
}

function divisionalTenth(lagnaLon: number | null | undefined, natal: GrahaPosition[], lagna: number): { tenthLord: GrahaId | null; body: string } {
  const lord = natal.find((graha) => graha.id === SIGN_LORD[(lagna + 9) % 12]!);
  const navamsa = lord ? `${GRAHA_NAME[lord.id]} Navamsa ${RASHIS[navamsaSign(lord.lon)]?.name}, whose lord is ${GRAHA_NAME[SIGN_LORD[navamsaSign(lord.lon)]!]}` : "10th-lord Navamsa is missing";
  const planetD10 = lord ? `${GRAHA_NAME[lord.id]} Dashamsha ${RASHIS[dashamshaSign(lord.lon)]?.name}` : "";
  if (lagnaLon == null || Number.isNaN(lagnaLon)) {
    return { tenthLord: null, body: `${navamsa}. ${planetD10}. The exact lagna degree was not supplied, so the Dashamsha ascendant and its 10th lord are not calculated.` };
  }
  const d9Lagna = navamsaSign(lagnaLon);
  const d10Lagna = dashamshaSign(lagnaLon);
  const d10Tenth = (d10Lagna + 9) % 12;
  const d10Lord = SIGN_LORD[d10Tenth]!;
  return {
    tenthLord: d10Lord,
    body: `${navamsa}. D9 lagna is ${RASHIS[d9Lagna]?.name}. D10 lagna is ${RASHIS[d10Lagna]?.name}; its 10th is ${RASHIS[d10Tenth]?.name}, ruled by ${GRAHA_NAME[d10Lord]}. ${planetD10}. The Dashamsha 10th lord is a professional confirmation and is not renamed as the Navamsa lord.`,
  };
}

function aspecting(grahas: GrahaPosition[], target: number, nodes: NodeDrishti): { id: GrahaId; label: string }[] {
  const lines: { id: GrahaId; label: string }[] = [];
  for (const graha of grahas) {
    const from = signIndex(graha.lon);
    for (const offset of drishtiOffsets(graha.id, nodes)) {
      if ((from + offset) % 12 === target) lines.push({ id: graha.id, label: drishtiLabel(offset) });
    }
  }
  return lines;
}

function relatedLine(lords: Record<number, GrahaId>, natal: GrahaPosition[], lagna: number): string {
  return [2, 6, 7, 9, 11, 12].map((house) => {
    const id = lords[house]!;
    const graha = natal.find((item) => item.id === id);
    return graha ? `${house}th lord ${GRAHA_NAME[id]} in house ${houseFrom(signIndex(graha.lon), lagna)}` : `${house}th lord ${GRAHA_NAME[id]} has no longitude`;
  }).join("; ");
}

function amalaBenefic(id: GrahaId, waxing: boolean): boolean {
  if (id === "jupiter" || id === "venus" || id === "mercury") return true;
  return id === "moon" && waxing;
}

function dignifiedAndClear(natal: GrahaPosition[], id: GrahaId, lagna: number, sun: GrahaPosition | undefined): boolean {
  const graha = natal.find((item) => item.id === id);
  if (!graha) return false;
  const dignity = dignityOf(id, graha.lon);
  const house = houseFrom(signIndex(graha.lon), lagna);
  if (dignity !== "exalted" && dignity !== "deep exaltation" && dignity !== "own sign" && dignity !== "moolatrikona") return false;
  if ([6, 8, 12].includes(house)) return false;
  if (sun && isCombust(id, graha.lon, graha.retro, sun.lon)) return false;
  return true;
}

function karakaLine(natal: GrahaPosition[], lagna: number): string {
  return (["jupiter", "sun", "mercury", "saturn"] as GrahaId[]).map((id) => {
    const graha = natal.find((item) => item.id === id);
    if (!graha) return `${GRAHA_NAME[id]} is missing`;
    const dignity = dignityOf(id, graha.lon);
    return `${GRAHA_NAME[id]} in house ${houseFrom(signIndex(graha.lon), lagna)}${dignity ? `, ${dignity}` : ""}`;
  }).join("; ");
}

function amalaTextOf(fromLagna: GrahaPosition[], fromMoon: GrahaPosition[], sameHouse: boolean): string {
  if (!fromLagna.length && !fromMoon.length) return "Amala Yoga is not formed. A waxing Moon, Mercury, Jupiter or Venus must occupy the 10th from Lagna or from the Moon. An aspect does not count.";
  const parts: string[] = [];
  if (fromLagna.length) parts.push(`from the Lagna by ${fromLagna.map((graha) => GRAHA_NAME[graha.id]).join(", ")}`);
  if (!sameHouse && fromMoon.length) parts.push(`from the Moon by ${fromMoon.map((graha) => GRAHA_NAME[graha.id]).join(", ")}`);
  if (sameHouse) parts.push("the 10th from the Moon is the same house, so it is not counted twice");
  return `Amala Yoga is present ${parts.join("; ")}.`;
}

function statusTextOf(beneficInTenth: boolean, lordFirm: boolean, lagnaLordInTenth: boolean, sunOrMars: boolean, strength: string): string {
  const yoga = beneficInTenth && lordFirm
    ? "Phaladeepika XVI.27 applies: a counted benefic occupies the 10th and the 10th lord is dignified outside the 6th, 8th and 12th, in a kendra or trikona."
    : lagnaLordInTenth
      ? "The lagna lord occupies the 10th, which Phaladeepika XVI.27 treats as a status factor. The fuller condition, a benefic in the 10th plus a dignified 10th lord, is not claimed unless both are present."
      : "Phaladeepika XVI.27 is not applied. It needs a benefic in the 10th with a dignified 10th lord in a kendra or trikona, or the lagna lord in the 10th.";
  const command = sunOrMars
    ? strength === "strong" || lordFirm
      ? "Sun or Mars in the 10th is read with a supportive 10th lord, so XVI.28 can apply."
      : "Sun or Mars occupies the 10th, but the 10th lord is not strong enough for XVI.28. Leadership is not declared from that occupancy."
    : "Sun and Mars do not occupy the 10th, so XVI.28 is not used.";
  return `${yoga} ${command}`;
}

function styleOf(id: GrahaId): string {
  const text: Record<GrahaId, string> = {
    sun: "visible responsibility, authority and a public standard of work.",
    moon: "changing public needs, care, trade or a responsive schedule.",
    mars: "decisive, technical or competitive execution.",
    mercury: "analysis, writing, trade, calculation or coordination.",
    jupiter: "advice, teaching, standards and institutional judgement.",
    venus: "clients, design, agreement and presentation.",
    saturn: "duty, delay, systems and long responsibility.",
    rahu: "unconventional reach, ambition and other people's networks.",
    ketu: "specialist, detached or non-linear work.",
  };
  return text[id];
}

function place(graha: GrahaPosition, lagna: number): string {
  const sign = signIndex(graha.lon);
  const dignity = dignityOf(graha.id, graha.lon);
  return `${GRAHA_NAME[graha.id]} is in ${RASHIS[sign]?.name} ${Math.floor(degInSign(graha.lon))}°, house ${houseFrom(sign, lagna)}${graha.retro ? ", retrograde" : ""}${dignity ? `, ${dignity}` : ""}`;
}

function stamp(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function normDiff(lon: number, from: number): number {
  return (lon - from + 360) % 360;
}
