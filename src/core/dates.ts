/** Date helpers — pure, platform-agnostic. */

export const CAMP0 = new Date(2026, 6, 6);
export const CAMP_END = new Date(2026, 7, 16);
export const DN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const MN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const PHASE = ['Base', 'Base', 'Build', 'Build', 'Peak', 'Deload'];
export const DATE_NIGHTS = ['2026-07-17', '2026-07-31', '2026-08-14'];

export const key = (d: Date): string => {
  const p = (n: number) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
};

export const addD = (d: Date, n: number): Date => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

export const fromKey = (k: string): Date => new Date(k + 'T12:00:00');

export const weekIdx = (d: Date): number =>
  Math.max(0, Math.min(5, Math.floor((d.getTime() - CAMP0.getTime()) / 6048e5)));

export const fmt = (t: number): string => {
  const h = Math.floor(t), m = Math.round((t - h) * 60);
  return (((h + 11) % 12) + 1) + (m ? ':' + String(m).padStart(2, '0') : '') + ' ' + (h >= 12 ? 'PM' : 'AM');
};

export const hf = (x: number): string => {
  const h = Math.floor(x), m = Math.round((x - h) * 60);
  return h ? h + 'h' + (m ? m + 'm' : '') : m + 'm';
};

export const clampToCamp = (d: Date): Date => {
  if (d < CAMP0) return new Date(CAMP0);
  if (d > CAMP_END) return new Date(CAMP_END);
  return d;
};
