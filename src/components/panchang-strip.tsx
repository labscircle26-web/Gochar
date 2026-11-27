import { norm, type SkySnapshot } from "@/lib/astro/calc";
import { VARAS, VARA_ENGLISH } from "@/lib/astro/constants";
import { formatClock } from "@/lib/astro/time";

const VARA_GLOW = ["#f0c14e", "#f7f4ee", "#e07050", "#8fd0a4", "#e6c56b", "#f0c8bc", "#b7c4d6"];

const NAKSHATRA_SHAPES: [number, number][][] = [
  [[22, 30], [40, 16], [58, 32]],
  [[24, 22], [42, 34], [60, 20]],
  [[28, 28], [36, 22], [44, 30], [52, 20], [60, 28], [40, 36]],
  [[30, 34], [48, 18], [62, 36]],
  [[20, 24], [36, 18], [52, 22], [66, 34]],
  [[26, 18], [44, 28], [62, 16]],
  [[22, 32], [40, 16], [58, 32], [40, 36]],
  [[30, 18], [46, 30], [62, 18]],
  [[24, 20], [34, 32], [46, 24], [58, 34], [68, 20]],
  [[28, 34], [46, 16], [64, 30]],
  [[22, 22], [38, 18], [54, 28], [68, 22]],
  [[26, 30], [44, 18], [62, 32]],
  [[20, 26], [36, 16], [52, 26], [68, 18]],
  [[30, 20], [42, 32], [54, 18], [66, 32]],
  [[24, 18], [48, 18], [36, 34], [60, 34]],
  [[22, 32], [40, 20], [58, 18], [70, 32]],
  [[28, 16], [40, 28], [52, 16], [64, 30]],
  [[26, 34], [44, 22], [62, 34], [44, 14]],
  [[20, 20], [34, 32], [50, 18], [66, 30]],
  [[32, 16], [32, 34], [50, 24], [68, 34]],
  [[24, 28], [40, 16], [56, 28], [48, 36]],
  [[22, 18], [38, 30], [54, 16], [70, 28]],
  [[30, 32], [44, 18], [58, 32], [72, 18]],
  [[26, 16], [40, 28], [54, 16], [68, 30], [40, 36]],
  [[20, 30], [36, 16], [52, 30], [68, 16]],
  [[28, 22], [44, 34], [60, 18], [48, 14]],
  [[24, 18], [42, 30], [60, 16], [70, 32]],
];

function starsFor(index: number): [number, number][] {
  return NAKSHATRA_SHAPES[index] ?? NAKSHATRA_SHAPES[0]!;
}

function MoonPhase({ elongation }: { elongation: number }) {
  const turn = norm(elongation);
  const waxing = turn <= 180;
  const lit = waxing ? turn / 180 : (360 - turn) / 180;
  const r = 11;
  const shift = (waxing ? -1 : 1) * lit * r * 2;
  return (
    <svg viewBox="0 0 88 56" className="h-full w-full" aria-hidden>
      <defs>
        <clipPath id="tithi-moon">
          <circle cx="62" cy="28" r={r} />
        </clipPath>
      </defs>
      <circle cx="62" cy="28" r="16" fill="#f7f4ee" opacity="0.08" className="panchang-pulse" />
      <circle cx="62" cy="28" r={r} fill="#4a5164" />
      <g clipPath="url(#tithi-moon)">
        <circle cx="62" cy="28" r={r} fill="#f6f1e6" />
        <circle cx={62 + shift} cy="28" r={r} fill="#4a5164" />
      </g>
    </svg>
  );
}

function VaraArt({ index }: { index: number }) {
  const glow = VARA_GLOW[index] ?? "#f0c14e";
  return (
    <svg viewBox="0 0 88 56" className="h-full w-full" aria-hidden>
      <circle cx="64" cy="28" r="16" fill={glow} opacity="0.22" className="panchang-pulse" />
      <g className="panchang-orbit" style={{ transformOrigin: "64px 28px" }}>
        <circle cx="64" cy="28" r="12" fill="none" stroke={glow} strokeOpacity="0.7" />
        <circle cx="76" cy="28" r="2.4" fill={glow} />
      </g>
      <circle cx="64" cy="28" r="3.4" fill={glow} />
    </svg>
  );
}

function NakshatraArt({ index }: { index: number }) {
  const stars = starsFor(index);
  return (
    <svg viewBox="0 0 88 56" className="h-full w-full" aria-hidden>
      <g className="panchang-drift">
        {stars.map(([x, y], i) => (
          <circle key={i} cx={x + 8} cy={y + 6} r={i === 0 ? 1.7 : 1} fill="#f7f4ee" opacity={i === 0 ? 0.95 : 0.55} />
        ))}
        <polyline
          points={stars.map(([x, y]) => `${x + 8},${y + 6}`).join(" ")}
          fill="none"
          stroke="#f0c14e"
          strokeOpacity="0.35"
        />
      </g>
    </svg>
  );
}

function YogaArt() {
  return (
    <svg viewBox="0 0 88 56" className="h-full w-full" aria-hidden>
      <g className="panchang-orbit" style={{ transformOrigin: "64px 28px" }}>
        <circle cx="64" cy="28" r="14" fill="none" stroke="#f0c14e" strokeOpacity="0.45" />
        <circle cx="78" cy="28" r="2" fill="#f0c14e" />
      </g>
      <g className="panchang-orbit-slow" style={{ transformOrigin: "64px 28px" }}>
        <circle cx="64" cy="28" r="8" fill="none" stroke="#f7f4ee" strokeOpacity="0.5" />
        <circle cx="72" cy="28" r="1.6" fill="#f7f4ee" />
      </g>
    </svg>
  );
}

