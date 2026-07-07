/** Schedule generation, edit overlays, moves, lanes, day-swap — pure TS. */
import type { Block, BlockClass, LaneBlock, PlanState } from './types';
import { CAMP0, CAMP_END, DATE_NIGHTS, key, addD, fromKey, weekIdx } from './dates';

export const BFAST = ['Greek yogurt power bowl', 'Protein oats + berries', 'Three-egg scramble + toast', 'Greek yogurt power bowl', 'Cottage cheese toast', 'Protein oats + berries', 'Shakshuka + beans'];
export const MAIN = ['Chicken burrito bowl', 'Grilled chicken poke bowl', 'Chicken tikka wrap', 'Lentil-halloumi bowl', 'Chicken fried rice +', 'Chicken caesar power bowl', 'Paneer tikka wrap'];
export const DINNER = ['Chicken tikka masala + basmati', 'Ginger-garlic chicken stir-fry', 'Chicken tinga tacos', 'Miso-glazed chicken bowl', 'Greek lemon chicken traybake', 'Out — order smart', 'Harissa chicken + sweet potato'];
export const RUNS = ['30 min Z2', '35 min Z2', '40 min Z2 + strides', 'Fartlek 6×1 min', 'Intervals 8×1 min', '25 min easy (deload)'];

export function baseBlocks(d: Date, times: Record<string, number>): Block[] {
  const w = weekIdx(d), dow = d.getDay(), k = key(d);
  const B: Block[] = [];
  const A = (id: string, t: number, dur: number, cls: BlockClass, ti: string, su?: string, fo = '', mv?: 0 | 1, lock?: 0 | 1) =>
    B.push({ id, t: times[k + '|' + id] ?? t, dur, cls, ti, su, fo, mv, lock, date: k });
  if (d < CAMP0 || d > CAMP_END) return B;
  A('med', 7.42, 0.25, 'tPlum', 'Sun + breathwork 10 min', 'Outside light + 10 slow breaths — circadian anchor, calmer HRV', 'Habit', 1);
  A('rit', 7.58, 0.42, 'tPlum', 'Morning Ritual', 'Coffee + collagen · Yakult · mobility 8' + ([1, 3, 5].includes(dow) ? ' · Oura auto-syncs weight' : ''), 'Ritual');
  if ([1, 3, 4, 5].includes(dow)) {
    A('dw1', 8, 2.6, 'tGreen', 'Deep Work — TENET Boxing', 'Launch build. Hardest problem first.', 'High Focus');
    A('bar', 10.75, 0.25, 'tAmber', 'Built Bar', 'Pre-gym fuel', 'Fuel');
    A('box', 11, 4, 'tRed', 'Boxing — Bay Breakers', 'Class 12:00 · Polar on' + (dow === 1 ? ' · +Strength A' : dow === 4 ? ' · +Strength B + core' : dow === 5 ? ' · technique + film one round' : ''), 'Locked', 0, 1);
    A('meal', 15, 0.5, 'tAmber', 'Shake + Main Meal', MAIN[(w + dow) % 7] + ' · D3K2 · CoQ10 · NAC', 'Fuel');
    A('dw2', 15.5, 3.5, 'tGreen2', 'Deep Work — TENET / marketing', 'Build first · Fri = landing page + content hour', 'Focus');
    if (dow === 1) A('shad', 19.25, 0.25, 'tRed', 'Shadowbox 15', "Footwork + this week's combos", 'Skill', 1);
    if (dow === 3) A('edx', 19.25, 0.75, 'tBlue', 'edX — Prompt Engineering', 'One module. Streak matters more than length.', 'Learning', 1);
    if (dow === 4) A('edx', 19.25, 0.75, 'tBlue', 'edX — Prompt Engineering', 'Module + notes into TENET prompts folder', 'Learning', 1);
    if (dow === 5 && w >= 4) A('red', 15.5, 0.75, 'tPlum', 'Red Light — Royal Thai', 'Month-2 Groupon', 'Recovery', 1);
    if (dow === 5 && DATE_NIGHTS.includes(k)) A('date', 19, 3.5, 'tPlum', 'Date Night', 'Protected. Drinks ≤2 · dessert welcome', 'Partner');
  }
  if (dow === 2) {
    A('run', 8, 1.25, 'tBlue', 'Lands End Run', 'Rope 6 → ' + RUNS[w] + ' → stretch', 'Zone 2', 1);
    A('dw1', 9.75, 3.25, 'tGreen', 'Deep Work — TENET Boxing', 'Longest block of the week', 'High Focus');
    A('meal', 13, 0.5, 'tAmber', 'Main Meal', MAIN[(w + 2) % 7], 'Fuel');
    A('dw2', 13.75, 3.75, 'tGreen2', 'Deep Work — TENET', '', 'Focus');
    A('yoga', 18, 1.25, 'tPlum', 'Hot Yoga — 20th & Geary', 'ClassPass · electrolytes', 'Recovery', 1);
    if (k === '2026-07-07') A('movie', 19.75, 2.5, 'tPlum', 'Movie Night', 'With partner · protected', 'Partner');
    else A('edx', 20, 0.75, 'tBlue', 'edX — Prompt Engineering', 'Post-yoga brain is calm — good module time', 'Learning', 1);
  }
  if (dow === 6) {
    A('sense', 10, 2, 'tBlue', 'TENET Sense — hobby lab', 'This wk: ' + (w < 1 ? 'pipeline on iPad/Mac footage' : w < 3 ? 'ESP32 bench bring-up' : 'video+IMU fusion demo'), 'Vibe Code', 1);
    A('dw3', 13, 3, 'tGreen2', 'TENET work + skills (flex)', '2h build/marketing + 1h skill practice: CV course, Swift, shader play', 'Focus', 1);
    A('create', 17, 1, 'tPlum', ['Creative writing hour', 'Hardware planning — Sense sketchbook', 'Canvas-art date with partner', 'Creative writing hour', 'Hardware planning — Sense sketchbook', 'Canvas-art date with partner'][w], 'Analog hands, no screens. Rotates weekly.', 'Creative', 1);
    if (k === '2026-08-08') A('banya', 14, 3, 'tPlum', 'Archimedes Banya w/ friend', 'Eat 2h before · 3 rounds · refeed', 'Recovery', 1);
    if (w === 1 || w === 3) A('pil', 9, 1, 'tPlum', 'Pilates — Marina (optional)', 'ClassPass', 'Optional', 1);
    A('watch', 19.5, 2.5, 'tRed', 'Fight Night viewing', 'Saturday ritual — watch like a student: feet first', 'Fun');
  }
  if (dow === 0) {
    if (k === '2026-07-05') A('beach', 9, 2, 'tBlue', 'Beach Run + coach friend', 'Rope → run → bodyweight → teach → stretch', 'Zone 2', 1);
    if (k === '2026-08-16') A('test', 9, 2, 'tRed', 'CAMP TEST', '1.5-mi timed + 3×3 max shadowbox', 'Milestone');
    A('groc', 15, 1, 'tAmber', 'Grocery Run', 'List in Fuel tab', 'Errand', 1);
    A('prep', 16, 1.5, 'tAmber', 'Meal Prep 90', 'Fuel tab has the exact order', 'Fuel', 1);
    A('dw4', 18, 1.5, 'tGreen2', 'TENET planning (light)', "Next week's build targets + marketing queue", 'Focus', 1);
    A('rev', 19.5, 0.5, 'tGreen2', 'Weekly Review', 'Scores below auto-fill · decide next week', 'Reflect');
  }
  A('read', 21.75, 0.42, 'tPlum', 'Bedtime reading 25 min', 'Paper or e-ink · fiction counts · phone stays out', 'Habit');
  A('wind', 22.25, 0.75, 'tPlum', 'Wind-down → lights 11', 'Cacao 9 · magnesium 10 · optional 10-min meditation', 'Sleep');
  return B;
}

