import type { NodeMode } from "./constants";

export type JplTrueNode = {
  tropicalLongitude: number;
  sampledAt: string;
  retrievedAt: string;
  source: "NASA/JPL Horizons";
  apiVersion: string;
};

type HorizonsPayload = {
  signature?: { source?: string; version?: string };
  error?: string;
  result?: string;
};

type MoonSample = {
  rangeAu: number;
  longitude: number;
  latitude: number;
};

const DEG = Math.PI / 180;
const FIVE_MINUTES = 5 * 60_000;
const CACHE_TTL = 4 * 60_000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

let cached: { key: number; expiresAt: number; value: JplTrueNode } | null = null;
let pending: { key: number; promise: Promise<JplTrueNode> } | null = null;

function utcLabel(date: Date): string {
  const year = date.getUTCFullYear().toString().padStart(4, "0");
  const month = MONTHS[date.getUTCMonth()];
  const day = date.getUTCDate().toString().padStart(2, "0");
  const hour = date.getUTCHours().toString().padStart(2, "0");
  const minute = date.getUTCMinutes().toString().padStart(2, "0");
  const second = date.getUTCSeconds().toString().padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

function parseMoonSamples(result: string): MoonSample[] {
  const table = result.split("$$SOE")[1]?.split("$$EOE")[0];
  if (!table) throw new Error("JPL Horizons returned no ephemeris table.");

  const samples = table
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && line.includes(","))
    .map((line): MoonSample | null => {
      const cells = line.split(",").map((cell) => cell.trim());
      const values = cells.slice(1).map((cell) => Number(cell)).filter(Number.isFinite);
      // Quantity 20 returns geocentric range and range-rate; quantity 31
      // returns ecliptic-of-date longitude and latitude.
      if (values.length < 4) return null;
      const [rangeAu, , longitude, latitude] = values.slice(-4);
      if (
        !Number.isFinite(rangeAu) || rangeAu! <= 0 ||
        !Number.isFinite(longitude) || !Number.isFinite(latitude) ||
        latitude! < -90 || latitude! > 90
      ) return null;
      return { rangeAu: rangeAu!, longitude: longitude!, latitude: latitude! };
    })
    .filter((sample): sample is MoonSample => sample !== null);

  if (samples.length !== 3) throw new Error("JPL Horizons returned an unexpected Moon sample count.");
  return samples;
}

function vector(sample: MoonSample): [number, number, number] {
  const lon = sample.longitude * DEG;
  const lat = sample.latitude * DEG;
  const radius = sample.rangeAu;
  const cosLat = Math.cos(lat);
  return [
    radius * cosLat * Math.cos(lon),
    radius * cosLat * Math.sin(lon),
    radius * Math.sin(lat),
  ];
}

function ascendingNode(samples: MoonSample[]): number {
  const before = vector(samples[0]!);
  const center = vector(samples[1]!);
  const after = vector(samples[2]!);
  const velocity: [number, number, number] = [
    after[0] - before[0],
    after[1] - before[1],
    after[2] - before[2],
  ];

  // The ascending-node direction is k × h, where h = r × v and k is the
  // north pole of the ecliptic-of-date reference plane.
  let hx = center[1] * velocity[2] - center[2] * velocity[1];
  let hy = center[2] * velocity[0] - center[0] * velocity[2];
  const hz = center[0] * velocity[1] - center[1] * velocity[0];
  if (Math.hypot(hx, hy) < 1e-18 || Math.abs(hz) < 1e-18) {
    throw new Error("JPL Moon vectors do not define a stable orbital node.");
  }

  // Keep the lunar orbital angular momentum pointing north.
  if (hz < 0) {
    hx = -hx;
    hy = -hy;
  }
  const degrees = Math.atan2(hx, -hy) / DEG;
  return ((degrees % 360) + 360) % 360;
}

async function requestJplTrueNode(instant: Date): Promise<JplTrueNode> {
  const before = new Date(instant.getTime() - 60 * 60_000);
  const after = new Date(instant.getTime() + 60 * 60_000);
  const times = [before, instant, after].map((date) => `'${utcLabel(date)}'`).join(" ");

  const params = new URLSearchParams({
    format: "json",
    COMMAND: "'301'",
    OBJ_DATA: "'NO'",
    MAKE_EPHEM: "'YES'",
    EPHEM_TYPE: "'OBSERVER'",
    CENTER: "'500@399'",
    TLIST: times,
    TLIST_TYPE: "'CAL'",
    TIME_TYPE: "'UT'",
    QUANTITIES: "'20,31'",
    RANGE_UNITS: "'AU'",
    ANG_FORMAT: "'DEG'",
    TIME_DIGITS: "'SECONDS'",
    CSV_FORMAT: "'YES'",
  });

  const response = await fetch(`https://ssd.jpl.nasa.gov/api/horizons.api?${params.toString()}`, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(12_000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`JPL Horizons returned HTTP ${response.status}.`);

  const payload = (await response.json()) as HorizonsPayload;
  if (payload.error) throw new Error(`JPL Horizons: ${payload.error}`);
  if (!payload.signature?.source?.includes("NASA/JPL Horizons") || !payload.signature.version) {
    throw new Error("JPL Horizons returned an unrecognized API signature.");
  }
  if (!payload.result) throw new Error("JPL Horizons returned an empty result.");

  return {
    tropicalLongitude: ascendingNode(parseMoonSamples(payload.result)),
    sampledAt: instant.toISOString(),
    retrievedAt: new Date().toISOString(),
    source: "NASA/JPL Horizons",
    apiVersion: payload.signature.version,
  };
}

export async function getJplTrueNode(instant: Date): Promise<JplTrueNode> {
  if (!(instant instanceof Date) || !Number.isFinite(instant.getTime())) {
    throw new Error("A valid ephemeris date is required.");
  }

  const key = Math.floor(instant.getTime() / FIVE_MINUTES) * FIVE_MINUTES;
  const sampledAt = new Date(key);
  if (cached && cached.key === key && cached.expiresAt > Date.now()) return cached.value;
  if (pending?.key === key) return pending.promise;

  const promise = requestJplTrueNode(sampledAt)
    .then((value) => {
      cached = { key, expiresAt: Date.now() + CACHE_TTL, value };
      return value;
    })
    .finally(() => {
      if (pending?.key === key) pending = null;
    });
  pending = { key, promise };
  return promise;
}
