import { useEffect, useState } from "react";
import { GRAHA_ABBR, GRAHA_NAME, RASHIS, type GrahaId } from "@/lib/astro/constants";
import type { EclipseDot } from "@/lib/astro/eclipses";
import { DRISHTI_COLOR, drishtiLabel, drishtiOffsets, type NodeDrishti } from "@/lib/astro/drishti";

export type ChartPlanet = { id: GrahaId; retro: boolean; combust?: boolean };

const NORTH: [number, number][][] = [
  [
    [50, 0],
    [25, 25],
    [50, 50],
    [75, 25],
  ],
  [
    [0, 0],
    [50, 0],
    [25, 25],
  ],
  [
    [0, 0],
    [25, 25],
    [0, 50],
  ],
  [
    [0, 50],
    [25, 25],
    [50, 50],
    [25, 75],
  ],
  [
    [0, 50],
    [25, 75],
    [0, 100],
  ],
  [
    [0, 100],
    [25, 75],
    [50, 100],
  ],
  [
    [50, 100],
    [25, 75],
    [50, 50],
    [75, 75],
  ],
  [
    [50, 100],
    [75, 75],
    [100, 100],
  ],
  [
    [100, 100],
    [75, 75],
    [100, 50],
  ],
  [
    [100, 50],
    [75, 75],
    [50, 50],
    [75, 25],
  ],
  [
    [100, 50],
    [75, 25],
    [100, 0],
  ],
  [
    [100, 0],
    [75, 25],
    [50, 0],
  ],
];

const SOUTH: { sign: number; col: number; row: number }[] = [
  { sign: 11, col: 0, row: 0 },
  { sign: 0, col: 1, row: 0 },
  { sign: 1, col: 2, row: 0 },
  { sign: 2, col: 3, row: 0 },
  { sign: 10, col: 0, row: 1 },
  { sign: 3, col: 3, row: 1 },
  { sign: 9, col: 0, row: 2 },
  { sign: 4, col: 3, row: 2 },
  { sign: 8, col: 0, row: 3 },
  { sign: 7, col: 1, row: 3 },
  { sign: 6, col: 2, row: 3 },
  { sign: 5, col: 3, row: 3 },
];

function centroid(points: [number, number][]): [number, number] {
  let x = 0;
  let y = 0;
  for (const point of points) {
    x += point[0];
    y += point[1];
  }
  return [x / points.length, y / points.length];
}

function planetLabel(planet: ChartPlanet): string {
  const marks = `${planet.retro ? "R" : ""}${planet.combust ? "(C)" : ""}`;
  return `${GRAHA_ABBR[planet.id]}${marks}`;
}

function PlanetMarks({
  planets,
  x,
  top,
  step,
  size,
  selected,
  onPlanet,
  sign,
  lagnaSign,
}: {
  planets: ChartPlanet[];
  x: number;
  top: number;
  step: number;
  size: number;
  selected: GrahaId | null;
  onPlanet?: (id: GrahaId) => void;
  sign: number;
  lagnaSign: number;
}) {
  return planets.map((planet, index) => {
    const y = top + index * step;
    const markX = x + size * 0.85;
    const isNode = planet.id === "rahu" || planet.id === "ketu";
    const house = ((sign - lagnaSign + 12) % 12) + 1;
    return (
      <g
        key={planet.id}
        role={onPlanet ? "button" : undefined}
        aria-label={onPlanet ? GRAHA_NAME[planet.id] : undefined}
        onClick={(event) => {
          event.stopPropagation();
          onPlanet?.(planet.id);
        }}
        style={{ cursor: onPlanet ? "pointer" : undefined }}
      >
        <circle cx={x} cy={y} r={Math.max(14, step * 0.62)} fill={selected === planet.id ? "rgb(240 193 78 / 0.18)" : "transparent"} />
        <text
          x={planet.retro || planet.combust ? x - size * 0.35 : x}
          y={y}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={size}
          fontWeight={600}
          fontFamily="var(--font-sans)"
          fill={selected === planet.id ? "var(--color-seal)" : "#f7f3ea"}
        >
          {GRAHA_ABBR[planet.id]}
        </text>
        {planet.retro ? (
          <text x={markX} y={y} textAnchor="start" dominantBaseline="middle" fontSize={Math.max(8, size * 0.62)} fontFamily="var(--font-sans)" fill="#e7c36a">
            R
          </text>
        ) : null}
        {planet.combust ? (
          <text
            x={markX + (planet.retro ? size * 0.55 : 0)}
            y={y}
            textAnchor="start"
            dominantBaseline="middle"
            fontSize={Math.max(8, size * 0.62)}
            fontFamily="var(--font-sans)"
            fill="#e07050"
          >
            C
          </text>
        ) : null}
        {isNode ? (
          <text
            x={x}
            y={y + Math.min(7, step * 0.35)}
            textAnchor="middle"
            dominantBaseline="hanging"
            fontSize={Math.max(6, size * 0.46)}
            fontWeight={700}
            fontFamily="var(--font-sans)"
            fill="#e7c36a"
          >
            H{house}
          </text>
        ) : null}
      </g>
    );
  });
}

