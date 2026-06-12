const TZ = 'America/Vancouver';

export function vancouverDateStr(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ });
}

export function dayOfYear(): number {
  const ds = vancouverDateStr();
  const [year, month, day] = ds.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return Math.floor((d.getTime() - new Date(year, 0, 0).getTime()) / 86400000);
}

export function weekOfYear(): number {
  const now = new Date();
  return Math.ceil((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 604800000);
}

export function cwWeekKey(): string {
  const now = new Date();
  return `${now.getFullYear()}_w${weekOfYear()}`;
}

export function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

export function getDaysBefore(n: number): string[] {
  const result: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    result.push(d.toLocaleDateString('en-CA', { timeZone: TZ }));
  }
  return result;
}

export function weekDays(): { label: string; date: string }[] {
  const today = new Date();
  const dow = today.getDay(); // 0=Sun
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dow + 6) % 7));

  return ['M','T','W','T','F','S','S'].map((label, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return { label, date: d.toLocaleDateString('en-CA', { timeZone: TZ }) };
  });
}
