/**
 * Five-field cron (minute hour day-of-month month day-of-week), UTC.
 * Schedules may run at most every 5 minutes.
 */
export type Cron = { minutes: number[]; hours: number[]; days: number[]; months: number[]; weekdays: number[]; dayAny: boolean; weekdayAny: boolean };

const RANGES: [number, number][] = [[0, 59], [0, 23], [1, 31], [1, 12], [0, 6]];
const NAMES: Record<string, number>[] = [{}, {}, {}, { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 }, { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 }];

function field(spec: string, idx: number): number[] {
  const [lo, hi] = RANGES[idx]!;
  const val = (s: string) => {
    const n = NAMES[idx]![s.toLowerCase()] ?? (/^\d+$/.test(s) ? Number(s) : NaN);
    const v = idx === 4 && n === 7 ? 0 : n;
    if (!Number.isInteger(v) || v < lo || v > hi) throw new Error(`"${s}" is out of range`);
    return v;
  };
  const out = new Set<number>();
  for (const part of spec.split(",")) {
    const m = /^(\*|[a-z0-9]+(?:-[a-z0-9]+)?)(?:\/(\d+))?$/i.exec(part);
    if (!m) throw new Error(`can't read "${part}"`);
    const step = m[2] ? Number(m[2]) : 1;
    if (step < 1) throw new Error("step must be at least 1");
    let a = lo, b = hi;
    if (m[1] !== "*") {
      const [x, y] = m[1]!.split("-");
      a = val(x!); b = y !== undefined ? val(y) : m[2] ? hi : a;
      if (b < a) throw new Error(`range ${m[1]} is backwards`);
    }
    for (let v = a; v <= b; v += step) out.add(v);
  }
  return [...out].sort((x, y) => x - y);
}

export function parseCron(expr: string): Cron {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) throw new Error("a schedule has 5 fields: minute hour day month weekday");
  const [mi, h, d, mo, w] = parts as [string, string, string, string, string];
  const cron: Cron = { minutes: field(mi, 0), hours: field(h, 1), days: field(d, 2), months: field(mo, 3), weekdays: field(w, 4), dayAny: d === "*", weekdayAny: w === "*" };
  const gap = minGapMinutes(cron);
  if (gap < 5) throw new Error("schedules can run at most every 5 minutes");
  return cron;
}

function minGapMinutes(c: Cron): number {
  const times = c.hours.flatMap((h) => c.minutes.map((m) => h * 60 + m));
  let gap = Infinity;
  for (let i = 1; i < times.length; i++) gap = Math.min(gap, times[i]! - times[i - 1]!);
  if (times.length) gap = Math.min(gap, 1440 - times.at(-1)! + times[0]!); // wrap to the next day
  return gap;
}

function dayMatches(c: Cron, d: Date): boolean {
  const dom = c.days.includes(d.getUTCDate());
  const dow = c.weekdays.includes(d.getUTCDay());
  // Standard cron: when both are restricted, either may match.
  if (!c.dayAny && !c.weekdayAny) return dom || dow;
  if (!c.dayAny) return dom;
  if (!c.weekdayAny) return dow;
  return true;
}

/** The next firing strictly after `from`, in UTC. */
export function nextRun(expr: string | Cron, from: Date): Date {
  const c = typeof expr === "string" ? parseCron(expr) : expr;
  const t = new Date(Math.floor(from.getTime() / 60_000) * 60_000 + 60_000);
  for (let day = 0; day < 366 * 5; day++) {
    if (c.months.includes(t.getUTCMonth() + 1) && dayMatches(c, t)) {
      for (const h of c.hours) {
        if (h < t.getUTCHours()) continue;
        for (const m of c.minutes) {
          if (h === t.getUTCHours() && m < t.getUTCMinutes()) continue;
          return new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate(), h, m));
        }
      }
    }
    t.setUTCDate(t.getUTCDate() + 1);
    t.setUTCHours(0, 0, 0, 0);
  }
  throw new Error("this schedule never runs");
}
