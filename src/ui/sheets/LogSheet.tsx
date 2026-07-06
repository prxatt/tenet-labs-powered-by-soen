import { useState } from 'react';
import { DN, key } from '../../core/dates';
import { store } from '../../core/store';
import { toast } from '../hooks';
import Sheet from '../Sheet';

export default function LogSheet({ cur, onClose }: { cur: Date; onClose: () => void }) {
  const k = key(cur);
  const l = store.get().plan.logs[k] || {};
  const [e, setE] = useState(l.e ? String(l.e) : '');
  const [q, setQ] = useState(l.q ? String(l.q) : '');
  const [n, setN] = useState(l.n || '');
  return (
    <Sheet onClose={onClose}>
      <h3 className="serif">Log — {DN[cur.getDay()]} {cur.getDate()}</h3>
      <div className="sub">Weight syncs from Oura — no manual entry needed.</div>
      <div className="sec two">
        <div><h6>Energy /10</h6><input type="number" min={1} max={10} value={e} onChange={ev => setE(ev.target.value)} placeholder="7" /></div>
        <div><h6>Class /10</h6><input type="number" min={1} max={10} value={q} onChange={ev => setQ(ev.target.value)} placeholder="8" /></div>
      </div>
      <div className="sec"><h6>Gym note — what did class contain?</h6>
        <textarea rows={3} value={n} onChange={ev => setN(ev.target.value)} placeholder="6 rds pads (counters), 3 rds bag hooks, slip drill, core" />
      </div>
      <button className="btnP" onClick={() => {
        store.updatePlan(p => ({ logs: { ...p.logs, [k]: { e: +e || null, q: +q || null, n } } }));
        toast('Logged — synced'); onClose();
      }}>Save</button>
    </Sheet>
  );
}
