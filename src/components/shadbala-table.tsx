import { useMemo } from "react";
import type { SkySnapshot } from "@/lib/astro/calc";
import { shadbala, type ShadbalaRow } from "@/lib/astro/shadbala";

function gradeClass(grade: ShadbalaRow["grade"]): string {
  return grade === "Average" || grade === "Weak" || grade === "Bad" ? "text-muted" : "text-seal";
}

export function ShadbalaTable({ sky, when, timeZone, title }: { sky: SkySnapshot; when: Date; timeZone: string; title: string }) {
  const minute = Math.floor(when.getTime() / 60_000);
  const lagnaKey = Math.round(sky.lagna);
  const rows = useMemo(() => shadbala(sky, when, timeZone), [minute, timeZone, sky.ayanamsaId, sky.nodeMode, lagnaKey]);
  return (
    <section className="mt-4 min-w-0 border border-line bg-card">
      <div className="px-4 py-3">
        <h3 className="font-display text-3xl leading-none">{title}</h3>
        <p className="mt-2 text-sm text-muted">
          Six strengths in virupas. One rupa is 60 virupas. The word under each graha is its total against the classical minimum: Excellent from 150%, Strong from 125%, Good at the minimum, then Average, Weak, and Bad. Rahu and Ketu are outside this system.
        </p>
      </div>
      <div className="overflow-x-auto" data-no-swipe>
        <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-y border-line text-xs uppercase tracking-widest text-muted">
              <th className="px-3 py-2 font-semibold">Graha</th>
              <th className="px-3 py-2 font-semibold">Sthana</th>
              <th className="px-3 py-2 font-semibold">Dig</th>
              <th className="px-3 py-2 font-semibold">Kala</th>
              <th className="px-3 py-2 font-semibold">Chesta</th>
              <th className="px-3 py-2 font-semibold">Nais.</th>
              <th className="px-3 py-2 font-semibold">Drik</th>
              <th className="px-3 py-2 font-semibold">Total</th>
              <th className="px-3 py-2 font-semibold">Rupas</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-line">
                <th className="px-3 py-2 text-left font-medium">
                  {row.name}
                  <span className={`mt-0.5 block text-xs font-normal ${gradeClass(row.grade)}`}>{row.grade}</span>
                </th>
                <td className="px-3 py-2 tabular-nums">{row.sthana}</td>
                <td className="px-3 py-2 tabular-nums">{row.dig}</td>
                <td className="px-3 py-2 tabular-nums">{row.kala}</td>
                <td className="px-3 py-2 tabular-nums">{row.chesta}</td>
                <td className="px-3 py-2 tabular-nums">{row.naisargika}</td>
                <td className="px-3 py-2 tabular-nums">{row.drik}</td>
                <td className="px-3 py-2 tabular-nums">{row.total}</td>
                <td className="px-3 py-2 tabular-nums">{row.rupas}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
