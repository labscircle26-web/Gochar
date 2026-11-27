import { useEffect, useId, useRef, useState } from "react";
import { GoldMenu } from "@/components/gold-menu";
import { GRAHA_IDS, GRAHA_NAME, type GrahaId } from "@/lib/astro/constants";
import { DRISHTI_COLOR, NODE_DRISHTI_OPTIONS, type NodeDrishti } from "@/lib/astro/drishti";

const ORDER: GrahaId[] = ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn", "rahu", "ketu"];

function sameIds(a: GrahaId[], b: GrahaId[]): boolean {
  if (a.length !== b.length) return false;
  const chosen = new Set(b);
  return a.every((id) => chosen.has(id));
}

export function useDrishti(storageKey: string): {
  ids: GrahaId[];
  nodes: NodeDrishti;
  setIds: (ids: GrahaId[]) => void;
  setNodes: (nodes: NodeDrishti) => void;
} {
  const [ids, setIds] = useState<GrahaId[]>([]);
  const [nodes, setNodes] = useState<NodeDrishti>("seventh");
  const skipSave = useRef(true);
  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(storageKey) ?? "null") as { ids?: unknown; nodes?: unknown } | null;
      if (raw && Array.isArray(raw.ids)) {
        setIds(raw.ids.filter((id): id is GrahaId => GRAHA_IDS.includes(id as GrahaId)));
      }
      if (raw?.nodes === "seventh" || raw?.nodes === "trine" || raw?.nodes === "saturn") setNodes(raw.nodes);
    } catch {
      /* keep the empty selection */
    }
  }, [storageKey]);
  useEffect(() => {
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }
    localStorage.setItem(storageKey, JSON.stringify({ ids, nodes }));
  }, [storageKey, ids, nodes]);
  return { ids, nodes, setIds, setNodes };
}

export function DrishtiMenu({
  appliedIds,
  appliedNodes,
  onApply,
  note,
  compact = false,
}: {
  appliedIds: GrahaId[];
  appliedNodes: NodeDrishti;
  onApply: (ids: GrahaId[], nodes: NodeDrishti) => void;
  note?: string | null;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draftIds, setDraftIds] = useState<GrahaId[]>(appliedIds);
  const [draftNodes, setDraftNodes] = useState<NodeDrishti>(appliedNodes);
  const [edited, setEdited] = useState(false);
  const radio = useId();
  const dirty = !sameIds(draftIds, appliedIds) || draftNodes !== appliedNodes;
  const showing = ORDER.filter((id) => appliedIds.includes(id));
  const summary = showing.length === 0 ? "None on the chart" : showing.length <= 2 ? showing.map((id) => GRAHA_NAME[id]).join(", ") : `${showing.length} grahas on the chart`;

  useEffect(() => {
    if (!edited) {
      setDraftIds(appliedIds);
      setDraftNodes(appliedNodes);
    }
  }, [appliedIds, appliedNodes, edited]);

  function toggle(id: GrahaId) {
    setEdited(true);
    setDraftIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function apply() {
    onApply(draftIds, draftNodes);
    setEdited(false);
    setOpen(false);
  }

  return (
    <GoldMenu
      className={compact ? "gochar-gold-control" : "gochar-gold-control mx-auto mt-3 max-w-xl"}
      label="Aspects / Drishti"
      summary={`${summary}${edited && dirty ? " · not applied" : ""}`}
      open={open}
      onOpenChange={setOpen}
      footer={
        <button
          type="button"
          className="h-11 w-full rounded-md bg-[#f0c14e] text-sm font-semibold text-[#1c1406] disabled:opacity-45"
          disabled={!dirty}
          onClick={apply}
        >
          Apply
        </button>
      }
    >
      <div className="flex gap-3 px-1 pb-2">
        <button
          type="button"
          className="text-xs font-semibold uppercase tracking-widest text-seal"
          onClick={() => {
            setEdited(true);
            setDraftIds([...ORDER]);
          }}
        >
          Select all
        </button>
        <button
          type="button"
          className="text-xs font-semibold uppercase tracking-widest text-muted"
          onClick={() => {
            setEdited(true);
            setDraftIds([]);
          }}
        >
          Clear all
        </button>
        {edited && dirty ? <span className="ml-auto text-xs text-seal">Not applied</span> : null}
      </div>
      <ul className={`grid gap-1 ${compact ? "grid-cols-1" : "grid-cols-2 sm:grid-cols-3"}`}>
        {ORDER.map((id) => {
          const on = draftIds.includes(id);
          return (
            <li key={id}>
              <button type="button" aria-pressed={on} className="flex h-10 w-full items-center gap-2 px-1 text-left text-sm text-ink" onClick={() => toggle(id)}>
                <span
                  className="inline-flex h-4 w-4 shrink-0 items-center justify-center border text-xs"
                  style={{ borderColor: DRISHTI_COLOR[id], background: on ? DRISHTI_COLOR[id] : "transparent", color: "#1c1406" }}
                >
                  {on ? "✓" : ""}
                </span>
                <span className="truncate">{GRAHA_NAME[id]}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <fieldset className="mt-2 border-t border-line px-1 pt-2">
        <legend className="text-xs font-semibold uppercase tracking-widest text-muted">Rahu and Ketu</legend>
        <div className="mt-1 grid gap-1">
          {NODE_DRISHTI_OPTIONS.map((option) => (
            <label key={option.id} className="flex items-center gap-2 text-sm text-ink">
              <input
                type="radio"
                name={radio}
                checked={draftNodes === option.id}
                onChange={() => {
                  setEdited(true);
                  setDraftNodes(option.id);
                }}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>
      {note ? <p className="mt-2 px-1 text-xs text-muted">{note}</p> : null}
    </GoldMenu>
  );
}