function rashiMark(sign: number, lagna: boolean): string {
  return `${sign + 1}${lagna ? " Lg" : ""}`;
}

function lineFill(lagnaLine: boolean): string {
  return lagnaLine ? "var(--color-seal)" : "var(--color-ink)";
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);
  return reduced;
}

function northHouse(lagnaSign: number, sign: number): [number, number][] {
  const index = (sign - lagnaSign + 12) % 12;
  return (NORTH[index] ?? []).map(([x, y]) => [x * 4, y * 4] as [number, number]);
}

function labelPoint(
  style: "north" | "south",
  lagnaSign: number,
  sign: number,
  bySign: ChartPlanet[][],
  planetIndex: number | null,
): [number, number] {
  const count = 1 + (bySign[sign]?.length ?? 0);
  if (style === "south") {
    const cell = SOUTH.find((item) => item.sign === sign);
    if (!cell) return [200, 200];
    if (planetIndex === null) return [cell.col * 100 + 50, cell.row * 100 + 50];
    const step = 18;
    const start = cell.row * 100 + (100 - count * step) / 2 + 14;
    return [cell.col * 100 + 50, start + (1 + planetIndex) * step - 5];
  }
  const [cx, cy] = centroid(northHouse(lagnaSign, sign));
  if (planetIndex === null) return [cx, cy];
  const step = 20;
  const top = cy - ((count - 1) * step) / 2;
  return [cx, top + (1 + planetIndex) * step];
}

function housePoly(style: "north" | "south", lagnaSign: number, sign: number): [number, number][] {
  if (style === "south") {
    const cell = SOUTH.find((item) => item.sign === sign);
    if (!cell) return [[0, 0], [400, 0], [400, 400], [0, 400]];
    const x = cell.col * 100;
    const y = cell.row * 100;
    return [[x, y], [x + 100, y], [x + 100, y + 100], [x, y + 100]];
  }
  return northHouse(lagnaSign, sign);
}

function insidePoly(poly: [number, number][], x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i] ?? [0, 0];
    const [xj, yj] = poly[j] ?? [0, 0];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi || 0.00001) + xi) inside = !inside;
  }
  return inside;
}

type DrishtiRay = {
  key: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  colors: string[];
  label: string;
  toSign: number;
};

