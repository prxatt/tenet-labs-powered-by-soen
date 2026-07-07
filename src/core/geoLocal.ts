/** Local-only geo visit log — never uploaded to Supabase. */
export interface GeoVisit {
  at: number;
  la: number;
  lo: number;
  label: 'gym' | 'home' | 'other';
}

const LS = 'tl7_geo_visits';
const MAX = 200;

function load(): GeoVisit[] {
  try { return JSON.parse(localStorage.getItem(LS) || '[]'); } catch { return []; }
}

function save(v: GeoVisit[]) {
  try { localStorage.setItem(LS, JSON.stringify(v.slice(-MAX))); } catch { /* quota */ }
}

function distM(a: { la: number; lo: number }, b: { la: number; lo: number }): number {
  const dLa = (a.la - b.la) * 111320;
  const dLo = (a.lo - b.lo) * 111320 * Math.cos(a.la * Math.PI / 180);
  return Math.hypot(dLa, dLo);
}

function labelFor(
  la: number, lo: number,
  gym?: { la: number; lo: number } | null,
  home?: { la: number; lo: number } | null,
): GeoVisit['label'] {
  if (gym && distM({ la, lo }, gym) < 250) return 'gym';
  if (home && distM({ la, lo }, home) < 200) return 'home';
  return 'other';
}

/** Record a geolocation sample if moved meaningfully since last entry. */
export function recordGeoSample(
  la: number, lo: number,
  gym?: { la: number; lo: number } | null,
  home?: { la: number; lo: number } | null,
): void {
  const visits = load();
  const label = labelFor(la, lo, gym, home);
  const last = visits[visits.length - 1];
  if (last && Date.now() - last.at < 120000) {
    if (distM(last, { la, lo }) < 40 && last.label === label) return;
  }
  visits.push({ at: Date.now(), la: Math.round(la * 1000) / 1000, lo: Math.round(lo * 1000) / 1000, label });
  save(visits);
}

export function gymVisitsThisWeek(): number {
  const weekAgo = Date.now() - 7 * 864e5;
  const days = new Set<string>();
  load().filter(v => v.label === 'gym' && v.at >= weekAgo).forEach(v => {
    days.add(new Date(v.at).toDateString());
  });
  return days.size;
}

export function exportGeoVisits(): GeoVisit[] { return load(); }
