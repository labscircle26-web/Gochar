import { useState } from "react";
import { KundliChart } from "@/components/kundli-chart";
import { GRAHA_ABBR, GRAHA_NAME, RASHIS } from "@/lib/astro/constants";
import { BINDU_TOTAL, SAPTA, SAV_TOTAL, type Ashtakavarga } from "@/lib/astro/ashtakavarga";

type Sapta = (typeof SAPTA)[number];
type View = "sarva" | Sapta;

const VIEWS: { id: View; label: string }[] = [
  { id: "sarva", label: "SAV" },
  ...SAPTA.map((id) => ({ id, label: GRAHA_ABBR[id] })),
];

export function AshtakavargaPanel({
  chart,
  lagnaSign,
  transits,
  note,
}: {
  chart: Ashtakavarga;
  lagnaSign: number;
  transits: { id: Sapta; sign: number }[];
  note: string;
}) {
  const [view, setView] = useState<View>("sarva");
  const [openSign, setOpenSign] = useState<number | null>(null);
  const row = view === "sarva" ? chart.sarva : chart.bhinna[view];
  const total = row.reduce((sum, value) => sum + value, 0);
  const expected = view === "sarva" ? SAV_TOTAL : BINDU_TOTAL[view];
  const average = view === "sarva" ? SAV_TOTAL / 12 : BINDU_TOTAL[view] / 12;
  const peak = Math.max(...row, 1);
  const empty = Array.from({ length: 12 }, () => []);

  return (
    <section className="mt-4 min-w-0 border border-line bg-card">
      <div className="px-4 py-3">
        <h3 className="font-display text-3xl leading-none">Ashtakavarga</h3>
        <p className="mt-2 text-sm text-muted">
          Parashara bindus. Each bhinna row is the seven grahas plus lagna. Sarva adds the seven rows. A bhinna of 4 or more is the usual line for a transit through that sign. Sarva averages 28.
        </p>
      </div>
      <div className="flex flex-wrap gap-2 px-4" data-no-swipe>
        {VIEWS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={view === item.id ? "h-9 rounded-md bg-seal px-3 text-sm font-semibold text-seal-ink" : "h-9 rounded-md border border-line px-3 text-sm text-ink"}
            onClick={() => setView(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <p className="px-4 pt-3 text-sm text-ink">
        {view === "sarva" ? "Sarvashtakavarga" : `${GRAHA_NAME[view]} bhinnashtakavarga`} · {total} bindus
        {total === expected ? "" : ` · expected ${expected}`}
      </p>
      <div className="mx-auto max-w-xs px-4 py-3">
        <KundliChart
          style="north"
          lagnaSign={lagnaSign}
          bySign={empty}
          caption={view === "sarva" ? "SAV" : GRAHA_ABBR[view]}
          headline=""
          detail={`${total}`}
          label={view === "sarva" ? "Sarvashtakavarga" : `${GRAHA_NAME[view]} bhinnashtakavarga`}
          mark="bindu"
          houseMarks={row.map(String)}
        />
      </div>
      <div className="overflow-x-auto" data-no-swipe>
        <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-y border-line text-xs uppercase tracking-widest text-muted">
              <th className="px-3 py-2 font-semibold">Sign</th>
              <th className="px-3 py-2 font-semibold">Bindus</th>
              <th className="px-3 py-2 font-semibold">Against average</th>
              <th className="px-3 py-2 font-semibold">Transiting</th>
            </tr>
          </thead>
          <tbody>
            {RASHIS.map((sign, index) => {
              const value = row[index] ?? 0;
              const here = transits.filter((graha) => graha.sign === index);
              const open = openSign === index;
              return (
                <tr key={sign.name} className="border-b border-line">
                  <th className="px-3 py-2 text-left font-medium">
                    <button type="button" className="text-left" onClick={() => setOpenSign(open ? null : index)}>
                      {sign.name}
                      <span className="mt-0.5 block text-xs font-normal text-muted">{open ? "Hide houses" : "Bhinnas"}</span>
                    </button>
                  </th>
                  <td className="px-3 py-2 tabular-nums">
                    {value}
                    <span className="mt-1 block h-1.5 w-16 bg-paper">
                      <span className={`block h-full ${value >= average ? "bg-seal" : "bg-muted"}`} style={{ width: `${(value / peak) * 100}%` }} />
                    </span>
                  </td>
                  <td className="px-3 py-2 text-muted">{value >= average ? "Above" : "Below"}</td>
                  <td className="px-3 py-2">
                    {here.length === 0 ? "—" : here.map((graha) => GRAHA_ABBR[graha.id]).join(" ")}
                    {open ? (
                      <span className="mt-1 block text-xs text-muted">
                        {SAPTA.map((id) => `${GRAHA_ABBR[id]} ${chart.bhinna[id][index] ?? 0}`).join(" · ")} · SAV {chart.sarva[index] ?? 0}
                      </span>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-3">
        <h4 className="text-xs font-semibold uppercase tracking-widest text-seal">Transit through these bindus</h4>
        <p className="mt-1 text-sm text-muted">{note}</p>
        <ul className="mt-2 grid gap-2">
          {transits.map((graha) => {
            const bav = chart.bhinna[graha.id][graha.sign] ?? 0;
            const sav = chart.sarva[graha.sign] ?? 0;
            return (
              <li key={graha.id} className="text-sm text-ink">
                {GRAHA_NAME[graha.id]} in {RASHIS[graha.sign]?.name}: BAV {bav}, SAV {sav}. {bav >= 4 ? "Bhinna holds" : "Bhinna is thin"} · SAV {sav >= 28 ? "above" : "below"} average.
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