function buildRays(style: "north" | "south", lagnaSign: number, bySign: ChartPlanet[][], ids: GrahaId[], nodes: NodeDrishti, housesOnly: boolean): DrishtiRay[] {
  const grouped = new Map<number, { id: GrahaId; x: number; y: number; aspect: string }[]>();
  for (const id of ids) {
    let fromSign = -1;
    let fromIndex = 0;
    for (let sign = 0; sign < 12; sign++) {
      const index = (bySign[sign] ?? []).findIndex((planet) => planet.id === id);
      if (index >= 0) {
        fromSign = sign;
        fromIndex = index;
        break;
      }
    }
    if (fromSign < 0) continue;
    const [x, y] = labelPoint(style, lagnaSign, fromSign, bySign, housesOnly ? null : fromIndex);
    for (const offset of drishtiOffsets(id, nodes)) {
      const toSign = (fromSign + offset) % 12;
      const list = grouped.get(toSign) ?? [];
      if (!list.some((item) => item.id === id)) list.push({ id, x, y, aspect: drishtiLabel(offset) });
      grouped.set(toSign, list);
    }
  }
  return [...grouped.entries()].map(([toSign, sources]) => {
    const [x2, y2] = labelPoint(style, lagnaSign, toSign, bySign, null);
    const x1 = sources.reduce((sum, source) => sum + source.x, 0) / sources.length;
    const y1 = sources.reduce((sum, source) => sum + source.y, 0) / sources.length;
    return {
      key: `house-${toSign}`,
      x1,
      y1,
      x2,
      y2,
      colors: sources.map((source) => DRISHTI_COLOR[source.id]),
      label: sources.map((source) => `${GRAHA_NAME[source.id]} ${source.aspect}`).join(", "),
      toSign,
    };
  });
}

/** Place one badge just beside the line ends in a house, clear of the labels. */
function eyeBeside(poly: [number, number][], rays: DrishtiRay[]): [number, number] {
  let px = 0;
  let py = 0;
  let ix = 0;
  let iy = 0;
  for (const ray of rays) {
    px += ray.x2;
    py += ray.y2;
    ix += ray.x2 - ray.x1;
    iy += ray.y2 - ray.y1;
  }
  px /= rays.length;
  py /= rays.length;
  const length = Math.hypot(ix, iy) || 1;
  const ux = ix / length;
  const uy = iy / length;
  const dirs: [number, number][] = [
    [-uy, ux],
    [uy, -ux],
    [-ux, -uy],
    [ux, uy],
  ];
  const hitsLabel = (x: number, y: number) =>
    rays.some((ray) => {
      const left = Math.min(x - 15, ray.x2 - 20);
      const right = Math.max(x + 16, ray.x2 + 20);
      const top = Math.min(y - 8, ray.y2 - 8);
      const bottom = Math.max(y + 8, ray.y2 + 8);
      const apart = right - left > 31 + 40 || bottom - top > 16 + 16;
      return !apart;
    });
  let best: { x: number; y: number; score: number } | null = null;
  for (const [dx, dy] of dirs) {
    const edge = 1 / Math.max(Math.abs(dx) / 15.5, Math.abs(dy) / 8);
    for (const gap of [10, 16, 26, 36]) {
      const x = px + dx * (edge + gap);
      const y = py + dy * (edge + gap);
      const left = x - 15;
      const right = x + 16;
      const top = y - 8;
      const bottom = y + 8;
      if (left < 3 || top < 3 || right > 397 || bottom > 397) continue;
      const centerIn = insidePoly(poly, x, y);
      const corners = [
        [left, top],
        [right, top],
        [left, bottom],
        [right, bottom],
      ].filter(([cx, cy]) => insidePoly(poly, cx ?? 0, cy ?? 0)).length;
      const dist = Math.hypot(x - px, y - py);
      const score = (centerIn ? 0 : 800) + (4 - corners) * 40 + (hitsLabel(x, y) ? 300 : 0) + Math.abs(dist - 32);
      if (!best || score < best.score) best = { x, y, score };
    }
  }
  return best ? [best.x, best.y] : [px, py];
}

type DrishtiHit = { id: GrahaId; aspect: string; sign: number };

function drishtiHits(bySign: ChartPlanet[][], ids: GrahaId[], nodes: NodeDrishti): DrishtiHit[] {
  const hits: DrishtiHit[] = [];
  for (const id of ids) {
    const fromSign = bySign.findIndex((planets) => planets.some((planet) => planet.id === id));
    if (fromSign < 0) continue;
    for (const offset of drishtiOffsets(id, nodes)) {
      hits.push({ id, aspect: drishtiLabel(offset), sign: (fromSign + offset) % 12 });
    }
  }
  return hits;
}

