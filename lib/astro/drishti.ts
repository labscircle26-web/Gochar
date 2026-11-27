import type { GrahaId } from "./constants";

/** Whole-sign Parashari drishti. Offsets are houses counted from the graha, minus one. */
export type NodeDrishti = "seventh" | "trine" | "saturn";

const CLASSICAL: Record<Exclude<GrahaId, "rahu" | "ketu">, number[]> = {
  sun: [6],
  moon: [6],
  mars: [3, 6, 7],
  mercury: [6],
  jupiter: [4, 6, 8],
  venus: [6],
  saturn: [2, 6, 9],
};

export const DRISHTI_COLOR: Record<GrahaId, string> = {
  sun: "#f0c14e",
  moon: "#f7f4ee",
  mars: "#e07050",
  mercury: "#8fd0a4",
  jupiter: "#e6c56b",
  venus: "#f0c8bc",
  saturn: "#9eb0c8",
  rahu: "#9aa6e8",
  ketu: "#d2a679",
};

export const NODE_DRISHTI_OPTIONS: { id: NodeDrishti; label: string }[] = [
  { id: "seventh", label: "7th only" },
  { id: "trine", label: "5th, 7th and 9th" },
  { id: "saturn", label: "3rd, 7th and 10th" },
];

export function drishtiOffsets(id: GrahaId, nodes: NodeDrishti): number[] {
  if (id === "rahu" || id === "ketu") {
    if (nodes === "trine") return [4, 6, 8];
    if (nodes === "saturn") return [2, 6, 9];
    return [6];
  }
  return CLASSICAL[id];
}

export function drishtiLabel(offset: number): string {
  const name: Record<number, string> = { 2: "3rd", 3: "4th", 4: "5th", 6: "7th", 7: "8th", 8: "9th", 9: "10th" };
  return name[offset] ?? `${offset + 1}th`;
}
