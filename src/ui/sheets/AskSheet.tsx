import { useEffect, useState } from 'react';
import { behaviorSummary } from '../../core/habits';
import { retunePrompt } from '../../core/ai';
import { aiCall } from '../../core/api';
import { store } from '../../core/store';
import Sheet from '../Sheet';

export default function AskSheet({ cur, retune, onClose }: { cur: Date; retune?: boolean; onClose: () => void }) {
  const [out, setOut] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { plan, oura } = store.get();
  const note = behaviorSummary();

  const run = async () => {
    setBusy(true); setOut(null);
    const a = await aiCall(retunePrompt(plan, oura, cur, note));
    setBusy(false);
    setOut(a || 'AI unavailable — add a Groq/Gemini key in Settings (or enable Ollama).');
  };

  useEffect(() => { if (retune) void run(); }, []);

  return (
    <Sheet onClose={onClose}>
      <h3 className="serif">Retune</h3>
      <div className="sub">SOEN reads your last week (Oura + completion + learned habits) and proposes adjustments.</div>
      <div className="sec">
        {busy && <p className="hint">Thinking…</p>}
        {out && <div className="card" style={{ fontSize: '.76rem', whiteSpace: 'pre-wrap' }}>{out}</div>}
      </div>
    </Sheet>
  );
}