function KaranaArt({ index }: { index: number }) {
  const sides = 3 + (index % 5);
  const points = Array.from({ length: sides }, (_, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / sides;
    return `${64 + Math.cos(a) * 12},${28 + Math.sin(a) * 12}`;
  }).join(" ");
  return (
    <svg viewBox="0 0 88 56" className="h-full w-full" aria-hidden>
      <g className="panchang-orbit-slow" style={{ transformOrigin: "64px 28px" }}>
        <polygon points={points} fill="none" stroke="#d7c4a1" strokeOpacity="0.7" />
        <path d="M52 28 A12 12 0 0 1 76 28" fill="none" stroke="#f0c14e" strokeOpacity="0.8" />
      </g>
    </svg>
  );
}

function SunriseArt({ altitude }: { altitude: number }) {
  const y = 40 - altitude * 24;
  return (
    <svg viewBox="0 0 88 56" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="dawn" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#f0c14e" stopOpacity={0.18 + altitude * 0.35} />
          <stop offset="55%" stopColor="#c45c3e" stopOpacity={0.12 + altitude * 0.2} />
          <stop offset="100%" stopColor="#101624" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="40" y="0" width="48" height="56" fill="url(#dawn)" />
      <line x1="44" y1="40" x2="86" y2="40" stroke="#efe6d6" strokeOpacity="0.35" />
      <g className="panchang-rise">
        <circle cx="66" cy={y} r="5" fill="#f0c14e" />
        <circle cx="66" cy={y} r="9" fill="#f0c14e" opacity="0.25" className="panchang-pulse" />
      </g>
    </svg>
  );
}

export function PanchangStrip({ sky, timeZone, instant }: { sky: SkySnapshot; timeZone: string; instant: Date }) {
  const beforeSunrise = !!sky.panchang.sunrise && instant.getTime() < sky.panchang.sunrise.getTime();
  const sun = sky.grahas.find((graha) => graha.id === "sun");
  const moon = sky.grahas.find((graha) => graha.id === "moon");
  const elongation = sun && moon ? norm(moon.lon - sun.lon) : sky.panchang.tithi.index * 12;
  const rise = sky.panchang.sunrise?.getTime();
  const set = sky.panchang.sunset?.getTime();
  let altitude = 0.08;
  if (rise && set && set > rise) {
    if (instant.getTime() < rise || instant.getTime() > set) altitude = 0.02;
    else altitude = Math.sin(Math.PI * ((instant.getTime() - rise) / (set - rise)));
  }
  const items = [
    {
      label: "Vara",
      value: VARAS[sky.panchang.vara] ?? "Ravivara",
      note: beforeSunrise && sky.panchang.sunrise ? `until sunrise ${formatClock(sky.panchang.sunrise, timeZone)}` : (VARA_ENGLISH[sky.panchang.vara] ?? ""),
      art: <VaraArt index={sky.panchang.vara} />,
    },
    {
      label: "Tithi",
      value: `${sky.panchang.tithi.paksha ?? ""} ${sky.panchang.tithi.name}`.trim(),
      note: sky.panchang.tithi.ends ? `until ${formatClock(sky.panchang.tithi.ends, timeZone)}` : "",
      art: <MoonPhase elongation={elongation} />,
    },
    {
      label: "Nakshatra",
      value: sky.panchang.nakshatra.name,
      note: sky.panchang.nakshatra.ends ? `until ${formatClock(sky.panchang.nakshatra.ends, timeZone)}` : "",
      art: <NakshatraArt index={sky.panchang.nakshatra.index} />,
    },
    {
      label: "Yoga",
      value: sky.panchang.yoga.name,
      note: sky.panchang.yoga.ends ? `until ${formatClock(sky.panchang.yoga.ends, timeZone)}` : "",
      art: <YogaArt />,
    },
    {
      label: "Karana",
      value: sky.panchang.karana.name,
      note: sky.panchang.karana.ends ? `until ${formatClock(sky.panchang.karana.ends, timeZone)}` : "",
      art: <KaranaArt index={sky.panchang.karana.index} />,
    },
    {
      label: "Sunrise",
      value: sky.panchang.sunrise ? formatClock(sky.panchang.sunrise, timeZone) : "—",
      note: sky.panchang.sunset ? `set ${formatClock(sky.panchang.sunset, timeZone)}` : "local civil day",
      art: <SunriseArt altitude={altitude} />,
    },
  ];
  return (
    <dl className="grid min-w-0 grid-cols-2 gap-px border border-line bg-line">
      {items.map((item) => (
        <div key={item.label} className="relative min-w-0 overflow-hidden bg-card">
          <div className="pointer-events-none absolute inset-y-0 right-0 w-[46%]">{item.art}</div>
          <div className="relative bg-gradient-to-r from-card via-card/92 to-card/35 px-3 py-3">
            <dt className="text-xs font-semibold uppercase tracking-widest text-muted">{item.label}</dt>
            <dd className="mt-1 break-words text-sm font-medium">{item.value}</dd>
            <dd className="break-words text-xs tabular-nums text-muted">{item.note}</dd>
          </div>
        </div>
      ))}
    </dl>
  );
}