function DrishtiLayer({ rays, reduced, focus }: { rays: DrishtiRay[]; reduced: boolean; focus: number | null }) {
  if (rays.length === 0) return null;
  return (
    <g pointerEvents="none">
      <defs>
        {rays
          .filter((ray) => ray.colors.length > 1)
          .map((ray) => (
            <linearGradient key={ray.key} id={`drishti-${ray.key}`} x1={ray.x1} y1={ray.y1} x2={ray.x2} y2={ray.y2} gradientUnits="userSpaceOnUse">
              {ray.colors.map((color, index) => (
                <stop key={`${color}-${index}`} offset={`${(index / (ray.colors.length - 1)) * 100}%`} stopColor={color} />
              ))}
            </linearGradient>
          ))}
      </defs>
      {rays.map((ray) => {
        const stroke = ray.colors.length === 1 ? ray.colors[0] : `url(#drishti-${ray.key})`;
        return (
          <g key={ray.key} opacity={focus === null || ray.toSign === focus ? 1 : 0.12}>
            <line x1={ray.x1} y1={ray.y1} x2={ray.x2} y2={ray.y2} stroke={stroke} strokeWidth="4" opacity="0.18" />
            <line x1={ray.x1} y1={ray.y1} x2={ray.x2} y2={ray.y2} stroke={stroke} strokeWidth="1.2" className={reduced ? undefined : "drishti-flow"}>
              <title>{ray.label}</title>
            </line>
            <circle cx={ray.x2} cy={ray.y2} r="3.2" fill={ray.colors[0]} opacity="0.85" className={reduced ? undefined : "panchang-pulse"} />
            {reduced
              ? null
              : ray.colors.map((color, index) => (
                  <circle key={`${ray.key}-${color}-${index}`} r="2" fill={color}>
                    <animateMotion dur="2.8s" begin={`${index * 0.7}s`} repeatCount="indefinite" path={`M ${ray.x1} ${ray.y1} L ${ray.x2} ${ray.y2}`} />
                  </circle>
                ))}
          </g>
        );
      })}
    </g>
  );
}

