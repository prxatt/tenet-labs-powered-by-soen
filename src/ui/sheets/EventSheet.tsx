import { useState } from 'react';
import type { Block, BlockClass } from '../../core/types';
import { CAMP0, CAMP_END, DN, MN, addD, fmt, fromKey, key } from '../../core/dates';
import { gcalLink, MAPQ } from '../../core/schedule';
import { store } from '../../core/store';
import { toast } from '../hooks';
import Sheet from '../Sheet';

const CLASSES: { v: BlockClass; l: string }[] = [
  { v: 'tGreen', l: 'Deep work' }, { v: 'tGreen2', l: 'Focus' }, { v: 'tRed', l: 'Training' },
  { v: 'tBlue', l: 'Run / Sense' }, { v: 'tPlum', l: 'Recovery / life' }, { v: 'tAmber', l: 'Fuel / errand' },
];

function dayOpts(): { k: string; l: string }[] {
  const out: { k: string; l: string }[] = [];
  for (let d = new Date(CAMP0); d <= CAMP_END; d = addD(d, 1)) {
    out.push({ k: key(d), l: `${DN[d.getDay()]} ${MN[d.getMonth()].slice(0, 3)} ${d.getDate()}` });
  }
  return out;
}

function timeOpts(cur: number): number[] {
  const out: number[] = [];
  for (let t = 6; t <= 22.5; t += 0.25) out.push(t);
  if (!out.includes(cur)) out.push(cur);
  return out.sort((a, b) => a - b);
}

function durOpts(cur: number): number[] {
  const out = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3, 3.5, 4, 5];
  if (!out.includes(cur)) out.push(cur);
  return out.sort((a, b) => a - b);
}