/** Apply user edit overlay to a block. */
function applyEdit(b: Block, st: PlanState): Block {
  const e = st.edits[b.date + '|' + b.id];
  if (!e) return b;
  return { ...b, ti: e.ti ?? b.ti, su: e.su ?? b.su, dur: e.dur ?? b.dur, cls: e.cls ?? b.cls, t: e.t ?? b.t };
}

/** All blocks shown on a given day, with moves + custom + edits applied. */
export function blocksFor(d: Date, st: PlanState): Block[] {
  const k = key(d);
  let B = baseBlocks(d, st.times).filter(b => st.moves[b.date + '|' + b.id] === undefined || st.moves[b.date + '|' + b.id] === k);
  for (const mk in st.moves) {
    const [src, id] = mk.split('|');
    if (st.moves[mk] === k && src !== k) {
      const sb = baseBlocks(fromKey(src), st.times).find(x => x.id === id);
      if (sb && !B.some(x => x.id === id)) B.push({ ...sb, date: src, t: st.times[k + '|' + id] ?? sb.t, movedIn: 1 });
    }
  }
  (st.custom[k] || []).forEach(c => B.push({ ...c, date: k, cls: c.cls || 'tBlue', fo: c.fo || 'Added', mv: 1, cust: 1 }));
  return B.map(b => applyEdit(b, st)).sort((a, b) => a.t - b.t);
}

