// Reporting boundaries ("today", "this week", "this month") are computed in the
// business's local timezone, NOT the server's UTC — otherwise, after ~6–7pm
// local, "today" rolls to the next UTC day and the day's activity vanishes from
// the Today totals (while still showing in the week). Override with the
// BUSINESS_TIMEZONE env var if the company relocates.
const BUSINESS_TZ = process.env.BUSINESS_TIMEZONE || "America/Chicago";

// Offset (local wall-clock − UTC) in ms for an instant, in the business tz.
function tzOffset(instant: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const m: Record<string, number> = {};
  for (const p of dtf.formatToParts(instant)) if (p.type !== "literal") m[p.type] = Number(p.value);
  const hour = m.hour === 24 ? 0 : m.hour;
  const wallAsUtc = Date.UTC(m.year, m.month - 1, m.day, hour, m.minute, m.second);
  return wallAsUtc - instant.getTime();
}

// UTC instant of local midnight, `dayShift` days from today (business tz).
export function startOfDay(dayShift = 0): Date {
  const now = new Date();
  const [y, mo, d] = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(now)
    .split("-")
    .map(Number);
  const wallAsUtc = Date.UTC(y, mo - 1, d + dayShift, 0, 0, 0);
  return new Date(wallAsUtc - tzOffset(new Date(wallAsUtc)));
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// 0 (Sun) – 6 (Sat) weekday index of "now" in the business tz.
function weekdayIndex(): number {
  const wd = new Intl.DateTimeFormat("en-US", { timeZone: BUSINESS_TZ, weekday: "long" }).format(new Date());
  return Math.max(0, WEEKDAYS.indexOf(wd));
}

// Day-of-month of "now" in the business tz.
function dayOfMonth(): number {
  return Number(new Intl.DateTimeFormat("en-CA", { timeZone: BUSINESS_TZ, day: "2-digit" }).format(new Date()));
}

export function startOfToday(): Date {
  return startOfDay(0);
}

export function startOfWeek(): Date {
  return startOfDay(-weekdayIndex());
}

export function startOfMonth(): Date {
  return startOfDay(-(dayOfMonth() - 1));
}

// Start of the *previous* period, for period-over-period comparisons.
export function startOfPrevDay(): Date {
  return startOfDay(-1);
}
export function startOfPrevWeek(): Date {
  return startOfDay(-weekdayIndex() - 7);
}
export function startOfPrevMonth(): Date {
  // First of this month, then shift back one calendar month via Date arithmetic.
  const first = startOfMonth();
  const d = new Date(first);
  d.setUTCDate(0); // last day of previous month
  return startOfDayFromInstant(d);
}

// Local midnight of the day containing `instant` (business tz).
function startOfDayFromInstant(instant: Date): Date {
  const [y, mo, d] = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(instant)
    .split("-")
    .map(Number);
  const wallAsUtc = Date.UTC(y, mo - 1, d, 0, 0, 0);
  return new Date(wallAsUtc - tzOffset(new Date(wallAsUtc)));
}

// Epoch-ish start used for the "all time" range.
export const EPOCH = new Date("2000-01-01T00:00:00.000Z");
