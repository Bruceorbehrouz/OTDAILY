const TZ = 'America/Vancouver';

/** Today in Vancouver, as YYYY-MM-DD. */
export function vancouverDateStr(date: Date = new Date()): string {
  return date.toLocaleDateString('en-CA', { timeZone: TZ });
}

function parseDateStr(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** Shift a YYYY-MM-DD string by a whole number of days. */
export function addDays(dateStr: string, days: number): string {
  const d = parseDateStr(dateStr);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function dayOfYear(dateStr: string = vancouverDateStr()): number {
  const [year] = dateStr.split('-').map(Number);
  const d = parseDateStr(dateStr);
  return Math.floor((d.getTime() - new Date(year, 0, 0).getTime()) / 86400000);
}

/**
 * Monday anchoring the week count. Fixed so the weekly rotation keeps
 * advancing across new years instead of resetting every January.
 */
const WEEK_EPOCH = '2026-01-05';

/** Whole weeks elapsed since the epoch Monday; may be negative before it. */
export function weekIndex(dateStr: string = vancouverDateStr()): number {
  const days = Math.floor(
    (parseDateStr(dateStr).getTime() - parseDateStr(WEEK_EPOCH).getTime()) / 86400000
  );
  return Math.floor(days / 7);
}

/** Picks an item from a rotating library, safe for negative week indexes. */
export function rotationIndex(length: number, dateStr: string = vancouverDateStr()): number {
  if (length <= 0) return 0;
  return ((weekIndex(dateStr) % length) + length) % length;
}

export function weekOfYear(dateStr: string = vancouverDateStr()): number {
  const [year] = dateStr.split('-').map(Number);
  const d = parseDateStr(dateStr);
  return Math.ceil((d.getTime() - new Date(year, 0, 1).getTime()) / 604800000);
}

/** Identifies the current puzzle week for saving progress. */
export function cwWeekKey(dateStr: string = vancouverDateStr()): string {
  return `w${weekIndex(dateStr)}`;
}

export function formatDate(dateStr: string): string {
  return parseDateStr(dateStr).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

/** The n most recent days, oldest first, ending with today. */
export function getDaysBefore(n: number, today: string = vancouverDateStr()): string[] {
  const result: string[] = [];
  for (let i = n - 1; i >= 0; i--) result.push(addDays(today, -i));
  return result;
}

/** Reader-facing label for the current puzzle week, e.g. "Week of 17 August". */
export function weekLabel(dateStr: string = vancouverDateStr()): string {
  const dow = parseDateStr(dateStr).getDay(); // 0 = Sunday
  const monday = addDays(dateStr, -((dow + 6) % 7));
  const shown = parseDateStr(monday).toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  return `Week of ${shown}`;
}

/** Monday-to-Sunday of the week containing today, in Vancouver time. */
export function weekDays(today: string = vancouverDateStr()): { label: string; date: string }[] {
  const dow = parseDateStr(today).getDay(); // 0 = Sunday
  const monday = addDays(today, -((dow + 6) % 7));
  return ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((label, i) => ({
    label,
    date: addDays(monday, i),
  }));
}
