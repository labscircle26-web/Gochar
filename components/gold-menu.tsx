import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

export function GoldMenu({
  label,
  summary,
  mark,
  open,
  onOpenChange,
  children,
  footer,
  className = "",
}: {
  label: string;
  summary: string;
  mark?: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const onOpenChangeRef = useRef(onOpenChange);
  const [box, setBox] = useState({ anchor: 0, left: 0, width: 0, maxHeight: 360, up: false });
  onOpenChangeRef.current = onOpenChange;

  useLayoutEffect(() => {
    if (!open) return;
    const fit = () => {
      const rect = root.current?.getBoundingClientRect();
      if (!rect) return;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const up = spaceBelow < 220 && spaceAbove > spaceBelow;
      setBox({
        anchor: up ? window.innerHeight - rect.top - 1 : rect.bottom - 1,
        left: rect.left,
        width: rect.width,
        maxHeight: Math.max(160, (up ? spaceAbove : spaceBelow) - 12),
        up,
      });
    };
    fit();
    window.addEventListener("resize", fit);
    window.addEventListener("scroll", fit, true);
    return () => {
      window.removeEventListener("resize", fit);
      window.removeEventListener("scroll", fit, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      onOpenChangeRef.current(false);
    };
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) onOpenChangeRef.current(false);
    };
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <div ref={root} className={`relative min-w-0 ${className}`} data-no-swipe>
      <button
        type="button"
        aria-expanded={open}
        className={`flex h-12 w-full items-center justify-between gap-2 border border-[#a68534] bg-[#f0c14e] px-3 text-left text-[#1c1406] shadow-[0_0_16px_rgb(240_193_78_/_0.35)] ${open ? `relative z-50 ${box.up ? "rounded-b-md rounded-t-none" : "rounded-t-md rounded-b-none"}` : "rounded-md"}`}
        onClick={() => onOpenChange(!open)}
      >
        <span className="flex min-w-0 items-center gap-2">
          {mark}
          <span className="min-w-0">
            <span className="block truncate text-xs font-semibold uppercase tracking-wide">{label}</span>
            <span className="block truncate text-sm leading-none">{summary}</span>
          </span>
        </span>
        <svg viewBox="0 0 20 20" className={`h-5 w-5 shrink-0 ${open ? "rotate-180" : ""}`} aria-hidden="true">
          <path d="M5 7.5 L10 12.5 L15 7.5" fill="none" stroke="#1c1406" strokeWidth="1.7" />
        </svg>
      </button>
      {open && (
        <div
          className={`fixed z-50 flex flex-col overflow-hidden border border-[#a68534] bg-paper shadow-[0_14px_28px_rgb(0_0_0_/_0.42)] ${box.up ? "rounded-t-md rounded-b-none" : "rounded-b-md rounded-t-none"}`}
          style={
            box.up
              ? { bottom: box.anchor, left: box.left, width: box.width, maxHeight: box.maxHeight }
              : { top: box.anchor, left: box.left, width: box.width, maxHeight: box.maxHeight }
          }
        >
          <div className="min-h-0 flex-1 overflow-y-auto p-2">{children}</div>
          {footer ? <div className="shrink-0 border-t border-line p-2">{footer}</div> : null}
        </div>
      )}
    </div>
  );
}