function EyeLayer({
  style,
  lagnaSign,
  hits,
  rays,
  focus,
  onFocus,
}: {
  style: "north" | "south";
  lagnaSign: number;
  hits: DrishtiHit[];
  rays: DrishtiRay[];
  focus: number | null;
  onFocus: (sign: number) => void;
}) {
  const houses = new Map<number, DrishtiHit[]>();
  for (const hit of hits) {
    const list = houses.get(hit.sign) ?? [];
    if (!list.some((item) => item.id === hit.id)) list.push(hit);
    houses.set(hit.sign, list);
  }
  return (
    <g>
      {[...houses.entries()].map(([sign, list]) => {
        const ends = rays.filter((ray) => ray.toSign === sign);
        if (ends.length === 0) return null;
        const [x, y] = eyeBeside(housePoly(style, lagnaSign, sign), ends);
        const open = focus === sign;
        return (
          <g
            key={sign}
            data-drishti-eye={sign}
            data-eye-x={x.toFixed(1)}
            data-eye-y={y.toFixed(1)}
            transform={`translate(${x} ${y})`}
            style={{ cursor: "pointer" }}
            role="button"
            aria-pressed={open}
            aria-label={`${list.length} ${list.length === 1 ? "graha aspects" : "grahas aspect"} this house`}
            onClick={(event) => {
              event.stopPropagation();
              onFocus(sign);
            }}
          >
            <rect x="-15" y="-8" width="31" height="16" rx="8" fill="#1c1406" stroke={open ? "#fff6d8" : "#f0c14e"} strokeWidth="1" />
            <ellipse cx="-7" cy="0" rx="4.6" ry="2.8" fill="none" stroke="#f0c14e" strokeWidth="1" />
            <circle cx="-7" cy="0" r="1.15" fill="#f0c14e" />
            <text x="1" y="3" fontSize="9" fontFamily="var(--font-sans)" fill="#f0c14e">
              {list.length}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function spanAt(points: [number, number][], y: number): { left: number; right: number } | null {
  const xs: number[] = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i] ?? [0, 0];
    const b = points[(i + 1) % points.length] ?? [0, 0];
    if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) {
      const t = (y - a[1]) / (b[1] - a[1] || 0.00001);
      xs.push(a[0] + t * (b[0] - a[0]));
    }
  }
  if (xs.length < 2) return null;
  return { left: Math.min(...xs), right: Math.max(...xs) };
}

function eclipseSpot(points: [number, number][], lineCount: number): { x: number; y: number; compact: boolean } {
  const [cx, cy] = centroid(points);
  const step = 20;
  const count = Math.max(1, lineCount);
  const top = cy - ((count - 1) * step) / 2;
  const bottom = top + (count - 1) * step;
  const ys = points.map((point) => point[1]);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  let best: { x: number; y: number; compact: boolean; score: number } | null = null;
  for (let y = minY + 9; y <= maxY - 7; y += 2) {
    const span = spanAt(points, y);
    if (!span) continue;
    const width = span.right - span.left;
    const clear = y < top - 9 || y > bottom + 9;
    const compact = width < 50;
    const need = compact ? 30 : 52;
    const left = Math.max(span.left, 10);
    const right = Math.min(span.right, 390);
    if (right - left < need || y < 12 || y > 388) continue;
    const x = (left + right) / 2;
    const score = (clear ? 0 : 1_000_000) + (x - cx) ** 2 + (y - cy) ** 2;
    if (!best || score < best.score) best = { x, y, compact, score };
  }
  return best ?? { x: cx, y: cy, compact: true };
}

function EclipseMarks({ dots, x, y, compact = false }: { dots: EclipseDot[]; x: number; y: number; compact?: boolean }) {
  return dots.map((dot, index) => {
    const gold = dot.kind === "solar";
    const fill = gold ? "#f0c14e" : "#f7f4ee";
    const cy = y + index * 11;
    const label = compact ? `${dot.label.split("°")[0]}°` : dot.label;
    const textW = compact ? 16 : 34;
    const left = x - (5 + 4 + textW) / 2;
    return (
      <g key={`${dot.kind}-${dot.label}-${index}`}>
        <circle cx={left + 3} cy={cy} r={6} fill={fill} opacity={0.3} />
        <circle cx={left + 3} cy={cy} r={2.4} fill={fill} />
        <text x={left + 9} y={cy + 2.5} textAnchor="start" fontSize="8" fontFamily="var(--font-sans)" fill={fill}>
          {label}
        </text>
      </g>
    );
  });
}

export function KundliChart({
  style,
  lagnaSign,
  bySign,
  caption,
  headline,
  detail,
  label,
  mark,
  selectedSign = null,
  selectedPlanet = null,
  onPick,
  onPlanet,
  houseMarks = null,
  eclipses = null,
  drishti = null,
}: {
  style: "north" | "south";
  lagnaSign: number;
  bySign: ChartPlanet[][];
  caption: string;
  headline: string;
  detail: string;
  label: string;
  mark: "transit" | "janma" | "bindu";
  selectedSign?: number | null;
  selectedPlanet?: GrahaId | null;
  onPick?: (sign: number) => void;
  onPlanet?: (id: GrahaId) => void;
  houseMarks?: string[] | null;
  eclipses?: EclipseDot[] | null;
  drishti?: { ids: GrahaId[]; nodes: NodeDrishti } | null;
}) {
  const reduced = useReducedMotion();
  const [focus, setFocus] = useState<number | null>(null);
  const ids = drishti?.ids ?? [];
  const nodes = drishti?.nodes ?? "seventh";
  const hits = drishtiHits(bySign, ids, nodes);
  const active = focus !== null && hits.some((hit) => hit.sign === focus) ? focus : null;
  const seen = new Set<string>();
  const focused = hits.filter((hit) => {
    if (hit.sign !== active || seen.has(hit.id)) return false;
    seen.add(hit.id);
    return true;
  });
  const rays = buildRays(style, lagnaSign, bySign, ids, nodes, !!houseMarks);
  const overlay = <DrishtiLayer rays={rays} reduced={reduced} focus={active} />;
  const eyes = (
    <EyeLayer
      style={style}
      lagnaSign={lagnaSign}
      hits={hits}
      rays={rays}
      focus={active}
      onFocus={(sign) => setFocus((current) => (current === sign ? null : sign))}
    />
  );
  const note =
    active === null ? null : (
      <p className="px-1 pt-2 text-xs text-ink">
        {RASHIS[active]?.name}: {focused.map((hit) => `${GRAHA_NAME[hit.id]} ${hit.aspect}`).join(", ")}.
      </p>
    );
  if (style === "south") {
    return (
      <div>
      <svg viewBox="0 0 400 400" role="img" aria-label={label} data-kundli={mark} className="h-auto w-full">
        <rect x="0.5" y="0.5" width="399" height="399" fill="var(--color-card)" stroke="var(--color-ink)" />
        <rect x="100" y="100" width="200" height="200" fill="var(--color-paper)" stroke="var(--color-ink)" />
        {SOUTH.map(({ sign, col, row }) => {
          const planets = bySign[sign] ?? [];
          const isLagna = sign === lagnaSign;
          const lit = selectedSign === sign || planets.some((planet) => planet.id === selectedPlanet);
          const interactive = !!onPlanet && !houseMarks;
          const lines = [rashiMark(sign, isLagna), ...(houseMarks ? [houseMarks[sign] ?? ""] : interactive ? [] : planets.map(planetLabel))];
          const stack = 1 + (interactive ? planets.length : lines.length - 1);
          const size = stack > 4 ? 12 : 13;
          const step = 18;
          const start = row * 100 + (100 - stack * step) / 2 + 14;
          return (
            <g key={sign} onClick={() => onPick?.(sign)} style={{ cursor: onPick ? "pointer" : undefined }}>
              <clipPath id={`${mark}-south-${sign}`}>
                <rect x={col * 100 + 2} y={row * 100 + 2} width="96" height="96" />
              </clipPath>
              <rect
                x={col * 100}
                y={row * 100}
                width="100"
                height="100"
                fill={lit ? "rgb(240 193 78 / 0.16)" : isLagna ? "var(--color-paper-2)" : "var(--color-card)"}
                stroke={isLagna || lit ? "var(--color-seal)" : "var(--color-ink)"}
                strokeWidth={isLagna || lit ? 2.25 : 1}
              />
              <g clipPath={`url(#${mark}-south-${sign})`}>
                {lines.map((line, index) => (
                  <text
                    key={`${line}-${index}`}
                    x={col * 100 + 50}
                    y={start + index * step}
                    textAnchor="middle"
                    fontSize={size}
                    fontFamily="var(--font-sans)"
                    fill={lineFill(line.includes("Lg"))}
                  >
                    {line}
                  </text>
                ))}
                {interactive ? (
                  <PlanetMarks planets={planets} x={col * 100 + 50} top={start + step} step={step} size={size} selected={selectedPlanet} onPlanet={onPlanet} sign={sign} lagnaSign={lagnaSign} />
                ) : null}
              </g>
              <EclipseMarks dots={(eclipses ?? []).filter((dot) => dot.sign === sign)} x={col * 100 + 26} y={row * 100 + 88} />
            </g>
          );
        })}
        <text
          x="200"
          y="178"
          textAnchor="middle"
          fontSize="13"
          letterSpacing="2"
          fontFamily="var(--font-sans)"
          fill="var(--color-seal)"
        >
          {caption.toUpperCase()}
        </text>
        {headline ? (
          <text
            x="200"
            y="214"
            textAnchor="middle"
            fontSize="32"
            fontFamily="var(--font-display)"
            fill="var(--color-ink)"
          >
            {headline}
          </text>
        ) : null}
        <text
          x="200"
          y="240"
          textAnchor="middle"
          fontSize="14"
          fontFamily="var(--font-sans)"
          fill="var(--color-muted)"
        >
          {detail}
        </text>
        {overlay}
        {eyes}
      </svg>
      {note}
    </div>
    );
  }

  return (
    <div>
    <svg viewBox="0 0 400 400" role="img" aria-label={label} data-kundli={mark} className="h-auto w-full">
      <rect
        x="1"
        y="1"
        width="398"
        height="398"
        fill="var(--color-card)"
        stroke={mark === "transit" ? "rgb(237 196 81 / 0.4)" : "var(--color-ink)"}
        strokeWidth={mark === "transit" ? 1.25 : 1.5}
      />
      {NORTH.map((points, index) => {
        const scaled = points.map(([x, y]) => [x * 4, y * 4] as [number, number]);
        const sign = (lagnaSign + index) % 12;
        const planets = bySign[sign] ?? [];
        const [cx, cy] = centroid(scaled);
        const lit = selectedSign === sign || planets.some((planet) => planet.id === selectedPlanet);
        const interactive = !!onPlanet && !houseMarks;
        const lines = [rashiMark(sign, index === 0), ...(houseMarks ? [houseMarks[sign] ?? ""] : interactive ? [] : planets.map(planetLabel))];
        const stack = 1 + (interactive ? planets.length : Math.max(0, lines.length - 1));
        const spot = eclipseSpot(scaled, stack);
        const transit = mark === "transit";
        const crowded = stack > 4;
        const size = transit ? (crowded ? 11.5 : 13.5) : crowded ? 12 : 13;
        const step = transit ? (crowded ? 15.5 : 20) : 20;
        const top = cy - ((stack - 1) * step) / 2;
        return (
          <g key={index} onClick={() => onPick?.(sign)} style={{ cursor: onPick ? "pointer" : undefined }}>
            <clipPath id={`${mark}-north-${index}`}>
              <polygon points={scaled.map((point) => point.join(",")).join(" ")} />
            </clipPath>
            <polygon
              points={scaled.map((point) => point.join(",")).join(" ")}
              fill={lit ? "rgb(240 193 78 / 0.16)" : index === 0 ? "var(--color-paper-2)" : "var(--color-card)"}
              stroke={index === 0 || lit ? "var(--color-seal)" : "var(--color-ink)"}
              strokeWidth={index === 0 || lit ? 2.25 : 1.25}
            />
            <g clipPath={`url(#${mark}-north-${index})`}>
              {lines.map((line, lineIndex) => (
                <text
                  key={`${line}-${lineIndex}`}
                  x={cx}
                  y={top + lineIndex * step}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={lineIndex === 0 && transit ? size + 0.5 : size}
                  fontWeight={lineIndex === 0 && index === 0 ? 700 : transit ? 600 : undefined}
                  fontFamily="var(--font-sans)"
                  fill={
                    lineIndex === 0 && index === 0
                      ? "var(--color-seal)"
                      : transit && lineIndex === 0
                        ? "#e7d7b0"
                        : transit
                          ? "#f7f3ea"
                          : lineFill(false)
                  }
                >
                  {line}
                </text>
              ))}
              {interactive ? <PlanetMarks planets={planets} x={cx} top={top + step} step={step} size={size} selected={selectedPlanet} onPlanet={onPlanet} sign={sign} lagnaSign={lagnaSign} /> : null}
            </g>
            <EclipseMarks dots={(eclipses ?? []).filter((dot) => dot.sign === sign)} x={spot.x} y={spot.y} compact={spot.compact} />
          </g>
        );
      })}
      {overlay}
      {eyes}
    </svg>
    {note}
    </div>
  );
}
