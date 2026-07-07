import { useEffect, useState } from 'react';
import { soenContext } from '../core/ai';
import { aiCall } from '../core/api';
import { behaviorSummary } from '../core/habits';
import { key, weekIdx } from '../core/dates';
import { useApp } from './hooks';

function buildSuggestions(oura: Record<string, import('../core/types').OuraDay>): string[] {
  const o = oura[key(new Date())] || {};
  const dow = new Date().getDay();
  const h = new Date().getHours();
  const qs: string[] = [];
  if (o.r && o.r < 65) qs.push(`My readiness is ${o.r} — how should I modify today's boxing class?`);
  if (o.st === 2) qs.push('Oura shows a stressful day — give me a 5-minute reset between work blocks.');
  if ([1, 3, 4, 5].includes(dow)) qs.push(`One technical focus for today's class (week ${weekIdx(new Date()) + 1}).`);
  if (dow === 6) qs.push('Plan my 2-hour Sense lab today — pose pipeline steps on my Mac.');
  if (h >= 17 && h < 21) qs.push("Suggest tonight's dinner with grilled chicken, dal, rice, paneer in prep.");
  else if (h < 12) qs.push('What should I prioritize in my morning deep-work block today?');
  else qs.push('What should the TENET landing page hero say? 3 options, founder-who-boxes angle.');
  return qs.slice(0, 4);
}

export default function SoenModal({ question, onClose }: { question: string; onClose: () => void }) {
  const app = useApp();
  const [answer, setAnswer] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [followUp, setFollowUp] = useState('');
  const [showSug, setShowSug] = useState(false);
  const suggestions = buildSuggestions(app.oura);

  const ask = async (text: string) => {
    setBusy(true);
    setAnswer(null);
    const ctx = soenContext(app.plan, app.oura, new Date(), behaviorSummary());
    const a = await aiCall(ctx + ' Q: ' + text);
    setAnswer(a || 'AI unavailable — add a Groq/Gemini key in Settings (or enable Ollama).');
    setBusy(false);
  };

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    void ask(question);
    return () => { document.body.style.overflow = ''; };
  }, [question]);

  return (
    <div className="modal-ios" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="card-ios">
        <button className="x" onClick={onClose} aria-label="Close">✕</button>
        <h4>SOEN</h4>
        <p className="q">{question}</p>
        {busy && <p className="hint">Thinking…</p>}
        {answer && <div className="ans">{answer}</div>}
        <button type="button" className="sug-toggle" onClick={() => setShowSug(v => !v)}>
          {showSug ? '▾ Hide suggestions' : '▸ Suggestions for right now'}
        </button>
        {showSug && (
          <div className="sug-list">
            {suggestions.map(s => (
              <button key={s} type="button" className="btnS" onClick={() => void ask(s)}>{s}</button>
            ))}
          </div>
        )}
        <div style={{ marginTop: 12, display: 'flex', gap: 6 }}>
          <input value={followUp} onChange={e => setFollowUp(e.target.value)} placeholder="Follow-up…"
            onKeyDown={e => e.key === 'Enter' && followUp.trim() && (void ask(followUp.trim()), setFollowUp(''))} />
          <button type="button" className="btnS" style={{ margin: 0, width: 'auto', padding: '0 14px' }}
            onClick={() => { if (followUp.trim()) { void ask(followUp.trim()); setFollowUp(''); } }}>Ask</button>
        </div>
      </div>
    </div>
  );
}
