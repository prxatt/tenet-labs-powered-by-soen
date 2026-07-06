/** SOEN scoring — day, week, month aggregates. Pure TS. */
import type { OuraDay, PlanState } from './types';
import { key, addD, weekIdx, CAMP0 } from './dates';
import { blocksFor, isKey } from './schedule';

export function completion(d: Date, st: PlanState): number | null {
  const B = blocksFor(d, st).filter(isKey);
  if (!B.length) return null;
  const c = B.filter(b => st.done[b.date + '|' + b.id]).length;
  return Math.round((c / B.length) * 100);
}

export interface Score { n: number | null; lab: string; }

export function soenScore(d: Date, st: PlanState, oura: Record<string, OuraDay>): Score {
  const k = key(d), o = oura[k], comp = completion(d, st);
  const past = key(d) < key(new Date());
  if (o?.r && comp !== null && (past || comp > 0)) return { n: Math.round(o.r * 0.5 + comp * 0.5), lab: 'OURA × DONE' };
  if (o?.r) return { n: o.r, lab: 'OURA READINESS' };
  if (comp && past) return { n: comp, lab: 'COMPLETION' };
  const l = st.logs[k];
  if (l?.e) return { n: l.e * 10, lab: 'LOGGED ENERGY' };
  return { n: null, lab: 'NO DATA YET' };
}

export interface WeekAgg {
  workT: number;
  /** per-day hours by bucket: work / training / recovery */
  stacks: { work: number; train: number; rec: number }[];
  scores: (number | null)[];
}

export function weekAgg(d: Date, st: PlanState, oura: Record<string, OuraDay>): WeekAgg {
  const mon = addD(CAMP0, weekIdx(d) * 7);
  let workT = 0;
  const stacks: WeekAgg['stacks'] = [];
  const scores: (number | null)[] = [];
  for (let i = 0; i < 7; i++) {
    const day = addD(mon, i), B = blocksFor(day, st);
    const sum = (cls: string[]) => B.filter(b => cls.includes(b.cls)).reduce((a, b) => a + b.dur, 0);
    const work = sum(['tGreen', 'tGreen2']);
    workT += work;
    stacks.push({ work, train: sum(['tRed', 'tBlue']), rec: sum(['tPlum']) });
    scores.push(soenScore(day, st, oura).n);
  }
  return { workT, stacks, scores };
}

export function monthScore(mCur: Date, st: PlanState, oura: Record<string, OuraDay>): number | null {
  const first = new Date(mCur.getFullYear(), mCur.getMonth(), 1);
  let sum = 0, n = 0;
  for (let i = 0; i < 31; i++) {
    const d = addD(first, i);
    if (d.getMonth() !== mCur.getMonth()) break;
    if (key(d) > key(new Date())) break;
    const s = soenScore(d, st, oura);
    if (s.n != null) { sum += s.n; n++; }
  }
  return n ? Math.round(sum / n) : null;
}
