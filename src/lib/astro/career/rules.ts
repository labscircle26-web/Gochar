import type { GrahaId } from "../constants";

export type CareerRule = {
  id: string;
  book: "Phaladeepika" | "Bhrigu Samhita" | "BPHS";
  ref: string;
  scope: "general" | "libra";
  kind: "textual" | "modern" | "synthesis";
  topic: string;
  text: string;
};

/** Concise structured rules. These are paraphrases with citations, not copied translations. */
export const CAREER_RULES: CareerRule[] = [
  { id: "pd-v-1", book: "Phaladeepika", ref: "V.1", scope: "general", kind: "textual", topic: "livelihood", text: "Judge livelihood from the stronger of Lagna and Moon, then from the Navamsa lord of the 10th lord." },
  { id: "pd-v-9", book: "Phaladeepika", ref: "V.9", scope: "general", kind: "textual", topic: "strength", text: "A strong Navamsa lord of the 10th lord supports a fuller livelihood; a weak one limits the ease or scale of the gain." },
  { id: "pd-v-sun", book: "Phaladeepika", ref: "V.2", scope: "general", kind: "textual", topic: "profession", text: "Sun as that Navamsa lord points to authority, government, metals, medicine or institutional work." },
  { id: "pd-v-moon", book: "Phaladeepika", ref: "V.3", scope: "general", kind: "textual", topic: "profession", text: "Moon as that Navamsa lord points to water, agriculture, trade, clothing, travel or public service." },
  { id: "pd-v-mars", book: "Phaladeepika", ref: "V.4", scope: "general", kind: "textual", topic: "profession", text: "Mars as that Navamsa lord points to metals, land, engineering, defence, surgery or daring technical work." },
  { id: "pd-v-mercury", book: "Phaladeepika", ref: "V.5", scope: "general", kind: "textual", topic: "profession", text: "Mercury as that Navamsa lord points to writing, calculation, trade, learning, astrology or advisory work." },
  { id: "pd-v-jupiter", book: "Phaladeepika", ref: "V.6", scope: "general", kind: "textual", topic: "profession", text: "Jupiter as that Navamsa lord points to teaching, counsel, sacred learning, law or lending." },
  { id: "pd-v-venus", book: "Phaladeepika", ref: "V.7", scope: "general", kind: "textual", topic: "profession", text: "Venus as that Navamsa lord points to arts, ornaments, cloth, scents, performance or client-facing luxury work." },
  { id: "pd-v-saturn", book: "Phaladeepika", ref: "V.8", scope: "general", kind: "textual", topic: "profession", text: "Saturn as that Navamsa lord points to labour, agriculture, wood, loads, service or manual trades. Status still depends on Saturn's strength." },
  { id: "pd-viii-sun", book: "Phaladeepika", ref: "VIII.4", scope: "general", kind: "textual", topic: "occupant", text: "Sun in the 10th is read as authority, recognition and public responsibility, modified by dignity and the 10th lord." },
  { id: "pd-viii-moon", book: "Phaladeepika", ref: "VIII.7", scope: "general", kind: "textual", topic: "occupant", text: "Moon in the 10th is read as public-facing work and service, modified by phase and strength." },
  { id: "pd-viii-mars", book: "Phaladeepika", ref: "VIII.10", scope: "general", kind: "textual", topic: "occupant", text: "Mars in the 10th is read as command and force, with a warning of harshness if undisciplined." },
  { id: "pd-viii-mercury", book: "Phaladeepika", ref: "VIII.13", scope: "general", kind: "textual", topic: "occupant", text: "Mercury in the 10th is read as learning, calculation and success in undertakings." },
  { id: "pd-viii-jupiter", book: "Phaladeepika", ref: "VIII.16", scope: "general", kind: "textual", topic: "occupant", text: "Jupiter in the 10th is read as conduct, wealth and favour from authority." },
  { id: "pd-viii-venus", book: "Phaladeepika", ref: "VIII.19", scope: "general", kind: "textual", topic: "occupant", text: "Venus in the 10th is read as recognition, friends and a respected post." },
  { id: "pd-viii-saturn", book: "Phaladeepika", ref: "VIII.23", scope: "general", kind: "textual", topic: "occupant", text: "Saturn in the 10th can mean responsibility and administration, but Chapter XVI also cautions about Saturn in the 10th. Both statements are kept." },
  { id: "pd-viii-rahu", book: "Phaladeepika", ref: "VIII.27", scope: "general", kind: "textual", topic: "occupant", text: "Rahu in the 10th is read as fame and involvement in other people's affairs, with a conduct warning." },
  { id: "pd-viii-ketu", book: "Phaladeepika", ref: "VIII.32", scope: "general", kind: "textual", topic: "occupant", text: "Ketu in the 10th is read as obstacles, bold action and a mixed reputation." },
  { id: "pd-xv", book: "Phaladeepika", ref: "XV.1–6, 17", scope: "general", kind: "textual", topic: "strength", text: "A house is stronger when occupied or aspected by its lord or benefics, and weaker when its lord is in 6, 8 or 12, debilitated, combust or in an enemy sign without support. Karakas of the 10th are Jupiter, Sun, Mercury and Saturn." },
  { id: "pd-xvi-27", book: "Phaladeepika", ref: "XVI.27", scope: "general", kind: "textual", topic: "status", text: "A benefic in the 10th with a strong 10th lord in a kendra or trikona, in own or exaltation sign, supports reputation. Lagna lord in the 10th is a status factor." },
  { id: "pd-xvi-28", book: "Phaladeepika", ref: "XVI.28", scope: "general", kind: "textual", topic: "status", text: "Sun or Mars in the 10th supports large undertakings only when the 10th lord is also well placed." },
  { id: "pd-amala", book: "Phaladeepika", ref: "VI.19–20", scope: "general", kind: "textual", topic: "yoga", text: "Amala Yoga is a benefic in the 10th from Lagna or from the Moon. Aspect alone does not make it." },
  { id: "pd-xx-11", book: "Phaladeepika", ref: "XX.11", scope: "general", kind: "textual", topic: "dasha", text: "A strong 10th lord's dasha supports completion of work, reputation and a stable post." },
  { id: "pd-xx-19", book: "Phaladeepika", ref: "XX.19", scope: "general", kind: "textual", topic: "dasha", text: "A weak 10th lord's dasha is read as failed undertakings and loss of honour." },
  { id: "pd-xx-7", book: "Phaladeepika", ref: "XX.7", scope: "general", kind: "textual", topic: "dasha", text: "A strong 6th lord's dasha supports effort against rivals and difficult duties. It does not by itself mean a new job." },
  { id: "pd-xx-12", book: "Phaladeepika", ref: "XX.12", scope: "general", kind: "textual", topic: "dasha", text: "A strong 11th lord's dasha supports gains, especially when linked with the 10th." },
  { id: "pd-xxvi", book: "Phaladeepika", ref: "XXVI.1–3", scope: "general", kind: "textual", topic: "transit", text: "Transit results are counted from the natal Moon and are separate from transit through the 10th from Lagna. A transit triggers a dasha theme; it does not create the promise." },
  { id: "bphs-21", book: "BPHS", ref: "Ch. 21", scope: "general", kind: "textual", topic: "karma", text: "Karma bhava is work, rank and action. The lord, occupants and aspects are read together." },
  { id: "bphs-d10", book: "BPHS", ref: "Ch. 6", scope: "general", kind: "textual", topic: "d10", text: "Dashamsha is a professional varga. Its 10th lord is not the Navamsa lord of the natal 10th lord." },
  { id: "bs-libra-frame", book: "Bhrigu Samhita", ref: "Libra, pp. 146–166", scope: "libra", kind: "textual", topic: "framework", text: "For Libra lagna the 10th is Cancer and its lord is the Moon. Service is read with the 6th lord Jupiter, income with Mars and the Sun, transfer with Saturn, and change with Venus and Mercury." },
  { id: "bs-libra-moon-houses", book: "Bhrigu Samhita", ref: "Libra, Moon in 12 houses", scope: "libra", kind: "textual", topic: "moon", text: "The Libra chapter gives a separate Moon result for each house. Use only the house the Moon actually occupies." },
  { id: "bs-libra-moon-8", book: "Bhrigu Samhita", ref: "Libra, Moon in 8th", scope: "libra", kind: "textual", topic: "moon", text: "Moon in Taurus, the 8th, is exalted by sign but the book's entry still mentions weakness of wealth and honour from foreign countries. Exaltation does not cancel the 8th-house caution." },
  { id: "bs-libra-mars-8", book: "Bhrigu Samhita", ref: "Libra, Mars in 8th", scope: "libra", kind: "textual", topic: "mars", text: "Mars in Taurus for Libra is read as loss of present wealth and perplexity in occupation. Keep that caution when Mars joins the exalted Moon." },
  { id: "bs-timing", book: "Bhrigu Samhita", ref: "Introduction, pp. 11–18", scope: "general", kind: "textual", topic: "timing", text: "Time events with Vimshottari mahadasha and antardasha. A favourable and an unfavourable factor can both show, in different forms or at different times." },
  { id: "gochar-timing", book: "Bhrigu Samhita", ref: "Gochar synthesis", scope: "general", kind: "synthesis", topic: "timing", text: "Promotion, employer change, transfer, business start and interruption are separate labels. Each needs the natal link plus a dasha of the relevant lord. Transit only narrows the window." },
  { id: "gochar-libra-not-fixed", book: "Bhrigu Samhita", ref: "Gochar synthesis", scope: "libra", kind: "synthesis", topic: "libra", text: "A Libra example is not a fixed reading for every Libra native. Degrees, strength, aspects, Navamsa and Dashamsha still decide the result." },
  { id: "bs-libra-moon-h1", book: "Bhrigu Samhita", ref: "Libra, Moon in 1st", scope: "libra", kind: "textual", topic: "moon", text: "Moon in the 1st for Libra is linked with dignified work and honour from government and society. Career is read as part of identity." },
  { id: "bs-libra-moon-h2", book: "Bhrigu Samhita", ref: "Libra, Moon in 2nd", scope: "libra", kind: "textual", topic: "moon", text: "Moon in the 2nd for Libra is linked with weak wealth through business and with private effort to rebuild it. Check income stability. Do not assume ruin." },
  { id: "bs-libra-moon-h3", book: "Bhrigu Samhita", ref: "Libra, Moon in 3rd", scope: "libra", kind: "textual", topic: "moon", text: "Moon in the 3rd for Libra is linked with success, cleverness and industriousness through initiative and skill." },
  { id: "bs-libra-moon-h4", book: "Bhrigu Samhita", ref: "Libra, Moon in 4th", scope: "libra", kind: "textual", topic: "moon", text: "Moon in the 4th for Libra is linked with a large business and public respect, plus property and parents. A transfer still needs the 4th to be activated by dasha, not by this placement alone." },
  { id: "bs-libra-moon-h5", book: "Bhrigu Samhita", ref: "Libra, Moon in 5th", scope: "libra", kind: "textual", topic: "moon", text: "Moon in the 5th for Libra is linked with ambitious plans, education and managerial duties." },
  { id: "bs-libra-moon-h6", book: "Bhrigu Samhita", ref: "Libra, Moon in 6th", scope: "libra", kind: "textual", topic: "moon", text: "Moon in the 6th for Libra is linked with a large business, spending above income, and contact with outside places. Read service, disputes and expenses together." },
  { id: "bs-libra-moon-h7", book: "Bhrigu Samhita", ref: "Libra, Moon in 7th", scope: "libra", kind: "textual", topic: "moon", text: "Moon in the 7th for Libra is linked with skilled work and success in occupation. Also examine clients and contracts." },
  { id: "bs-libra-moon-h9", book: "Bhrigu Samhita", ref: "Libra, Moon in 9th", scope: "libra", kind: "textual", topic: "moon", text: "Moon in the 9th for Libra is linked with fortune, progress through government or society, fame and duty." },
  { id: "bs-libra-moon-h10", book: "Bhrigu Samhita", ref: "Libra, Moon in 10th", scope: "libra", kind: "textual", topic: "moon", text: "Moon in the 10th for Libra is in its own house. The chapter links government respect, help from the father, a large business and industriousness." },
  { id: "bs-libra-moon-h11", book: "Bhrigu Samhita", ref: "Libra, Moon in 11th", scope: "libra", kind: "textual", topic: "moon", text: "Moon in the 11th for Libra is linked with gains, steady work, government respect and a large business." },
  { id: "bs-libra-moon-h12", book: "Bhrigu Samhita", ref: "Libra, Moon in 12th", scope: "libra", kind: "textual", topic: "moon", text: "Moon in the 12th for Libra is linked with loss in business and honour. Examine expenses, foreign residence and endings. Do not treat every such Moon as job loss." },
  { id: "bs-libra-10-sun", book: "Bhrigu Samhita", ref: "Libra, Sun in 10th", scope: "libra", kind: "textual", topic: "occupant", text: "Sun in Cancer for Libra links income with respect, large business, and gains through father, government or society. Sun rules the 11th. This is not a promotion by itself." },
  { id: "bs-libra-10-moon", book: "Bhrigu Samhita", ref: "Libra, Moon in 10th", scope: "libra", kind: "textual", topic: "occupant", text: "Moon in Cancer for Libra is the 10th lord in its own 10th. The chapter links public respect, help from the father, a large business and industriousness." },
  { id: "bs-libra-10-mars", book: "Bhrigu Samhita", ref: "Libra, Mars in 10th", scope: "libra", kind: "textual", topic: "occupant", text: "Mars in Cancer for Libra is a mixed entry: weakness of wealth and occupation, and also respect and industriousness. Mars is debilitated in Cancer and rules the 2nd and 7th. Do not cancel that debility from this line alone." },
  { id: "bs-libra-10-mercury", book: "Bhrigu Samhita", ref: "Libra, Mercury in 10th", scope: "libra", kind: "textual", topic: "occupant", text: "Mercury in Cancer for Libra is linked with a splendid business and honour through conduct. It rules the 9th and 12th, so learning, advice or foreign links can join the work. Cancer is not Mercury's own or exaltation sign, so this is not Bhadrayoga." },
  { id: "bs-libra-10-jupiter", book: "Bhrigu Samhita", ref: "Libra, Jupiter in 10th", scope: "libra", kind: "textual", topic: "occupant", text: "Jupiter in Cancer for Libra is exalted and is linked with influence and skill in complex policy, with comparatively little business. It rules the 3rd and 6th. Exaltation is not an effortless career." },
  { id: "bs-libra-10-venus", book: "Bhrigu Samhita", ref: "Libra, Venus in 10th", scope: "libra", kind: "textual", topic: "occupant", text: "Venus in Cancer for Libra is linked with authority and comfort, and also with slow progress of honour and business. Venus rules the lagna and the 8th, so identity and change are both tied to the career." },
  { id: "bs-libra-10-saturn", book: "Bhrigu Samhita", ref: "Libra, Saturn in 10th", scope: "libra", kind: "textual", topic: "occupant", text: "Saturn in Cancer for Libra is linked with some occupational weakness and strain concerning the father. It rules the 4th and 5th. Do not read this as a guaranteed promotion." },
  { id: "bs-libra-10-rahu", book: "Bhrigu Samhita", ref: "Libra, Rahu in 10th", scope: "libra", kind: "textual", topic: "occupant", text: "Rahu in Cancer for Libra has a cautionary entry: distress involving government, society and business. Unconventional ambition is a synthesis, not a promise of success." },
  { id: "bs-libra-10-ketu", book: "Bhrigu Samhita", ref: "Libra, Ketu in 10th", scope: "libra", kind: "textual", topic: "occupant", text: "Ketu in Cancer for Libra is linked with loss in business, anxiety and opposition to government. Do not turn that into a fixed prediction of unemployment." },
];