export default function EventSheet({ block, shownOn, onClose }: { block: Block; shownOn: string; onClose: () => void }) {
  const mk = block.date + '|' + block.id;
  const st = store.get().plan;
  const isDone = !!st.done[mk];
  const [editing, setEditing] = useState(false);
  const [ti, setTi] = useState(block.ti);
  const [su, setSu] = useState(block.su || '');
  const [day, setDay] = useState(shownOn);
  const [t, setT] = useState(block.t);
  const [dur, setDur] = useState(block.dur);
  const [cls, setCls] = useState<BlockClass>(block.cls);

  const save = () => {
    store.updatePlan(p => {
      const out: any = {};
      if (block.cust) {
        // custom events: edit in place (and move between days if needed)
        const custom = { ...p.custom };
        const src = shownOn;
        const list = (custom[src] || []).filter(c => c.id !== block.id);
        custom[src] = list;
        const ev = { id: block.id, t, dur, ti, su, fo: block.fo, cls };
        custom[day] = [...(custom[day] || []), ev];
        out.custom = custom;
      } else {
        const edits = { ...p.edits, [mk]: { ...p.edits[mk], ti, su, dur, cls } };
        out.edits = edits;
        const moves = { ...p.moves }, times = { ...p.times };
        if (day !== block.date) moves[mk] = day; else delete moves[mk];
        times[day + '|' + block.id] = t;
        out.moves = moves; out.times = times;
      }
      return out;
    });
    toast('Saved — synced');
    onClose();
  };

  const resetEdits = () => {
    store.updatePlan(p => {
      const edits = { ...p.edits }; delete edits[mk];
      const moves = { ...p.moves }; delete moves[mk];
      return { edits, moves };
    });
    toast('Restored original'); onClose();
  };

  const del = () => {
    store.updatePlan(p => ({ custom: { ...p.custom, [shownOn]: (p.custom[shownOn] || []).filter(c => c.id !== block.id) } }));
    toast('Deleted'); onClose();
  };

  const mapq = MAPQ[block.id];
  const d = fromKey(shownOn);

  return (
    <Sheet onClose={onClose}>
      {!editing ? (
        <>
          <span className="pill">{block.fo}</span>
          <h3 className="serif">{block.ti}</h3>
          <div className="sub">{fmt(block.t)}–{fmt(block.t + block.dur)} · {DN[d.getDay()]} {d.getDate()}</div>
          {block.su && <div className="sec"><h6>Details</h6><p style={{ fontSize: '.76rem' }}>{block.su}</p></div>}
          <button className="btnP" onClick={() => { store.toggleDone(mk); toast(isDone ? 'Unchecked' : 'Done — score updated'); onClose(); }}>
            {isDone ? '↺ Mark not done' : '✓ Mark done'}
          </button>
          <button className="btnS" onClick={() => setEditing(true)}>Edit event — title · time · day · length · color</button>
          {block.cust ? <button className="btnS" onClick={del}>Delete this event</button> : null}
          {!block.cust && (st.edits[mk] || st.moves[mk]) ? <button className="btnS" onClick={resetEdits}>Reset to original</button> : null}
          {block.id === 'box' && (
            <div className="sec"><h6>Door-to-door — why this block is 4 hours</h6>
              {[['11:00', 'Drive from 23rd & Lake (~15 min)'], ['11:15', 'Park + walk in (~10 min)'], ['11:30', 'Change, wrap hands, warm up (~25 min)'], ['12:00', 'Class (60–75 min)'], ['1:15', 'Strength A/B (Mon/Thu) or cooldown (~25 min)'], ['1:45', 'Shower + change (~20 min)'], ['2:10', 'Walk to car + drive home (~30 min)'], ['~2:45', 'Home → shake + main meal at 3:00']].map(([k2, v]) => (
                <div className="row" key={k2}><span className="k">{k2}</span><span>{v}</span></div>
              ))}
            </div>
          )}
          {mapq && (
            <div className="sec"><h6>Location</h6>
              <iframe title="map" src={`https://maps.google.com/maps?q=${encodeURIComponent(mapq)}&output=embed`}
                style={{ width: '100%', height: 190, border: 0, borderRadius: 14 }} loading="lazy" />
            </div>
          )}
          <a href={gcalLink(block, shownOn)} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
            <button className="btnS">Push to Google Calendar</button>
          </a>
        </>
      ) : (
        <>
          <span className="pill">Edit</span>
          <h3 className="serif">Edit event</h3>
          <div className="sec"><h6>Title</h6><input value={ti} onChange={e => setTi(e.target.value)} /></div>
          <div className="sec"><h6>Notes</h6><textarea rows={2} value={su} onChange={e => setSu(e.target.value)} /></div>
          <div className="sec two">
            <div><h6>Day</h6>
              <select value={day} onChange={e => setDay(e.target.value)}>
                {dayOpts().map(o => <option key={o.k} value={o.k}>{o.l}</option>)}
              </select></div>
            <div><h6>Start</h6>
              <select value={t} onChange={e => setT(+e.target.value)}>
                {timeOpts(t).map(x => <option key={x} value={x}>{fmt(x)}</option>)}
              </select></div>
          </div>
          <div className="sec two">
            <div><h6>Length</h6>
              <select value={dur} onChange={e => setDur(+e.target.value)}>
                {durOpts(dur).map(x => <option key={x} value={x}>{x < 1 ? Math.round(x * 60) + ' min' : x + ' h'}</option>)}
              </select></div>
            <div><h6>Color</h6>
              <select value={cls} onChange={e => setCls(e.target.value as BlockClass)}>
                {CLASSES.map(c => <option key={c.v} value={c.v}>{c.l}</option>)}
              </select></div>
          </div>
          {!block.mv && !block.cust && <p className="hint" style={{ textAlign: 'left', marginTop: 10 }}>This is a locked training block — title/notes edits apply, but consider keeping its time (trainers own it).</p>}
          <button className="btnP" onClick={save}>Save changes</button>
          <button className="btnS" onClick={() => setEditing(false)}>Cancel</button>
        </>
      )}
    </Sheet>
  );
}
