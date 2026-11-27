import { signIndex, type GrahaPosition } from "./calc";

export const SAPTA = ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn"] as const;

type Sapta = (typeof SAPTA)[number];
type Source = Sapta | "lagna";

/** Parashara benefic houses (1–12) counted from each contributor. Totals are fixed: Su 48, Mo 49, Ma 39, Me 54, Ju 56, Ve 52, Sa 39. */
const REKHA: Record<Sapta, Record<Source, number[]>> = {
  sun: {
    sun: [1, 2, 4, 7, 8, 9, 10, 11],
    moon: [3, 6, 10, 11],
    mars: [1, 2, 4, 7, 8, 9, 10, 11],
    mercury: [3, 5, 6, 9, 10, 11, 12],
    jupiter: [5, 6, 9, 11],
    venus: [6, 7, 12],
    saturn: [1, 2, 4, 7, 8, 9, 10, 11],
    lagna: [3, 4, 6, 10, 11, 12],
  },
  moon: {
    sun: [3, 6, 7, 8, 10, 11],
    moon: [1, 3, 6, 7, 10, 11],
    mars: [2, 3, 5, 6, 9, 10, 11],
    mercury: [1, 3, 4, 5, 7, 8, 10, 11],
    jupiter: [1, 4, 7, 8, 10, 11, 12],
    venus: [3, 4, 5, 7, 9, 10, 11],
    saturn: [3, 5, 6, 11],
    lagna: [3, 6, 10, 11],
  },
  mars: {
    sun: [3, 5, 6, 10, 11],
    moon: [3, 6, 11],
    mars: [1, 2, 4, 7, 8, 10, 11],
    mercury: [3, 5, 6, 11],
    jupiter: [6, 10, 11, 12],
    venus: [6, 8, 11, 12],
    saturn: [1, 4, 7, 8, 9, 10, 11],
    lagna: [1, 3, 6, 10, 11],
  },
  mercury: {
    sun: [5, 6, 9, 11, 12],
    moon: [2, 4, 6, 8, 10, 11],
    mars: [1, 2, 4, 7, 8, 9, 10, 11],
    mercury: [1, 3, 5, 6, 9, 10, 11, 12],
    jupiter: [6, 8, 11, 12],
    venus: [1, 2, 3, 4, 5, 8, 9, 11],
    saturn: [1, 2, 4, 7, 8, 9, 10, 11],
    lagna: [1, 2, 4, 6, 8, 10, 11],
  },
  jupiter: {
    sun: [1, 2, 3, 4, 7, 8, 9, 10, 11],
    moon: [2, 5, 7, 9, 11],
    mars: [1, 2, 4, 7, 8, 10, 11],
    mercury: [1, 2, 4, 5, 6, 9, 10, 11],
    jupiter: [1, 2, 3, 4, 7, 8, 10, 11],
    venus: [2, 5, 6, 9, 10, 11],
    saturn: [3, 5, 6, 12],
    lagna: [1, 2, 4, 5, 6, 7, 9, 10, 11],
  },
  venus: {
    sun: [8, 11, 12],
    moon: [1, 2, 3, 4, 5, 8, 9, 11, 12],
    mars: [3, 5, 6, 9, 11, 12],
    mercury: [3, 5, 6, 9, 11],
    jupiter: [5, 8, 9, 10, 11],
    venus: [1, 2, 3, 4, 5, 8, 9, 10, 11],
    saturn: [3, 4, 5, 8, 9, 10, 11],
    lagna: [1, 2, 3, 4, 5, 8, 9, 11],
  },
  saturn: {
    sun: [1, 2, 4, 7, 8, 10, 11],
    moon: [3, 6, 11],
    mars: [3, 5, 6, 10, 11, 12],
    mercury: [6, 8, 9, 10, 11, 12],
    jupiter: [5, 6, 11, 12],
    venus: [6, 11, 12],
    saturn: [3, 5, 6, 11],
    lagna: [1, 3, 4, 6, 10, 11],
  },
};

export const BINDU_TOTAL: Record<Sapta, number> = {
  sun: 48,
  moon: 49,
  mars: 39,
  mercury: 54,
  jupiter: 56,
  venus: 52,
  saturn: 39,
};

export const SAV_TOTAL = 337;

export type Ashtakavarga = {
  bhinna: Record<Sapta, number[]>;
  sarva: number[];
};

export function ashtakavarga(grahas: GrahaPosition[], lagnaLon: number): Ashtakavarga {
  const at: Partial<Record<Source, number>> = { lagna: signIndex(lagnaLon) };
  for (const graha of grahas) {
    if ((SAPTA as readonly string[]).includes(graha.id)) at[graha.id as Sapta] = signIndex(graha.lon);
  }
  const bhinna = {} as Ashtakavarga["bhinna"];
  const sarva = Array.from({ length: 12 }, () => 0);
  for (const planet of SAPTA) {
    const row = Array.from({ length: 12 }, () => 0);
    for (const source of Object.keys(REKHA[planet]) as Source[]) {
      const from = at[source];
      if (from === undefined) continue;
      for (const house of REKHA[planet][source]) {
        const sign = (from + house - 1) % 12;
        row[sign] = (row[sign] ?? 0) + 1;
      }
    }
    bhinna[planet] = row;
    row.forEach((value, sign) => {
      sarva[sign] = (sarva[sign] ?? 0) + value;
    });
  }
  return { bhinna, sarva };
}