const NAVAMSA_RULE: Partial<Record<GrahaId, string>> = {
  sun: "pd-v-sun",
  moon: "pd-v-moon",
  mars: "pd-v-mars",
  mercury: "pd-v-mercury",
  jupiter: "pd-v-jupiter",
  venus: "pd-v-venus",
  saturn: "pd-v-saturn",
};

const OCCUPANT_RULE: Partial<Record<GrahaId, string>> = {
  sun: "pd-viii-sun",
  moon: "pd-viii-moon",
  mars: "pd-viii-mars",
  mercury: "pd-viii-mercury",
  jupiter: "pd-viii-jupiter",
  venus: "pd-viii-venus",
  saturn: "pd-viii-saturn",
  rahu: "pd-viii-rahu",
  ketu: "pd-viii-ketu",
};

export function careerRule(id: string): CareerRule | undefined {
  return CAREER_RULES.find((rule) => rule.id === id);
}

export function navamsaRuleId(lord: GrahaId): string | undefined {
  return NAVAMSA_RULE[lord];
}

export function occupantRuleId(id: GrahaId): string | undefined {
  return OCCUPANT_RULE[id];
}

export function libraMoonHouseRuleId(house: number): string | undefined {
  if (house === 8) return "bs-libra-moon-8";
  if (house < 1 || house > 12) return undefined;
  return `bs-libra-moon-h${house}`;
}

export function libraTenthOccupantRuleId(id: GrahaId): string {
  return `bs-libra-10-${id}`;
}
