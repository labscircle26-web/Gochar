import { useEffect, useMemo, useState } from "react";
import { GRAHA_ABBR, GRAHA_NAME, NAKSHATRAS, RASHIS, type AyanamsaId, type GrahaId, type NodeMode } from "@/lib/astro/constants";
import {
  computeSky,
  houseFrom,
  nakshatraIndex,
  padaOf,
  signIndex,
  vimshottari,
  type SkySnapshot,
} from "@/lib/astro/calc";
import { formatDms, formatGap } from "@/lib/astro/format";
import { exactContacts, moonHouseNote, sadeSatiPhase } from "@/lib/astro/reading";
import { formatStamp, zonedToUtc } from "@/lib/astro/time";
import { KundliChart, type ChartPlanet } from "@/components/kundli-chart";
import { PlaceFields, type PlaceValue } from "@/components/place-fields";

export type Janma = PlaceValue & {
  name: string;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

const fieldClass = "h-11 w-full rounded-md border border-line bg-card px-3 text-sm text-ink";
const SLOW: GrahaId[] = ["saturn", "jupiter", "rahu", "ketu"];

function bySign(sky: SkySnapshot): ChartPlanet[][] {
  const signs: ChartPlanet[][] = Array.from({ length: 12 }, () => []);
  for (const graha of sky.grahas) {
    signs[signIndex(graha.lon)]?.push({ id: graha.id, retro: graha.retro });
  }
  return signs;
}

export function JanmaPanel({
  janma,
  onSave,
  onClear,
  transit,
  instant,
  viewZone,
  ayanamsa,
  nodeMode,
  seedPlace,
}: {
  janma: Janma | null;
  onSave: (janma: Janma) => void;
  onClear: () => void;
  transit: SkySnapshot;
  instant: Date;
  viewZone: string;
  ayanamsa: AyanamsaId;
  nodeMode: NodeMode;
  seedPlace: PlaceValue;
}) {
  const [draft, setDraft] = useState<Janma>(
    () =>
      janma ?? {
        name: "",
        ...seedPlace,
        year: 1990,
        month: 1,
        day: 1,
        hour: 12,
        minute: 0,
        second: 0,
      },
  );
  const [editing, setEditing] = useState(janma === null);
  useEffect(() => {
    if (!janma) setEditing(true);
  }, [janma]);

  const natal = useMemo(() => {
    if (!janma) return null;
    try {
      const birth = zonedToUtc(
        janma.year,
        janma.month,
        janma.day,
        janma.hour,
        janma.minute,
        janma.second,
        janma.tz,
      );
      const sky = computeSky(birth, janma.lat, janma.lon, janma.tz, ayanamsa, nodeMode);
      return { birth, sky };
    } catch {
      return null;
    }
  }, [janma, ayanamsa, nodeMode]);

  const dasha = natal ? vimshottari(natal.birth, natal.sky.grahas.find((g) => g.id === "moon")!.lon, instant) : null;
  const natalMoon = natal?.sky.grahas.find((g) => g.id === "moon");
  const natalLagna = natal?.sky.lagna ?? 0;
  const saturn = transit.grahas.find((g) => g.id === "saturn");
  const sati =
    natalMoon && saturn ? sadeSatiPhase(signIndex(saturn.lon), signIndex(natalMoon.lon)) : null;

  const contacts = natal
    ? exactContacts(transit.grahas, [
        { label: "natal lagna", lon: natal.sky.lagna },
        ...natal.sky.grahas.filter((g) => g.id !== "ketu").map((g) => ({
          label: `natal ${GRAHA_NAME[g.id]}`,
          lon: g.lon,
        })),
      ])
    : [];

  return (
    <section className="mt-8 border border-line bg-card p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-3xl leading-none">Your janma</h2>
          <p className="mt-2 max-w-xl text-sm text-muted">
            Optional. Reads today’s sky from your lagna and Moon, and times Vimshottari dasha at the moment you picked. Saved only on this device.
          </p>
        </div>
        {janma && !editing && (
          <div className="flex gap-2">
            <button type="button" className="h-11 rounded-md border border-line bg-card px-3 text-sm font-medium hover:bg-paper-2" onClick={() => setEditing(true)}>
              Edit
            </button>
            <button type="button" className="h-11 rounded-md border border-line bg-card px-3 text-sm font-medium hover:bg-paper-2" onClick={onClear}>
              Clear
            </button>
          </div>
        )}
      </div>

      {editing && (
        <form
          className="mt-5 grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSave(draft);
            setEditing(false);
          }}
        >
          <label className="grid gap-1 text-xs font-semibold uppercase tracking-widest text-muted">
            Name
            <input
              className={fieldClass}
              value={draft.name}
              placeholder="Optional"
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-xs font-semibold uppercase tracking-widest text-muted">
              Birth date
              <input
                type="date"
                required
                className={fieldClass}
                value={`${String(draft.year).padStart(4, "0")}-${String(draft.month).padStart(2, "0")}-${String(draft.day).padStart(2, "0")}`}
                onChange={(event) => {
                  const [year, month, day] = event.target.value.split("-").map(Number);
                  if (year && month && day) setDraft({ ...draft, year, month, day });
                }}
              />
            </label>
            <label className="grid gap-1 text-xs font-semibold uppercase tracking-widest text-muted">
              Birth time
              <input
                type="time"
                step={1}
                required
                className={fieldClass}
                value={`${String(draft.hour).padStart(2, "0")}:${String(draft.minute).padStart(2, "0")}:${String(draft.second).padStart(2, "0")}`}
                onChange={(event) => {
                  const [hour, minute, second] = event.target.value.split(":").map(Number);
                  if (Number.isFinite(hour) && Number.isFinite(minute)) {
                    setDraft({ ...draft, hour: hour ?? 0, minute: minute ?? 0, second: second ?? 0 });
                  }
                }}
              />
            </label>
          </div>
          <PlaceFields
            idPrefix="janma"
            place={draft}
            onChange={(place) => setDraft({ ...draft, ...place })}
          />
          <div className="flex flex-wrap gap-2">
            <button type="button" className="h-11 rounded-md border border-line px-3 text-sm font-medium hover:bg-paper-2" onClick={() => setDraft({ ...draft, ...seedPlace })}>
              Copy sky place
            </button>
            <button type="submit" className="h-11 rounded-md bg-seal px-4 text-sm font-semibold text-seal-ink">
              Save birth details
            </button>
            {janma && (
              <button type="button" className="h-11 rounded-md px-3 text-sm text-muted" onClick={() => setEditing(false)}>
                Cancel
              </button>
            )}
          </div>
        </form>
      )}

      {janma && natal && natalMoon && !editing && (
        <div className="mt-6 grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <div>
            <KundliChart
              style="south"
              lagnaSign={signIndex(natal.sky.lagna)}
              bySign={bySign(natal.sky)}
              caption="Janma"
              headline={RASHIS[signIndex(natal.sky.lagna)]?.abbr ?? ""}
              detail={formatDms(natal.sky.lagna % 30, true)}
              label={`Birth chart. Lagna ${RASHIS[signIndex(natal.sky.lagna)]?.name ?? ""}.`}
              mark="janma"
            />
            <p className="mt-2 text-center text-sm text-muted">
              {janma.name ? `${janma.name} · ` : ""}
              {RASHIS[signIndex(natal.sky.lagna)]?.sanskrit} lagna
            </p>
          </div>
          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="Natal lagna" value={`${RASHIS[signIndex(natalLagna)]?.name} ${formatDms(natalLagna % 30, true)}`} />
              <Stat
                label="Natal Moon"
                value={`${RASHIS[signIndex(natalMoon.lon)]?.name} · ${NAKSHATRAS[nakshatraIndex(natalMoon.lon)]} ${padaOf(natalMoon.lon)}`}
              />
              <Stat
                label="Natal Sun"
                value={`${RASHIS[signIndex(natal.sky.grahas.find((g) => g.id === "sun")!.lon)]?.name}`}
              />
            </div>
            {sati && (
              <p className="border border-line bg-paper px-3 py-3 text-sm">
                <span className="font-semibold text-seal">Sade Sati · {sati}.</span>{" "}
                Saturn is {sati === "opening" ? "in the 12th" : sati === "peak" ? "on" : "in the 2nd"} from your natal Moon.
              </p>
            )}
            {dasha ? (
              <div className="border border-line bg-paper px-3 py-3 text-sm">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted">Vimshottari at this moment</p>
                <p className="mt-1">
                  <span className="font-semibold">{GRAHA_NAME[dasha.mahadasha.lord]}</span> mahadasha until{" "}
                  <span className="tabular-nums">{formatStamp(dasha.mahadasha.end, viewZone)}</span>
                </p>
                <p>
                  <span className="font-semibold">
                    {GRAHA_NAME[dasha.mahadasha.lord]}–{GRAHA_NAME[dasha.antardasha.lord]}
                  </span>{" "}
                  until <span className="tabular-nums">{formatStamp(dasha.antardasha.end, viewZone)}</span>
                </p>
                <p className="text-muted">
                  {GRAHA_NAME[dasha.pratyantar.lord]} pratyantar until{" "}
                  <span className="tabular-nums">{formatStamp(dasha.pratyantar.end, viewZone)}</span>
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted">The chosen moment is before this birth time, so dasha is not running yet.</p>
            )}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
                <caption className="mb-2 text-left text-xs font-semibold uppercase tracking-widest text-muted">
                  Gochar from your chart
                </caption>
                <thead>
                  <tr className="border-b border-line text-xs uppercase tracking-widest text-muted">
                    <th className="py-2 pr-3 font-semibold">Graha</th>
                    <th className="py-2 pr-3 font-semibold">From lagna</th>
                    <th className="py-2 pr-3 font-semibold">From Moon</th>
                    <th className="py-2 font-semibold">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {transit.grahas.map((graha) => {
                    const sign = signIndex(graha.lon);
                    const fromLagna = houseFrom(sign, signIndex(natalLagna));
                    const fromMoon = houseFrom(sign, signIndex(natalMoon.lon));
                    return (
                      <tr key={graha.id} className="border-b border-line">
                        <td className="py-2 pr-3 font-medium">
                          {GRAHA_ABBR[graha.id]}
                          {graha.retro ? <span className="text-seal"> R</span> : null}
                        </td>
                        <td className="py-2 pr-3 tabular-nums">{fromLagna}</td>
                        <td className="py-2 pr-3 tabular-nums">{fromMoon}</td>
                        <td className="py-2 text-muted">
                          {SLOW.includes(graha.id) ? moonHouseNote(graha.id, sign, signIndex(natalMoon.lon)) : ""}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted">Exact contacts within 1°</p>
              {contacts.length === 0 ? (
                <p className="mt-1 text-sm text-muted">None at this moment.</p>
              ) : (
                <ul className="mt-1 grid gap-1 text-sm">
                  {contacts.slice(0, 8).map((contact) => (
                    <li key={`${contact.transit}-${contact.natal}`}>
                      {GRAHA_NAME[contact.transit]} on {contact.natal}
                      <span className="tabular-nums text-muted"> · {formatGap(contact.gap)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-line bg-paper px-3 py-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted">{label}</p>
      <p className="mt-1 text-sm">{value}</p>
    </div>
  );
}
