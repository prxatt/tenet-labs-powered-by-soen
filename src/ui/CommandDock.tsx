import { useEffect, useRef, useState } from 'react';
import { DN, addD, key } from '../core/dates';
import { eventParsePrompt, parseEvents } from '../core/ai';
import { aiCall } from '../core/api';
import { store } from '../core/store';
import { toast } from './hooks';
import { generateRecipe } from './fuel/FuelPage';
import type { SheetReq } from './App';

function localParse(text: string, cur: Date): { ti: string; date: string; t: number; dur: number } | null {
  let d = new Date(cur);
  const low = text.toLowerCase();
  if (/tomorrow/.test(low)) d = addD(new Date(), 1);
  else if (/today/.test(low)) d = new Date();
  else {
    const dm = low.match(/\b(sun|mon|tue|wed|thu|fri|sat)[a-z]*\b/);
    if (dm) {
      const want = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].indexOf(dm[1]);
      d = new Date();
      while (d.getDay() !== want) d = addD(d, 1);
    }
  }
  const tm = low.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (!tm) return null;
  let h = +tm[1] + (+tm[2] || 0) / 60;
  if (tm[3] === 'pm' && h < 12) h += 12;
  if (!tm[3] && h < 8) h += 12;
  const dm2 = low.match(/for\s+(\d+(?:\.\d+)?)\s*(hours?|hrs?|h|min(?:ute)?s?|m)\b/);
  let dur = 1;
  if (dm2) dur = /^m/i.test(dm2[2]) ? +dm2[1] / 60 : +dm2[1];
  const ti = text.replace(/\bfor\s+\d+(?:\.\d+)?\s*(hours?|hrs?|h|min(?:ute)?s?|m)\b/gi, '')
    .replace(/\b(today|tomorrow|sun|mon|tue|wed|thu|fri|sat)[a-z]*\b/gi, '')
    .replace(/(\d{1,2})(:\d{2})?\s*(am|pm)?/gi, '')
    .replace(/\bat\b/gi, '').replace(/\s+/g, ' ').trim();
  return { ti: ti ? ti[0].toUpperCase() + ti.slice(1) : 'Event', date: key(d), t: h, dur };
}

function isRecipeCmd(text: string): string | null {
  const m = text.match(/^(?:recipe:|\/recipe\s*|\/recipe:)\s*(.+)/i);
  return m ? m[1].trim() : null;
}

function isPlanCmd(text: string): string | null {
  const m = text.match(/^plan:\s*(.+)/i);
  return m ? m[1].trim() : null;
}

export default function CommandDock({ cur, goToDate, openSheet, onSoen }: {
  cur: Date; goToDate: (d: Date) => void; openSheet: (s: SheetReq) => void;
  onSoen: (question: string) => void;
}) {
  const [v, setV] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = document.activeElement?.tagName;
      if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, []);

  const addEvent = (ev: { ti: string; su?: string; date: string; t: number; dur: number }) => {
    store.updatePlan(p => ({
      custom: {
        ...p.custom,
        [ev.date]: [...(p.custom[ev.date] || []), { id: 'c_' + Date.now() + Math.random().toString(36).slice(2, 6), t: ev.t, dur: ev.dur, ti: ev.ti, su: ev.su, fo: 'Added' }],
      },
    }));
  };

  const runPlan = async (planText: string) => {
    setBusy(true);
    const a = await aiCall(eventParsePrompt(planText, cur));
    setBusy(false);
    if (a) {
      try {
        const evs = parseEvents(a) as any[];
        if (evs.length) {
          evs.forEach(ev => addEvent(ev));
          const d0 = new Date(evs[0].date + 'T12:00:00');
          goToDate(d0);
          toast(`Added ${evs.length} event${evs.length > 1 ? 's' : ''} — ${DN[d0.getDay()]} ${d0.getDate()}`);
          return;
        }
      } catch { /* fall through */ }
    }
    const lp = localParse(planText, cur);
    if (lp) {
      addEvent(lp);
      const d0 = new Date(lp.date + 'T12:00:00');
      goToDate(d0);
      toast(`Added "${lp.ti}" — ${DN[d0.getDay()]} ${d0.getDate()}`);
    } else toast('Could not parse — try plan: coffee tomorrow 3pm for 1h');
  };

  const run = async () => {
    const text = v.trim();
    if (!text || busy) return;
    setV('');

    const recipeBody = isRecipeCmd(text);
    if (recipeBody) {
      setBusy(true); toast('SOEN is writing your recipe…');
      const r = await generateRecipe(recipeBody);
      setBusy(false);
      if (!r) { toast('AI unavailable — add a Groq/Gemini key in Settings'); return; }
      store.addRecipe(r);
      toast(`Recipe added to ${r.c} in Fuel — synced`);
      openSheet({ type: 'recipe', recipe: r });
      return;
    }

    const planBody = isPlanCmd(text);
    if (planBody) {
      await runPlan(planBody);
      return;
    }

    if (/^soen:\s*/i.test(text)) {
      const q = text.replace(/^soen:\s*/i, '').trim();
      if (q) { onSoen(q); return; }
    }

    onSoen(text);
  };

  return (
    <div className="cmdwrap">
      <div id="chips">
        <span onClick={() => setV('plan: ')}>＋ plan:</span>
        <span onClick={() => setV('recipe: ')}>＋ recipe:</span>
        <span onClick={() => openSheet({ type: 'log' })}>＋ log day</span>
        <span onClick={() => openSheet({ type: 'shot' })}>shot list</span>
        <span onClick={() => openSheet({ type: 'retune' })}>retune</span>
      </div>
      <div className="cmd">
        <span className="slash">/</span>
        <input ref={inputRef} value={v} onChange={e => setV(e.target.value)} onKeyDown={e => e.key === 'Enter' && void run()}
          placeholder={busy ? 'SOEN is thinking…' : 'Ask SOEN… · plan: dinner Fri 7pm · recipe: katsu'} style={{ flex: 1 }} />
        <button className="go" onClick={() => void run()}>{busy ? '…' : 'Ask'}</button>
      </div>
    </div>
  );
}
