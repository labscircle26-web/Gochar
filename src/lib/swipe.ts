import { useEffect } from "react";

export function useSectionSwipe(onSwipe: (direction: "left" | "right") => void) {
  useEffect(() => {
    let x0 = 0;
    let y0 = 0;
    let armed = false;
    const start = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;
      const target = event.target;
      if (target instanceof Element && target.closest("[data-no-swipe]")) return;
      x0 = event.touches[0]?.clientX ?? 0;
      y0 = event.touches[0]?.clientY ?? 0;
      armed = true;
    };
    const end = (event: TouchEvent) => {
      if (!armed) return;
      armed = false;
      const touch = event.changedTouches[0];
      if (!touch) return;
      const dx = touch.clientX - x0;
      const dy = touch.clientY - y0;
      if (Math.abs(dx) < 72 || Math.abs(dx) < Math.abs(dy) * 1.3) return;
      onSwipe(dx > 0 ? "right" : "left");
    };
    window.addEventListener("touchstart", start, { passive: true });
    window.addEventListener("touchend", end);
    return () => {
      window.removeEventListener("touchstart", start);
      window.removeEventListener("touchend", end);
    };
  }, [onSwipe]);
}
