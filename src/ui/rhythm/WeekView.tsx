import { useEffect, useRef, useState } from 'react';
import type { Block } from '../../core/types';
import { CAMP0, DATE_NIGHTS, DN, addD, fmt, fromKey, key, weekIdx } from '../../core/dates';
import { blocksFor, swapDays } from '../../core/schedule';
import { weekAgg } from '../../core/scoring';
import { store } from '../../core/store';
import { useApp, toast } from '../hooks';
import type { SheetReq } from '../App';

const BUCKET_COLORS = { work: 'var(--green2)', train: 'var(--red)', rec: 'var(--plum)' } as const;

export default function WeekView({ cur, openSheet }: { cur: Date; openSheet: (s: SheetReq) => void }) {
  const { plan, oura } = useApp();
  const w = weekIdx(cur);
  const mon = addD(CAMP0, w * 7);
  const agg = weekAgg(cur, plan, oura);
  const valid = agg.scores.filter((x): x is number => x != null);
  const wkAvg = valid.length ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : null;
  const pts = agg.scores.map(x => (x == null ? 55 : x));
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${i * 50},${58 - p / 100 * 52}`).join(' ');
  const maxStack = Math.max(...agg.stacks.map(s => s.work + s.train + s.rec), 1);
  const C = 2 * Math.PI * 11;

  /* ---- drag state (cards + day swap) ---- */
  const [swapSrc, setSwapSrc] = useState<string | null>(null);
  const ghost = useRef<HTMLDivElement>(null);
  const drag = useRef<{ kind: 'card'; b: Block; el: HTMLElement } | { kind: 'day'; k: string; el: HTMLElement } | null>(null);

  const hitCol = (x: number, y: number): string | null => {
    let dest: string | null = null;
    document.querySelectorAll<HTMLElement>('.kcol').forEach(c => {
      const r = c.getBoundingClientRect();
      const over = x > r.left && x < r.right && y > r.top && y < r.bottom;
      c.classList.toggle('dropover', over);
      if (over) dest = c.dataset.k || null;
    });
    return dest;
  };

  useEffect(() => {
    const mv = (e: PointerEvent) => {
      if (!drag.current || !ghost.current) return;
      e.preventDefault();
      ghost.current.style.left = e.clientX - 110 + 'px';
      ghost.current.style.top = e.clientY - 24 + 'px';
      hitCol(e.clientX, e.clientY);
    };
    const up = (e: PointerEvent) => {
      if (!drag.current) return;
      const dest = hitCol(e.clientX, e.clientY);
      document.querySelectorAll('.kcol').forEach(c => c.classList.remove('dropover'));
      if (ghost.current) ghost.current.style.display = 'none';
      const d = drag.current; drag.current = null;
      d.el.style.opacity = '1';
      if (!dest) return;
      if (d.kind === 'card') {
        const mk = d.b.date + '|' + d.b.id;
        const shown = plan.moves[mk] || d.b.date;
        if (d.b.mv && dest !== shown) {
          store.updatePlan(p => {
            const moves = { ...p.moves };
            if (dest === d.b.date) delete moves[mk]; else moves[mk] = dest;
            return { moves };
          });
          toast('Moved — synced');
        } else if (!d.b.mv) toast('Locked — trainers own that one');
      } else if (d.kind === 'day' && dest !== d.k) {
        store.updatePlan(p => swapDays(d.k, dest, p));
        toast(`Swapped ${DN[fromKey(d.k).getDay()]} ↔ ${DN[fromKey(dest).getDay()]} — synced`);
      }
    };
    addEventListener('pointermove', mv, { passive: false });
    addEventListener('pointerup', up);
    return () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); };
  }, [plan]);

  const startCardDrag = (b: Block, el: HTMLElement, x: number, y: number) => {
    drag.current = { kind: 'card', b, el };
    el.style.opacity = '.35';
    if (ghost.current) {
      ghost.current.innerHTML = el.innerHTML;
      ghost.current.style.display = 'block';
      ghost.current.style.left = x - 110 + 'px';
      ghost.current.style.top = y - 24 + 'px';
    }
    navigator.vibrate?.(10);
  };

  const startDayDrag = (k: string, el: HTMLElement, x: number, y: number) => {
    drag.current = { kind: 'day', k, el };
    el.style.opacity = '.4';
    if (ghost.current) {
      ghost.current.innerHTML = `<b>Swap ${DN[fromKey(k).getDay()]} ${fromKey(k).getDate()}</b><small>drop on another day</small>`;
      ghost.current.style.display = 'block';
      ghost.current.style.left = x - 110 + 'px';
      ghost.current.style.top = y - 24 + 'px';
    }
    navigator.vibrate?.(10);
  };

  const tapHeader = (k: string) => {
    if (!swapSrc) { setSwapSrc(k); toast('Swap armed — tap another day header to swap'); return; }
    if (swapSrc === k) { setSwapSrc(null); return; }
    store.updatePlan(p => swapDays(swapSrc, k, p));
    toast(`Swapped ${DN[fromKey(swapSrc).getDay()]} ↔ ${DN[fromKey(k).getDay()]} — synced`);
    setSwapSrc(null);
  };

  return (
    <>
      <div className="wsum">
        <div className="card"><h6 className="lab">WORK HOURS — TARGET 40h/WEEK</h6>
          <div className="big">{agg.workT.toFixed(1).replace('.0', '')}h scheduled</div>
          <div className="pbar"><i style={{ width: Math.min(100, agg.workT / 40 * 100) + '%' }} /></div>
          <div style={{ fontSize: '.62rem', color: 'var(--sub)', marginTop: 6 }}>
            {agg.workT >= 40 ? '40h target hit — protected by design' : 'Target 40h — flex Sat/Sun blocks are the top-up'}
          </div>
          <div className="wstack">
            {agg.stacks.map((s, i) => (
              <div className="wd" key={i}>
                <div className="wcol">
                  {(['work', 'train', 'rec'] as const).map(kk => (
                    <i key={kk} style={{ height: (s[kk] / maxStack) * 92 + 'px', background: BUCKET_COLORS[kk] }} />
                  ))}
                </div>
                <small>{'MTWTFSS'[i]}</small>
              </div>
            ))}
          </div>
          <div className="legend">
            <span><i style={{ background: 'var(--green2)' }} />Deep work</span>
            <span><i style={{ background: 'var(--red)' }} />Training</span>
            <span><i style={{ background: 'var(--plum)' }} />Recovery</span>
          </div>
        </div>
        <div className="card"><h6 className="lab">WEEK SCORE — PLANNED VS DONE × OURA</h6>
          <div className="big serif">{wkAvg ?? '—'}</div>
          <p style={{ fontSize: '.7rem', color: 'var(--sub)' }}>
            {valid.length ? `Avg of ${valid.length} scored day(s) · Oura × completion` : 'Scores appear as days are lived.'}
          </p>
          <h6 className="lab" style={{ marginTop: 12 }}>FLOW — daily SOEN scores</h6>
          <svg className="flow" viewBox="0 0 300 60" preserveAspectRatio="none">
            <path d={path + ' L300,60 L0,60 Z'} fill="rgba(79,122,88,.12)" />
            <path d={path} fill="none" stroke="var(--green2)" strokeWidth="2.5" strokeLinecap="round" />
            {agg.scores.map((s, i) => s != null && <circle key={i} cx={i * 50} cy={58 - s / 100 * 52} r="3.5" fill="var(--green)" />)}
          </svg>
          <div className="wrings">
            {agg.scores.map((s, i) => (
              <div key={i}>
                <svg width="26" height="26">
                  <circle cx="13" cy="13" r="11" fill="none" stroke="var(--line)" strokeWidth="3" />
                  <circle cx="13" cy="13" r="11" fill="none" stroke={s != null && s >= 78 ? 'var(--green)' : s != null && s >= 60 ? 'var(--amber)' : 'var(--red)'}
                    strokeWidth="3" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - (s || 0) / 100)} opacity={s == null ? 0 : 1} />
                </svg>
                <small>{'MTWTFSS'[i]}</small>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 14 }}><h6 className="lab">TOP PRIORITIES</h6>
        {[
          ['TENET Boxing build — 40h wk, morning blocks are sacred', '#1'],
          ['4 classes + Fri: film one round (Sense data + your review)', 'locked'],
          ['3× edX Prompt Engineering modules', 'habit'],
          ['Sat Sense lab: ' + (w < 1 ? 'run pose pipeline on existing footage' : w < 3 ? 'ESP32 bench' : 'fusion demo'), 'hobby'],
          [DATE_NIGHTS.some(x => weekIdx(fromKey(x)) === w) ? 'Date night Friday' : 'Movie/partner time where it lands', 'protected'],
        ].map(p => (
          <div className="row" key={p[0]}><span style={{ flex: 1 }}>{p[0]}</span>
            <span style={{ color: 'var(--dim)', fontSize: '.6rem', fontWeight: 700 }}>{p[1]}</span></div>
        ))}
      </div>

      <p className="hint">Drag ⠿ cards between days · drag (or tap) a day header onto another to swap whole days · tap cards for details.</p>
      <div className="kwrap">
        {[0, 1, 2, 3, 4, 5, 6].map(i => {
          const d = addD(mon, i);
          const k = key(d);
          const B = blocksFor(d, plan);
          const s = agg.scores[i];
          return (
            <div className={'kcol' + (k === key(new Date()) ? ' today' : '') + (swapSrc === k ? ' swapsrc' : '')} data-k={k} key={k}>
              <h5 role="button" aria-label={'Day header ' + DN[d.getDay()] + ' ' + d.getDate()}
                onPointerDown={e => {
                  const el = e.currentTarget.parentElement as HTMLElement;
                  const sx = e.clientX, sy = e.clientY;
                  let started = false;
                  const onMove = (ev: PointerEvent) => {
                    if (!started && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 12) {
                      started = true; startDayDrag(k, el, ev.clientX, ev.clientY);
                      removeEventListener('pointermove', onMove);
                    }
                  };
                  const onUp = () => {
                    removeEventListener('pointermove', onMove);
                    removeEventListener('pointerup', onUp);
                    if (!started && !drag.current) tapHeader(k);
                  };
                  addEventListener('pointermove', onMove);
                  addEventListener('pointerup', onUp);
                }}>
                <span>{DN[d.getDay()].toUpperCase()} {d.getDate()}</span>
                <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span className="swp">swap</span>{s ?? ''}
                </span>
              </h5>
              {B.filter(b => !['rit', 'wind', 'read', 'med'].includes(b.id)).map(b => {
                const dk = b.date + '|' + b.id;
                const isDone = !!plan.done[dk];
                const barColor = { tRed: 'var(--red)', tBlue: 'var(--blue)', tPlum: 'var(--plum)', tAmber: 'var(--amber)', tGreen: 'var(--green)', tGreen2: 'var(--green2)', tGhost: 'var(--dim)' }[b.cls];
                return (
                  <div className={'kcard' + (b.mv ? ' mov' : ' lockk') + (isDone ? ' done' : '')} key={dk} role="button" aria-label={b.ti}
                    onPointerDown={e => {
                      if (!b.mv) return;
                      const el = e.currentTarget as HTMLElement;
                      const sx = e.clientX, sy = e.clientY;
                      let started = false;
                      const timer = setTimeout(() => { started = true; startCardDrag(b, el, sx, sy); }, (e as any).pointerType === 'touch' ? 280 : 120);
                      const onMove = (ev: PointerEvent) => {
                        if (!started && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 10) clearTimeout(timer);
                      };
                      const onUp = () => {
                        clearTimeout(timer);
                        removeEventListener('pointermove', onMove);
                        removeEventListener('pointerup', onUp);
                        if (!started && !drag.current) openSheet({ type: 'event', block: b, shownOn: k });
                      };
                      addEventListener('pointermove', onMove);
                      addEventListener('pointerup', onUp);
                    }}
                    onClick={() => { if (!b.mv) openSheet({ type: 'event', block: b, shownOn: k }); }}>
                    <span className="bar" style={{ background: barColor }} />
                    <b>{b.ti}</b><small>{fmt(b.t)} · {b.fo}</small>
                    {!b.mv && <span className="lk" />}
                    <span className={'ckbox' + (isDone ? ' ok' : '')}
                      onPointerUp={e => { e.stopPropagation(); store.toggleDone(dk); }} />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      <div className="kcard" id="ghost" ref={ghost} />
    </>
  );
}
