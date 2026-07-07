import { useEffect, useState } from 'react';
import { key, weekIdx } from '../../core/dates';
import { soenContext, retunePrompt } from '../../core/ai';
import { aiCall } from '../../core/api';
import { store } from '../../core/store';
import Sheet from '../Sheet';

export default function AskSheet({ cur, retune, prefill, onClose }: { cur: Date; retune?: boolean; prefill?: string; onClose: () => void }) {
  const [q, setQ] = useState(prefill || '');
  const [out, setOut] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { plan, oura } = store.get();

  const autoQs = (() => {
    const o = oura[key(new Date())] || {};
    const dow = new Date().getDay();
    const qs: string[] = [];
    if (o.r && o.r < 65) qs.push(`My readiness is ${o.r} — how should I modify today's boxing class?`);
    if (o.st === 2) qs.push('Oura shows a stressful day — give me a 5-minute reset I can do between work blocks.');
    if ([1, 3, 4, 5].includes(dow)) qs.push(`Give me one technical focus for today's class based on a beginner's week ${weekIdx(new Date()) + 1}.`);
    if (dow === 6) qs.push('Plan my 2-hour Sense lab today — exact steps for the pose pipeline on my Mac.');
    qs.push('What should the TENET landing page hero say? 3 options, founder-who-boxes angle.');
    qs.push("Suggest tonight's dinner variation with what's in my prep (grilled chicken, dal, rice, paneer).");
    return qs.slice(0, 4);
  })();

  const run = async (text: string) => {
    setBusy(true); setOut(null);
    const a = await aiCall(retune ? retunePrompt(plan, oura, cur) : soenContext(plan, oura, cur) + ' Q: ' + text);
    setBusy(false);
    setOut(a || 'AI unavailable — add a Groq/Gemini key in Settings (or enable Ollama).');
  };

  useEffect(() => { if (retune) void run(''); }, []);
  useEffect(() => { if (prefill?.trim()) void run(prefill.trim()); }, [prefill]);

  return (
    <Sheet onClose={onClose}>
      <h3 className="serif">{retune ? 'Retune' : 'Ask SOEN'}</h3>
      <div className="sub">{retune ? 'SOEN reads your last week (Oura + completion) and proposes adjustments. Suggestions only.' : 'Auto-generated from your day, goals & Oura — or type anything.'}</div>
      {!retune && (
        <>
          <div className="sec">
            {autoQs.map(x => <button key={x} className="btnS" style={{ textAlign: 'left' }} onClick={() => { setQ(x); void run(x); }}>{x}</button>)}
          </div>
          <div className="sec">
            <textarea rows={2} value={q} onChange={e => setQ(e.target.value)} placeholder="Ask anything…" />
            <button className="btnP" onClick={() => q.trim() && run(q)}>Ask</button>
          </div>
        </>
      )}
      <div className="sec">
        {busy && <p className="hint">Thinking…</p>}
        {out && <div className="card" style={{ fontSize: '.76rem', whiteSpace: 'pre-wrap' }}>{out}</div>}
      </div>
    </Sheet>
  );
}
