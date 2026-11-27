import { norm } from "./calc";

export function formatDms(value: number, withinSign = false): string {
  let x = withinSign ? norm(value) % 30 : norm(value);
  let deg = Math.floor(x + 1e-8);
  let minutesFloat = (x - deg) * 60;
  let minutes = Math.floor(minutesFloat + 1e-8);
  let seconds = Math.round((minutesFloat - minutes) * 60);
  if (seconds === 60) {
    seconds = 0;
    minutes += 1;
  }
  if (minutes === 60) {
    minutes = 0;
    deg += 1;
  }
  if (withinSign && deg >= 30) deg = 0;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${deg}° ${pad(minutes)}′ ${pad(seconds)}″`;
}

export function formatSpeed(speed: number): string {
  const digits = Math.abs(speed) >= 1 ? 2 : 3;
  const sign = speed < 0 ? "−" : "+";
  return `${sign}${Math.abs(speed).toFixed(digits)}°/d`;
}

export function formatGap(deg: number): string {
  const minutes = Math.round(deg * 60);
  if (minutes < 60) return `${minutes}′`;
  return `${deg.toFixed(2)}°`;
}
