import { useEffect, useState } from 'react';
import type { Block, BlockClass } from '../../core/types';
import { CAMP0, PHASE, addD, fmt, key, weekIdx } from '../../core/dates';
import { BFAST, DINNER, MAIN, blocksFor, isKey } from '../../core/schedule';
import { completion, soenScore } from '../../core/scoring';
import { findRecipe } from '../../core/recipes';
import { ghStatus, syncOura, getOuraError, type RepoStatus } from '../../core/api';
import { store } from '../../core/store';
import { useApp, toast } from '../hooks';
import type { SheetReq } from '../App';

function blockTag(cls: BlockClass): string {
  if (cls === 'tGreen' || cls === 'tGreen2') return 'Deep Work';
  if (cls === 'tRed') return 'Training';
  if (cls === 'tBlue') return 'Recovery';
  if (cls === 'tPlum') return 'Travel';
  if (cls === 'tAmber') return 'Focus';
  return 'Block';
}

function durMin(dur: number): string {
  const m = Math.round(dur * 60);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60 ? m % 60 + 'm' : ''}`.trim() : `${m} min`;
}

function nowH(): number {
  const n = new Date();
  return n.getHours() + n.getMinutes() / 60;
}

function FocusCard({ cur, openSheet }: { cur: Date; openSheet: (s: SheetReq) => void }) {
  const { plan } = useApp();
  const k = key(cur);
  const nh = nowH();
  const B = blocksFor(cur, plan).filter(isKey);
  const current = B.find(b => !plan.done[b.date + '|' + b.id] && b.t <= nh && b.t + b.dur > nh);
  const next = B.find(b => !plan.done[b.date + '|' + b.id] && b.t > nh);
  const focus = current || next;
  const comp = completion(cur, plan);
  const w = weekIdx(cur);

  if (!focus) {
    return (
      <div className="rhythm-hero rhythm-hero-done">
        <p className="rhythm-eyebrow">Today&apos;s focus</p>
        <h2 className="rhythm-hero-title serif">All key blocks done</h2>
        <p className="rhythm-hero-meta">{comp === 100 ? 'Rare air — bank the win or add a stretch goal.' : 'Check Plan for the full timeline.'}</p>
      </div>
    );
  }

  const isNow = !!current;
  return (
    <button type="button" className="rhythm-hero" onClick={() => openSheet({ type: 'event', block: focus, shownOn: k })}>
      <div className="rhythm-hero-top">
        <p className="rhythm-eyebrow">{isNow ? 'Now' : "Today's focus"} · Week {w + 1} {PHASE[w]}</p>
        <span className="rhythm-hero-ring" aria-hidden>
          <svg width="36" height="36" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15" fill="none" stroke="var(--line)" strokeWidth="2.5" />
            <circle cx="18" cy="18" r="15" fill="none" stroke="var(--green2)" strokeWidth="2.5" strokeLinecap="round"
              strokeDasharray="94" strokeDashoffset={94 * (1 - (comp ?? 0) / 100)} transform="rotate(-90 18 18)" />
          </svg>
        </span>
      </div>
      <h2 className="rhythm-hero-title serif">{focus.ti}</h2>
      <p className="rhythm-hero-meta">
        {blockTag(focus.cls)} · {fmt(focus.t)}{isNow ? ' · now' : ''} · {durMin(focus.dur)}
      </p>
      {focus.su && <p className="rhythm-hero-sub">{focus.su}</p>}
    </button>
  );
}

function SoenInsight({ cur, openSheet }: { cur: Date; openSheet: (s: SheetReq) => void }) {
  const { plan, oura } = useApp();
  const k = key(cur);
  const o = oura[k] || {};
  const nh = nowH();
  const B = blocksFor(cur, plan);
  const comp = completion(cur, plan);
  const isToday = k === key(new Date());
  const nxt = B.find(b => b.t > nh && isKey(b) && !plan.done[b.date + '|' + b.id]);

  let txt: React.ReactNode;
  if (o.r && o.r < 60) {
    txt = <>Readiness {o.r} — <b>ease up today</b>: technique over intensity, protect your 11 PM wind-down.</>;
  } else if (!isToday) {
    txt = <>Planned day. Mark blocks ✓ as you go — SOEN score blends Oura with what you finish.</>;
  } else if (comp !== null && comp >= 85 && nh < 20) {
    txt = <>{comp}% done early — <b>you&apos;re ahead</b>. Bank rest, Sense lab, or one extra module.</>;
  } else if (nxt) {
    txt = <>{nh < 11 ? 'Morning energy is high — ' : ''}Ideal window for <b>{nxt.ti}</b> at {fmt(nxt.t)}.
      {o.st === 2 ? ' Take 5 slow breaths first — Oura shows elevated stress.' : ''}</>;
  } else {
    txt = <>Day winding down. Cacao, reading, lights out — tomorrow is already built.</>;
  }

  return (
    <div className="rhythm-soen">
      <p className="rhythm-soen-text">{txt}</p>
      <button type="button" className="rhythm-soen-btn" onClick={() => openSheet({ type: 'retune' })}>Retune with SOEN</button>
    </div>
  );
}

function WhatsNext({ cur, openSheet }: { cur: Date; openSheet: (s: SheetReq) => void }) {
  const { plan } = useApp();
  const k = key(cur);
  const nh = nowH();
  const B = blocksFor(cur, plan).filter(isKey);
  const open = B.filter(b => !plan.done[b.date + '|' + b.id]);
  const now = open.find(b => b.t <= nh && b.t + b.dur > nh);
  const later = open.filter(b => b !== now).slice(0, 4);
  if (!open.length) return null;

  const row = (b: Block, highlight?: boolean) => (
    <button type="button" key={b.date + b.id} className={'rhythm-next-row' + (highlight ? ' rhythm-next-now' : '')}
      onClick={() => openSheet({ type: 'event', block: b, shownOn: k })}>
      <div className="rhythm-next-main">
        <b>{b.ti}</b>
        <small>{fmt(b.t)} – {fmt(b.t + b.dur)} · {durMin(b.dur)}</small>
      </div>
      <span className={'rhythm-tag rhythm-tag-' + b.cls}>{blockTag(b.cls)}</span>
    </button>
  );

  return (
    <div className="card rhythm-card">
      <h6 className="rhythm-card-title">What&apos;s on your plan</h6>
      {now && (
        <>
          <p className="rhythm-section-label">Now</p>
          {row(now, true)}
        </>
      )}
      {later.length > 0 && (
        <>
          <p className="rhythm-section-label">{now ? 'Later today' : 'Up next'}</p>
          <div className="rhythm-next-list">{later.map(b => row(b))}</div>
        </>
      )}
      <div className="rhythm-focus-goal">
        <span>Daily focus</span>
        <span><b>{B.filter(b => plan.done[b.date + '|' + b.id]).length}</b> of <b>{B.length}</b> key blocks</span>
        <div className="pbar"><i style={{ width: (B.length ? B.filter(b => plan.done[b.date + '|' + b.id]).length / B.length * 100 : 0) + '%' }} /></div>
      </div>
    </div>
  );
}

function EnergyForecast({ cur }: { cur: Date }) {
  const { oura } = useApp();
  const o = oura[key(cur)] || {};
  const h = new Date().getHours();
  const base = [35, 45, 72, 85, 80, 60, 55, 70, 75, 65, 50, 35];
  const mod = o.r ? (o.r - 70) / 3 : 0;
  const pts = base.map((v, i) => [i * 300 / 11, 56 - Math.min(50, Math.max(8, v + mod)) * 0.85] as [number, number]);
  const path = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(0) + ',' + p[1].toFixed(0)).join(' ');
  const hi = Math.max(0, Math.min(11, Math.round((h - 7) / 1.5)));
  const labels = ['Now', '10a', '12p', '2p', '4p', '6p', '8p'];
  const summary = h < 11
    ? 'Energy peaks now — hardest problem first.'
    : h < 15 ? 'Post-lunch dip — lighter tasks or a walk.' : 'Descending curve — admin and wind-down fit here.';
  const bestFor = h < 11 ? ['Deep work', 'Creative tasks'] : h < 15 ? ['Meetings', 'Build work'] : ['Admin', 'Learning'];

  return (
    <div className="card rhythm-card rhythm-insight-card">
      <h6 className="rhythm-card-title">Energy forecast</h6>
      <p className="rhythm-insight-sub">{summary}</p>
      <div className="rhythm-chart-wrap">
        <svg viewBox="0 0 300 64" className="rhythm-chart" preserveAspectRatio="none">
          <path d={`${path} L300,64 L0,64 Z`} className="rhythm-chart-fill" />
          <path d={path} className="rhythm-chart-line" fill="none" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx={hi * 300 / 11} cy={pts[hi][1]} r="5" className="rhythm-chart-dot" />
        </svg>
        <div className="rhythm-chart-labels">
          {labels.map(l => <span key={l}>{l}</span>)}
        </div>
      </div>
      <div className="rhythm-best-for">
        <span className="rhythm-section-label">Best for</span>
        <div className="rhythm-chips">{bestFor.map(t => <span key={t} className="rhythm-chip">{t}</span>)}</div>
      </div>
    </div>
  );
}

function StressInsight({ cur }: { cur: Date }) {
  const { oura } = useApp();
  const o = oura[key(cur)] || {};
  const level = o.st == null ? null : ['Low', 'Med', 'High'][o.st];
  const tone = o.st === 2 ? 'high' : o.st === 1 ? 'med' : 'low';
  const msg = o.st === 2
    ? 'Elevated stress — protect recovery and skip intensity spikes.'
    : o.st === 1 ? 'Moderate load — stay on rhythm, one thing at a time.'
      : o.r && o.r >= 75 ? 'Body and mind are aligned. Good day to push focus.'
        : 'Connect Oura in Settings for live stress insights.';

  const helping: string[] = [];
  if (o.s != null && o.s >= 75) helping.push('Good sleep');
  if (o.r != null && o.r >= 70) helping.push('Solid readiness');
  if (new Date().getHours() < 12) helping.push('Morning routine');
  const watch: string[] = [];
  if (o.st === 2) watch.push('High stress signal');
  if (o.r != null && o.r < 60) watch.push('Low readiness');

  return (
    <div className="card rhythm-card rhythm-insight-card">
      <h6 className="rhythm-card-title">How&apos;s my stress today?</h6>
      <div className="rhythm-stress-head">
        <span className={'rhythm-stress-level rhythm-stress-' + (tone || 'na')}>{level ?? '—'}</span>
        {level && <span className={'rhythm-stress-dot rhythm-stress-dot-' + tone} aria-hidden />}
      </div>
      <p className="rhythm-insight-sub">{msg}</p>
      {(helping.length > 0 || watch.length > 0) && (
        <div className="rhythm-stress-factors">
          {helping.length > 0 && (
            <div>
              <span className="rhythm-section-label">What&apos;s helping</span>
              <ul>{helping.map(x => <li key={x}>{x}</li>)}</ul>
            </div>
          )}
          {watch.length > 0 && (
            <div>
              <span className="rhythm-section-label">What to watch</span>
              <ul className="rhythm-watch">{watch.map(x => <li key={x}>{x}</li>)}</ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function OuraStrip({ cur, openSheet }: { cur: Date; openSheet: (s: SheetReq) => void }) {
  const { oura } = useApp();
  const [syncErr, setSyncErr] = useState(getOuraError());
  const o = oura[key(cur)] || {};
  const cells: [string, string | number][] = [];
  if (o.r != null) cells.push(['Readiness', o.r]);
  if (o.s != null) cells.push(['Sleep', o.s]);
  if (o.hrv != null) cells.push(['HRV', o.hrv + 'ms']);
  if (o.rhr != null) cells.push(['RHR', o.rhr + 'bpm']);
  if (o.steps != null) cells.push(['Steps', o.steps]);

  return (
    <div className="rhythm-oura-strip">
      {cells.length ? cells.map(([l, v]) => (
        <div key={l} className="rhythm-oura-cell"><small>{l}</small><b>{v}</b></div>
      )) : (
        <p className="rhythm-oura-empty">Connect Oura in Settings for live health data.</p>
      )}
      <button type="button" className="rhythm-oura-sync" onClick={async () => {
        toast('Syncing Oura…');
        const r = await syncOura();
        setSyncErr(getOuraError());
        if (r === 'ok') toast('Oura synced ✓');
        else if (r === 'nokey') { toast('Connect Oura in Settings'); openSheet({ type: 'settings' }); }
        else toast(syncErr || 'Sync failed');
      }}>⟳</button>
      {syncErr && <p className="rhythm-sync-err">{syncErr}</p>}
    </div>
  );
}

function WeeklyFlow({ cur }: { cur: Date }) {
  const { plan, oura } = useApp();
  const mon = addD(CAMP0, weekIdx(cur) * 7);
  const B2 = blocksFor(cur, plan);
  const dws = B2.filter(b => ['tGreen', 'tGreen2'].includes(b.cls));
  const dn = dws.filter(b => plan.done[b.date + '|' + b.id]).length;
  const C = 2 * Math.PI * 13;
  const todayK = key(new Date());

  return (
    <div className="card rhythm-card">
      <h6 className="rhythm-card-title">Weekly flow</h6>
      <div className="rhythm-week-row">
        {[0, 1, 2, 3, 4, 5, 6].map(i => {
          const d = addD(mon, i);
          const sc = soenScore(d, plan, oura);
          const p = sc.n || 0;
          const isToday = key(d) === todayK;
          return (
            <div key={i} className={'rhythm-week-day' + (isToday ? ' rhythm-week-today' : '')}>
              <svg width="32" height="32" viewBox="0 0 32 32" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="16" cy="16" r="13" fill="none" stroke="var(--line)" strokeWidth="3" />
                <circle cx="16" cy="16" r="13" fill="none" stroke="var(--green2)" strokeWidth="3" strokeLinecap="round"
                  strokeDasharray={C} strokeDashoffset={C * (1 - p / 100)} />
              </svg>
              <span>{'MTWTFSS'[i]}</span>
            </div>
          );
        })}
      </div>
      <div className="rhythm-week-stats">
        <div><small>Deep work today</small><b>{dn} / {dws.length}</b></div>
        <div><small>Key blocks</small><b>{B2.filter(b => isKey(b) && plan.done[b.date + '|' + b.id]).length} / {B2.filter(isKey).length}</b></div>
      </div>
      <div className="pbar"><i style={{ width: (dws.length ? dn / dws.length * 100 : 0) + '%' }} /></div>
    </div>
  );
}

function TaskList({ cur, openSheet }: { cur: Date; openSheet: (s: SheetReq) => void }) {
  const { plan } = useApp();
  const [showDone, setShowDone] = useState(false);
  const k = key(cur);
  const B = blocksFor(cur, plan).filter(isKey);
  const nh = nowH();
  const isTod = k === key(new Date());
  const doneB = B.filter(b => plan.done[b.date + '|' + b.id]);
  const outB = B.filter(b => !plan.done[b.date + '|' + b.id]);

  const row = (b: Block, done?: boolean) => (
    <button type="button" key={b.date + b.id} className={'rhythm-task' + (done ? ' rhythm-task-done' : '')}
      onClick={() => openSheet({ type: 'event', block: b, shownOn: k })}>
      <span className="rhythm-task-time">{fmt(b.t)}</span>
      <span className="rhythm-task-title">{b.ti}</span>
      {!done && isTod && b.t + b.dur < nh && <span className="rhythm-task-open">Open</span>}
      {done && <span className="rhythm-task-check">✓</span>}
    </button>
  );

  return (
    <div className="card rhythm-card">
      <h6 className="rhythm-card-title">Done &amp; outstanding</h6>
      {outB.length ? outB.map(b => row(b)) : (
        <p className="rhythm-all-done">Everything done. Rare air.</p>
      )}
      {doneB.length > 0 && (
        <>
          <button type="button" className="rhythm-toggle-done" onClick={() => setShowDone(v => !v)}>
            {showDone ? 'Hide' : 'Show'} completed ({doneB.length})
          </button>
          {showDone && doneB.map(b => row(b, true))}
        </>
      )}
    </div>
  );
}

function RecordToday({ cur, openSheet }: { cur: Date; openSheet: (s: SheetReq) => void }) {
  const { plan } = useApp();
  const k = key(cur);
  const dow = cur.getDay();
  if (![1, 3, 4, 5].includes(dow)) return null;
  const SHOTS = [
    '1 bag round — natural combos, full body in frame',
    dow === 5 ? '1 shadowbox round — cleanest form of the week' : '1 drill round — 10 clean reps',
    'Save to album "TENET Sense v1"',
    'Every 3rd session: one 15-sec vertical clip',
  ];
  const done = plan.shots[k] || {};
  const doneCount = SHOTS.filter((_, i) => done[i]).length;

  return (
    <div className="card rhythm-card rhythm-rec">
      <h6 className="rhythm-card-title">Record today · Sense <span className="rhythm-badge">{doneCount}/{SHOTS.length}</span></h6>
      {SHOTS.map((s, i) => (
        <div className="rhythm-shot" key={i}>
          <span className={'ckbox stat' + (done[i] ? ' ok' : '')}
            onClick={() => store.updatePlan(p => {
              const day = { ...(p.shots[k] || {}) };
              if (day[i]) delete day[i]; else day[i] = 1;
              return { shots: { ...p.shots, [k]: day } };
            })} />
          <span className={done[i] ? 'rhythm-shot-done' : undefined}>{s}</span>
        </div>
      ))}
      <button type="button" className="btnS" onClick={() => openSheet({ type: 'shot' })}>Shot list &amp; rig setup</button>
    </div>
  );
}

function RhythmMore({ cur, openSheet }: { cur: Date; openSheet: (s: SheetReq) => void }) {
  const [open, setOpen] = useState(false);
  const { plan } = useApp();
  const [repos, setRepos] = useState<RepoStatus[] | null>(null);
  const w = weekIdx(cur), dow = cur.getDay();
  const gym = [1, 3, 4, 5].includes(dow);
  const k = key(cur);
  const l = plan.logs[k];
  const [cap, setCap] = useState('');
  const T = plan.todos[k] || [];

  useEffect(() => { void ghStatus().then(setRepos); }, [plan.prefs.repoA, plan.prefs.repoB]);

  const rlink = (n: string) => {
    const r = findRecipe(n, plan.userRecipes);
    return <><b>{n}</b>{r && <span className="linkish" onClick={() => openSheet({ type: 'recipe', recipe: r })}> recipe</span>}</>;
  };

  return (
    <div className="rhythm-more">
      <button type="button" className="rhythm-more-toggle" onClick={() => setOpen(v => !v)}>
        {open ? '▾ Less' : '▸ Fuel, log, capture & more'}
      </button>
      {open && (
        <div className="rhythm-more-body">
          <div className="card rhythm-card">
            <h6 className="rhythm-card-title">Fuel today</h6>
            <div className="row"><span className="k">8:15</span><span>{rlink(BFAST[(w + dow) % 7])}</span></div>
            {gym ? <div className="row"><span className="k">3:00</span><span>Shake + {rlink(MAIN[(w + dow) % 7])}</span></div>
              : <div className="row"><span className="k">1:00</span><span>{rlink(MAIN[(w + dow) % 7])}</span></div>}
            <div className="row"><span className="k">7:00</span><span>{rlink(DINNER[(w + dow) % 7])}</span></div>
          </div>
          <div className="card rhythm-card">
            <h6 className="rhythm-card-title">Log</h6>
            <p className="rhythm-insight-sub">{l ? `Energy ${l.e || '—'}/10 · Class ${l.q || '—'}/10` : 'Nothing logged yet.'}</p>
            <button type="button" className="btnS" onClick={() => openSheet({ type: 'log' })}>Log energy &amp; class</button>
          </div>
          <div className="card rhythm-card">
            <h6 className="rhythm-card-title">Capture</h6>
            {T.map((t, i) => (
              <div className="row" key={i} style={{ alignItems: 'center', gap: 8 }}>
                <span className={'ckbox stat' + (t.d ? ' ok' : '')}
                  onClick={() => store.updatePlan(p => {
                    const list = [...(p.todos[k] || [])];
                    list[i] = { ...list[i], d: list[i].d ? 0 : 1 };
                    return { todos: { ...p.todos, [k]: list } };
                  })} />
                <span style={{ flex: 1, ...(t.d ? { textDecoration: 'line-through', color: 'var(--dim)' } : {}) }}>{t.x}</span>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <input value={cap} onChange={e => setCap(e.target.value)} placeholder="todo: bring wraps"
                onKeyDown={e => e.key === 'Enter' && cap.trim() && (store.updatePlan(p => ({
                  todos: { ...p.todos, [k]: [...(p.todos[k] || []), { x: cap.trim(), d: 0 as const, n: false }] },
                })), setCap(''))} />
            </div>
          </div>
          {repos && repos.length > 0 && (
            <div className="card rhythm-card">
              <h6 className="rhythm-card-title">Build tracker</h6>
              {repos.map(r => (
                <div className="row" key={r.name}><span className="k">{r.name}</span>
                  <span>{r.ok ? `${r.days === 0 ? 'today' : r.days + 'd ago'}` : r.msg}</span></div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function RhythmDashboard({ cur, openSheet }: { cur: Date; openSheet: (s: SheetReq) => void }) {
  return (
    <div className="rhythm-dash">
      <FocusCard cur={cur} openSheet={openSheet} />
      <SoenInsight cur={cur} openSheet={openSheet} />
      <OuraStrip cur={cur} openSheet={openSheet} />
      <WhatsNext cur={cur} openSheet={openSheet} />
      <div className="rhythm-insights">
        <EnergyForecast cur={cur} />
        <StressInsight cur={cur} />
      </div>
      <WeeklyFlow cur={cur} />
      <TaskList cur={cur} openSheet={openSheet} />
      <RecordToday cur={cur} openSheet={openSheet} />
      <RhythmMore cur={cur} openSheet={openSheet} />
    </div>
  );
}
