/** AI prompt builders + response parsers. Pure TS — no fetch here. */
import type { CustomEvent, OuraDay, PlanState, Recipe } from './types';
import { DN, key, addD } from './dates';
import { completion } from './scoring';

export function eventParsePrompt(text: string, cur: Date): string {
  return `Parse this into calendar events. Today is ${key(cur)} (${DN[cur.getDay()]}). Times without am/pm: assume the sensible one for an adult's day. Return ONLY a JSON array, no prose, no markdown fences: [{"title":str,"date":"YYYY-MM-DD","start":decimal hour (e.g. 15.5),"dur":hours,"location":str|null,"notes":str|null}]. Text: "${text.replace(/"/g, "'")}"`;
}

export function parseEvents(answer: string): Omit<CustomEvent, 'id'>[] {
  const m = answer.match(/\[[\s\S]*\]/);
  if (!m) throw new Error('no json');
  const evs = JSON.parse(m[0]) as any[];
  return evs
    .filter(ev => ev.date && ev.start != null)
    .map(ev => ({
      t: +ev.start, dur: +ev.dur || 1, ti: String(ev.title || 'Event'),
      su: [ev.location, ev.notes].filter(Boolean).join(' · '), fo: 'Added',
      date: ev.date as string,
    })) as any;
}

export function recipePrompt(request: string): string {
  return `Create ONE recipe for: "${request.replace(/"/g, "'")}". It must be extremely nutritious, high-protein, and genuinely tasty. Return ONLY a JSON object, no prose, no markdown fences, exactly this shape: {"c":"Breakfast"|"Lunch"|"Dinner"|"Snacks & Dessert","n":"Recipe Name","tag":"Category · X min","mac":"~NNN kcal · NNg P","ing":["ingredient with quantity", ...],"st":["step 1", "step 2", ...]}. Keep ing 4-7 items and st 3-5 concise steps.`;
}

export function parseRecipe(answer: string): Recipe {
  const m = answer.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('no json');
  const r = JSON.parse(m[0]);
  if (!r.n || !Array.isArray(r.ing) || !Array.isArray(r.st)) throw new Error('bad recipe');
  const cats = ['Breakfast', 'Lunch', 'Dinner', 'Snacks & Dessert'];
  return {
    c: cats.includes(r.c) ? r.c : 'Dinner',
    n: String(r.n), tag: String(r.tag || 'AI recipe'), mac: String(r.mac || ''),
    ing: r.ing.map(String), st: r.st.map(String),
    user: true, id: 'r_' + Date.now(),
  };
}

export function soenContext(st: PlanState, oura: Record<string, OuraDay>, cur: Date): string {
  const last7 = Object.fromEntries(Object.entries(oura).slice(-7));
  const comp = [0, 1, 2, 3, 4, 5, 6].map(i => {
    const d = addD(cur, -6 + i);
    return key(d) + ':' + (completion(d, st) ?? 'na');
  }).join(', ');
  return `You are SOEN, a calm planning intelligence for Pratt: 34, SF, boxer in 6-wk camp (4 classes/wk Bay Breakers), building TENET Boxing app (launch Sept 2026 w/ iOS 27), TENET Sense hardware hobby, edX AI courses (done: Intro Gen AI, AI for Everyone; now: Prompt Engineering), high-protein chicken-forward diet ~2450kcal/150g protein, partner (movie/date nights protected), Oura user. Last 7 days: ${JSON.stringify(last7)}. Completion by day: ${comp}. Be specific, concise, no fluff.`;
}

export function retunePrompt(st: PlanState, oura: Record<string, OuraDay>, cur: Date): string {
  return soenContext(st, oura, cur) + ' Task: Based on the data, is the plan too easy, too hard, or right? Propose max 3 concrete adjustments (block, day, change, why). If data is thin, say what to log first.';
}
