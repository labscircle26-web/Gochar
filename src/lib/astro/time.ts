export type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

export function isValidTimeZone(timeZone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function zoneOffsetMs(instant: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const map: Record<string, string> = {};
  for (const part of dtf.formatToParts(instant)) {
    if (part.type !== "literal") map[part.type] = part.value;
  }
  let hour = Number(map.hour);
  if (hour === 24) hour = 0;
  const asUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    hour,
    Number(map.minute),
    Number(map.second),
  );
  return asUtc - instant.getTime();
}

export function zonedToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string,
): Date {
  const desired = Date.UTC(year, month - 1, day, hour, minute, second);
  let utc = desired;
  for (let i = 0; i < 4; i++) {
    utc = desired - zoneOffsetMs(new Date(utc), timeZone);
  }
  return new Date(utc);
}

export function utcToZonedParts(instant: Date, timeZone: string): ZonedParts {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const map: Record<string, string> = {};
  for (const part of dtf.formatToParts(instant)) {
    if (part.type !== "literal") map[part.type] = part.value;
  }
  let hour = Number(map.hour);
  if (hour === 24) hour = 0;
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour,
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

export function addLocal(
  instant: Date,
  timeZone: string,
  delta: { years?: number; months?: number; days?: number; hours?: number; minutes?: number },
): Date {
  const parts = utcToZonedParts(instant, timeZone);
  const base = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second),
  );
  if (delta.years) base.setUTCFullYear(base.getUTCFullYear() + delta.years);
  if (delta.months) base.setUTCMonth(base.getUTCMonth() + delta.months);
  if (delta.days) base.setUTCDate(base.getUTCDate() + delta.days);
  if (delta.hours) base.setUTCHours(base.getUTCHours() + delta.hours);
  if (delta.minutes) base.setUTCMinutes(base.getUTCMinutes() + delta.minutes);
  return zonedToUtc(
    base.getUTCFullYear(),
    base.getUTCMonth() + 1,
    base.getUTCDate(),
    base.getUTCHours(),
    base.getUTCMinutes(),
    base.getUTCSeconds(),
    timeZone,
  );
}

export function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

export function dateInputValue(parts: ZonedParts): string {
  return `${parts.year.toString().padStart(4, "0")}-${pad2(parts.month)}-${pad2(parts.day)}`;
}

export function timeInputValue(parts: ZonedParts): string {
  return `${pad2(parts.hour)}:${pad2(parts.minute)}:${pad2(parts.second)}`;
}

export function formatClock(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(instant);
}

export function formatStamp(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(instant);
}

export function relativeWhen(target: Date, now: Date): string {
  const ms = target.getTime() - now.getTime();
  const absMin = Math.round(Math.abs(ms) / 60000);
  if (absMin < 1) return "Right now";
  const unit = (n: number, name: string) => `${n} ${name}${n === 1 ? "" : "s"}`;
  let text: string;
  if (absMin < 60) text = unit(absMin, "minute");
  else if (absMin < 60 * 36) text = unit(Math.round(absMin / 60), "hour");
  else if (absMin < 60 * 24 * 45) text = unit(Math.round(absMin / (60 * 24)), "day");
  else if (absMin < 60 * 24 * 540) text = unit(Math.round(absMin / (60 * 24 * 30.437)), "month");
  else text = unit(Math.round(absMin / (60 * 24 * 365.25)), "year");
  return ms > 0 ? `${text} ahead` : `${text} ago`;
}
