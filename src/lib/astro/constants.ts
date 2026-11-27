export const GRAHA_IDS = [
  "sun",
  "moon",
  "mars",
  "mercury",
  "jupiter",
  "venus",
  "saturn",
  "rahu",
  "ketu",
] as const;

export type GrahaId = (typeof GRAHA_IDS)[number];

export type AyanamsaId = "lahiri" | "raman" | "kp";
export type NodeMode = "true" | "mean";
export type ChartStyle = "north" | "south";
export type Division = "rashi" | "navamsa";

export const AYANAMSA_LABEL: Record<AyanamsaId, string> = {
  lahiri: "Lahiri",
  raman: "B.V. Raman",
  kp: "Krishnamurti",
};

export const GRAHA_NAME: Record<GrahaId, string> = {
  sun: "Sun",
  moon: "Moon",
  mars: "Mars",
  mercury: "Mercury",
  jupiter: "Jupiter",
  venus: "Venus",
  saturn: "Saturn",
  rahu: "Rahu",
  ketu: "Ketu",
};

export const GRAHA_SANSKRIT: Record<GrahaId, string> = {
  sun: "Surya",
  moon: "Chandra",
  mars: "Mangala",
  mercury: "Budha",
  jupiter: "Guru",
  venus: "Shukra",
  saturn: "Shani",
  rahu: "Rahu",
  ketu: "Ketu",
};

export const GRAHA_ABBR: Record<GrahaId, string> = {
  sun: "Su",
  moon: "Mo",
  mars: "Ma",
  mercury: "Me",
  jupiter: "Ju",
  venus: "Ve",
  saturn: "Sa",
  rahu: "Ra",
  ketu: "Ke",
};

export const RASHIS = [
  { name: "Aries", sanskrit: "Mesha", abbr: "Ar" },
  { name: "Taurus", sanskrit: "Vrishabha", abbr: "Ta" },
  { name: "Gemini", sanskrit: "Mithuna", abbr: "Ge" },
  { name: "Cancer", sanskrit: "Karka", abbr: "Cn" },
  { name: "Leo", sanskrit: "Simha", abbr: "Le" },
  { name: "Virgo", sanskrit: "Kanya", abbr: "Vi" },
  { name: "Libra", sanskrit: "Tula", abbr: "Li" },
  { name: "Scorpio", sanskrit: "Vrishchika", abbr: "Sc" },
  { name: "Sagittarius", sanskrit: "Dhanu", abbr: "Sg" },
  { name: "Capricorn", sanskrit: "Makara", abbr: "Cp" },
  { name: "Aquarius", sanskrit: "Kumbha", abbr: "Aq" },
  { name: "Pisces", sanskrit: "Meena", abbr: "Pi" },
] as const;

export const SIGN_LORD: GrahaId[] = [
  "mars",
  "venus",
  "mercury",
  "moon",
  "sun",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "saturn",
  "jupiter",
];

export const NAKSHATRAS = [
  "Ashwini",
  "Bharani",
  "Krittika",
  "Rohini",
  "Mrigashira",
  "Ardra",
  "Punarvasu",
  "Pushya",
  "Ashlesha",
  "Magha",
  "Purva Phalguni",
  "Uttara Phalguni",
  "Hasta",
  "Chitra",
  "Swati",
  "Vishakha",
  "Anuradha",
  "Jyeshtha",
  "Mula",
  "Purva Ashadha",
  "Uttara Ashadha",
  "Shravana",
  "Dhanishta",
  "Shatabhisha",
  "Purva Bhadrapada",
  "Uttara Bhadrapada",
  "Revati",
] as const;

export const NAKSHATRA_LORDS: GrahaId[] = [
  "ketu",
  "venus",
  "sun",
  "moon",
  "mars",
  "rahu",
  "jupiter",
  "saturn",
  "mercury",
];

export const YOGAS = [
  "Vishkambha",
  "Priti",
  "Ayushman",
  "Saubhagya",
  "Shobhana",
  "Atiganda",
  "Sukarma",
  "Dhriti",
  "Shula",
  "Ganda",
  "Vriddhi",
  "Dhruva",
  "Vyaghata",
  "Harshana",
  "Vajra",
  "Siddhi",
  "Vyatipata",
  "Variyan",
  "Parigha",
  "Shiva",
  "Siddha",
  "Sadhya",
  "Shubha",
  "Shukla",
  "Brahma",
  "Indra",
  "Vaidhriti",
] as const;

export const TITHI_NAMES = [
  "Pratipada",
  "Dwitiya",
  "Tritiya",
  "Chaturthi",
  "Panchami",
  "Shashthi",
  "Saptami",
  "Ashtami",
  "Navami",
  "Dashami",
  "Ekadashi",
  "Dwadashi",
  "Trayodashi",
  "Chaturdashi",
] as const;

export const VARAS = [
  "Ravivara",
  "Somavara",
  "Mangalavara",
  "Budhavara",
  "Guruvara",
  "Shukravara",
  "Shanivara",
] as const;

export const VARA_ENGLISH = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const DASHA_LORDS: GrahaId[] = [
  "ketu",
  "venus",
  "sun",
  "moon",
  "mars",
  "rahu",
  "jupiter",
  "saturn",
  "mercury",
];

export const DASHA_YEARS = [7, 20, 6, 10, 7, 18, 16, 19, 17];

export const NAKSHATRA_ARC = 360 / 27;

export const OWN_SIGNS: Partial<Record<GrahaId, number[]>> = {
  sun: [4],
  moon: [3],
  mars: [0, 7],
  mercury: [2, 5],
  jupiter: [8, 11],
  venus: [1, 6],
  saturn: [9, 10],
};

/** Deep exaltation: sign index and degree within the sign. */
export const EXALTATION: Partial<Record<GrahaId, { sign: number; deg: number }>> = {
  sun: { sign: 0, deg: 10 },
  moon: { sign: 1, deg: 3 },
  mars: { sign: 9, deg: 28 },
  mercury: { sign: 5, deg: 15 },
  jupiter: { sign: 3, deg: 5 },
  venus: { sign: 11, deg: 27 },
  saturn: { sign: 6, deg: 20 },
};

/** Moolatrikona spans, degrees within the sign, end exclusive. */
export const MOOLATRIKONA: Partial<Record<GrahaId, { sign: number; start: number; end: number }>> = {
  sun: { sign: 4, start: 0, end: 20 },
  moon: { sign: 1, start: 3, end: 30 },
  mars: { sign: 0, start: 0, end: 12 },
  mercury: { sign: 5, start: 16, end: 20 },
  jupiter: { sign: 8, start: 0, end: 10 },
  venus: { sign: 6, start: 0, end: 15 },
  saturn: { sign: 10, start: 0, end: 20 },
};

/** Combustion orbs in degrees of longitude. Retrograde orbs where they differ. */
export const COMBUST_ORB: Partial<Record<GrahaId, { direct: number; retro: number }>> = {
  moon: { direct: 12, retro: 12 },
  mars: { direct: 17, retro: 17 },
  mercury: { direct: 14, retro: 12 },
  jupiter: { direct: 11, retro: 11 },
  venus: { direct: 10, retro: 8 },
  saturn: { direct: 15, retro: 15 },
};
