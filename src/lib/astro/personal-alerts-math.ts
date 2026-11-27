/** Circular-angle helpers shared by personal transit alert detection and tests. */

export function normAngle(value: number): number {
  return ((value % 360) + 360) % 360;
}

export function signedAngleDelta(value: number): number {
  const result = normAngle(value);
  return result > 180 ? result - 360 : result;
}

/** True when a circular longitude moves across target between two samples. */
export function crossesAngularBoundary(before: number, after: number, target: number): boolean {
  const delta = signedAngleDelta(after - before);
  if (Math.abs(delta) < 1e-9) return false;
  const distance = signedAngleDelta(target - before);
  if (delta > 0) return distance > 1e-8 && distance <= delta + 1e-8;
  return distance < -1e-8 && distance >= delta - 1e-8;
}