export const isKey = (b: Block): boolean => !['rit', 'wind', 'bar', 'meal'].includes(b.id);

/**
 * Lane assignment with transitive cluster grouping — every chain of
 * overlapping events shares one column count so nothing collides.
 */
export function assignLanes(B: Block[]): LaneBlock[] {
  const evs = B.map(b => ({ b, col: 0, cols: 1, cl: -1 }));
  const olap = (a: typeof evs[0], c: typeof evs[0]) =>
    a.b.t < c.b.t + c.b.dur - 0.02 && c.b.t < a.b.t + a.b.dur - 0.02;
  let nc = 0;
  evs.forEach(e => {
    if (e.cl >= 0) return;
    const stk = [e]; e.cl = nc;
    while (stk.length) {
      const x = stk.pop()!;
      evs.forEach(y => { if (y.cl < 0 && olap(x, y)) { y.cl = nc; stk.push(y); } });
    }
    nc++;
  });
  for (let ci = 0; ci < nc; ci++) {
    const C = evs.filter(e => e.cl === ci);
    C.sort((a, b) => a.b.t - b.b.t || b.b.dur - a.b.dur);
    const ends: number[] = [];
    C.forEach(e => {
      let c = 0;
      while (ends[c] != null && ends[c] > e.b.t + 0.02) c++;
      e.col = c; ends[c] = e.b.t + e.b.dur;
    });
    const n = Math.max(...C.map(e => e.col)) + 1;
    C.forEach(e => { e.cols = n; });
  }
  return evs.map(({ b, col, cols }) => ({ b, col, cols }));
}

/**
 * Swap all movable blocks between two dates (locked blocks stay).
 * Returns updated moves/times maps (materialized — no extra mechanism needed).
 */
export function swapDays(a: string, bK: string, st: PlanState): Pick<PlanState, 'moves' | 'custom'> {
  const moves = { ...st.moves };
  const custom = { ...st.custom };
  const dayA = blocksFor(fromKey(a), st), dayB = blocksFor(fromKey(bK), st);
  const movable = (b: Block) => b.mv && !b.cust;
  dayA.filter(movable).forEach(b => {
    const mk = b.date + '|' + b.id;
    if (b.date === bK) delete moves[mk]; else moves[mk] = bK;
  });
  dayB.filter(movable).forEach(b => {
    const mk = b.date + '|' + b.id;
    if (b.date === a) delete moves[mk]; else moves[mk] = a;
  });
  // custom events swap wholesale
  const ca = (custom[a] || []).filter(c => true), cb = (custom[bK] || []);
  custom[a] = cb; custom[bK] = ca;
  return { moves, custom };
}

export function gcalLink(b: Block, dk: string): string {
  const d = new Date(dk + 'T00:00:00');
  const stD = new Date(d); stD.setMinutes(b.t * 60);
  const en = new Date(d); en.setMinutes((b.t + b.dur) * 60);
  const z = (x: Date) => x.toISOString().replace(/[-:]|\.\d{3}/g, '');
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(b.ti)}&dates=${z(stD)}/${z(en)}&details=${encodeURIComponent((b.su || '') + ' · Tenet Labs powered by SOEN')}`;
}

export const MAPQ: Record<string, string> = {
  box: 'Bay Breakers Boxing Gym San Francisco',
  yoga: 'yoga 20th Ave and Geary Blvd San Francisco',
  pil: 'pilates Marina District San Francisco',
  run: 'Lands End Lookout San Francisco',
  banya: 'Archimedes Banya San Francisco',
};
