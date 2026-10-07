export const hhmm = (d: Date) => d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
export const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
export const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

export function dayLabel(d: Date, now = new Date()): string {
  if (sameDay(d, now)) return 'היום';
  if (sameDay(d, addDays(now, -1))) return 'אתמול';
  return d.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'numeric' });
}

export function listTime(d: Date, now = new Date()): string {
  if (sameDay(d, now)) return hhmm(d);
  if (sameDay(d, addDays(now, -1))) return 'אתמול';
  return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' });
}

export function fmtLeft(min: number): string {
  const h = Math.floor(min / 60), m = Math.floor(min % 60);
  return h + ':' + (m < 10 ? '0' : '') + m;
}

export function toLocalInput(d: Date): string {
  const p = (n: number) => (n < 10 ? '0' : '') + n;
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes());
}

export function fmtSize(b: number): string {
  if (b < 1024) return b + ' B';
  if (b < 1024 * 1024) return Math.round(b / 1024) + ' KB';
  return (b / 1024 / 1024).toFixed(1) + ' MB';
}
