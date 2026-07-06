import { useEffect, useState } from 'react';
import type { Block } from '../../core/types';
import { DN, PHASE, addD, fmt, hf, key, weekIdx, CAMP0 } from '../../core/dates';
import { BFAST, DINNER, MAIN, assignLanes, blocksFor, isKey } from '../../core/schedule';
import { completion, soenScore } from '../../core/scoring';
import { findRecipe } from '../../core/recipes';
import { ghStatus, syncOura, type RepoStatus } from '../../core/api';
import { store } from '../../core/store';
import { useApp, toast } from '../hooks';
import type { SheetReq } from '../App';

const PX = 38, T0 = 7, T1 = 23.5;

/* ---------------- timeline ---------------- */
function Timeline({ cur, openSheet }: { cur: Date; openSheet: (s: SheetReq) => void }) {
  const { plan, oura } = useApp();
  const [focus, setFocus] = useState<string | null>(null);
  const B = blocksFor(cur, plan);
  const lanes = assignLanes(B);
  const k = key(cur);
  const o = oura[k] || {};
  const gcol = (v?: number | null) => v == null ? '#ddd8ca' : v >= 75 ? '#7ea886' : v >= 55 ? '#e8c88f' : '#d98a72';
  const stc = o.st == null ? '#ddd8ca' : o.st === 0 ? '#7ea886' : o.st === 1 ? '#e8c88f' : '#d98a72';
  const now = new Date();
  const nh = now.getHours() + now.getMinutes() / 60;
  const isToday = key(now) === k;

  useEffect(() => { setFocus(null); }, [k]);

  return (
    <div className="card tlcard" style={{ padding: '14px 6px' }}>
      <div className="sun">Sunrise 6:02 AM · rail = your Oura day (sleep → stress → activity)</div>
      <div className="tl" style={{ height: (T1 - T0) * PX + 20 }} onClick={() => setFocus(null)}>
        <div className="rail" title="Sleep → Readiness → Stress → Activity (Oura)"
          style={{ background: `linear-gradient(180deg,${gcol(o.s)} 0%,${gcol(o.r)} 22%,${stc} 45%,${gcol(o.act)} 68%,${gcol(o.s)} 100%)` }} />
        {Array.from({ length: T1 - T0 + 1 }, (_, i) => T0 + i).map(h => (
          <div key={h} className="hourlab" style={{ top: (h - T0) * PX + 10 }}>{((h + 11) % 12) + 1}{h >= 12 ? 'PM' : 'AM'}</div>
        ))}
        {lanes.map(({ b, col, cols }) => {
          const dk = b.date + '|' + b.id;
          const isDone = !!plan.done[dk];
          const hpx = Math.max(26, b.dur * PX - 4);
          const focused = focus === dk;
          const cls = ['blkT', b.cls,
            isDone ? 'done' : '',
            b.dur < 0.55 && !focused ? 'tiny' : '',
            cols > 1 ? 'ov' : '',
            focused ? 'focus' : ''].filter(Boolean).join(' ');
          return (
            <div key={dk + col} className={cls} role="button" aria-label={b.ti}
              style={{
                top: (b.t - T0) * PX + 10, height: hpx,
                left: `calc(56px + ${col} * ((100% - 96px) / ${cols}))`,
                width: `calc((100% - 96px) / ${cols} - 5px)`,
                zIndex: 2 + col,
              }}
              onClick={e => {
                e.stopPropagation();
                if (cols > 1 && !focused) { setFocus(dk); return; }
                setFocus(null);
                openSheet({ type: 'event', block: b, shownOn: k });
              }}>
              <span className={'ckbox' + (isDone ? ' ok' : '')} title="Mark done"
                onClick={e => { e.stopPropagation(); store.toggleDone(dk); toast(isDone ? 'Unchecked' : 'Done — score updated'); }} />
              <b>{b.ti}</b>
              {(b.dur >= 0.55 || focused) && <small>{fmt(b.t)}–{fmt(b.t + b.dur)}{b.su && (cols < 2 || focused) ? ' · ' + b.su : ''}</small>}
              {b.dur >= 1.2 && (cols < 3 || focused) && <span className="ftag">{b.fo}{b.movedIn ? ' · moved' : ''}</span>}
            </div>
          );
        })}
        {isToday && nh > T0 && nh < T1 && (
          <>
            <div className="nowline" style={{ top: (nh - T0) * PX + 10 }}><i>{fmt(nh)}</i></div>
            <div className="raildot" style={{ top: (nh - T0) * PX + 2 }} />
          </>
        )}
      </div>
      <div className="sun">Sunset 8:33 PM · tap a block → done ✓ / edit / reschedule</div>
    </div>
  );
}

/* ---------------- left column cards ---------------- */
function ScoreCard({ cur }: { cur: Date }) {
  const { plan, oura } = useApp();
  const sc = soenScore(cur, plan, oura);
  const w = weekIdx(cur);
  const B = blocksFor(cur, plan);
  const hs = (cl: string[]) => B.filter(b => cl.includes(b.cls)).reduce((a, b) => a + b.dur, 0);
  const compN = completion(cur, plan);
  return (
    <div className="card">
      <div className="glance">
        <div className="l"><small>SOEN SCORE — OURA × COMPLETED</small>
          <div className="opt">{sc.n === null ? 'Fresh day' : sc.n >= 78 ? 'Optimized' : sc.n >= 60 ? 'Manageable' : 'Go easy'}</div>
          <p>{sc.lab} · Week {w + 1} {PHASE[w]}</p></div>
        <div className="ring">
          <svg width="88" height="88">
            <circle cx="44" cy="44" r="37" fill="none" stroke="var(--line)" strokeWidth="7" />
            <circle cx="44" cy="44" r="37" fill="none" stroke="var(--green2)" strokeWidth="7" strokeLinecap="round"
              strokeDasharray="232.5" strokeDashoffset={232.5 * (1 - (sc.n || 0) / 100)} style={{ transition: 'stroke-dashoffset 1.2s' }} />
          </svg>
          <div className="c"><b>{sc.n ?? '—'}</b><small>SOEN</small></div>
        </div>
      </div>
      <div className="stat3">
        <div className="stat"><small>Work</small><b>{hf(hs(['tGreen', 'tGreen2']))}</b><span>of 40h/wk</span></div>
        <div className="stat"><small>Train+Recover</small><b>{hf(hs(['tRed', 'tBlue', 'tPlum']))}</b><span>incl. travel</span></div>
        <div className="stat"><small>Done</small><b>{compN === null ? '—' : compN + '%'}</b>
          <span>{B.filter(b => isKey(b) && plan.done[b.date + '|' + b.id]).length}/{B.filter(isKey).length} blocks</span></div>
      </div>
    </div>
  );
}

function Outstanding({ cur, openSheet }: { cur: Date; openSheet: (s: SheetReq) => void }) {
  const { plan } = useApp();
  const k = key(cur);
  const B = blocksFor(cur, plan).filter(isKey);
  const nowH = new Date().getHours() + new Date().getMinutes() / 60;
  const isTod = k === key(new Date());
  const doneB = B.filter(b => plan.done[b.date + '|' + b.id]);
  const outB = B.filter(b => !plan.done[b.date + '|' + b.id]);
  const li = (b: Block, cls: '' | 'miss' | 'd') => (
    <div className="row" key={b.date + b.id} style={{ alignItems: 'center', gap: 8, cursor: 'pointer' }}
      onClick={() => openSheet({ type: 'event', block: b, shownOn: k })}>
      <span className="k" style={{ minWidth: 56, flex: '0 0 56px' }}>{fmt(b.t)}</span>
      <span style={{ flex: 1, ...(cls === 'd' ? { textDecoration: 'line-through', color: 'var(--dim)' } : {}) }}>{b.ti}</span>
      {cls === 'miss' ? <span style={{ fontSize: '.56rem', fontWeight: 800, color: '#8f3d31', background: 'var(--redbg)', padding: '2px 8px', borderRadius: 100 }}>OPEN</span>
        : cls === 'd' ? <span style={{ color: 'var(--green)', fontWeight: 800 }}>✓</span> : null}
    </div>
  );
  return (
    <div className="card mt"><h6 className="lab">TODAY — DONE &amp; OUTSTANDING</h6>
      <div style={{ marginTop: 6 }}>
        {outB.length ? outB.map(b => li(b, isTod && b.t + b.dur < nowH ? 'miss' : ''))
          : <p style={{ fontSize: '.68rem', color: 'var(--green)', fontWeight: 700 }}>Everything done. Rare air.</p>}
        {doneB.length > 0 && <><div className="fcat" style={{ marginTop: 10 }}>Completed — {doneB.length}</div>{doneB.map(b => li(b, 'd'))}</>}
      </div>
    </div>
  );
}

function Suggest({ cur, openSheet }: { cur: Date; openSheet: (s: SheetReq) => void }) {
  const { plan, oura } = useApp();
  const k = key(cur);
  const o = oura[k] || {};
  const now = new Date();
  const isToday = key(now) === k;
  const nh = now.getHours() + now.getMinutes() / 60;
  const B = blocksFor(cur, plan);
  const comp = completion(cur, plan);
  let txt: React.ReactNode;
  if (o.r && o.r < 60) txt = <>Readiness {o.r} — <b>downgrade today one notch</b>: class becomes technique-only, skip the run intensity, protect the 11 PM lights-out.</>;
  else if (!isToday) txt = <>Planned day. Tap blocks to mark ✓ as you complete them — your SOEN score is Oura × what you actually finish.</>;
  else if (comp !== null && comp >= 85 && nh < 20) txt = <>{comp}% done and it's not even night — <b>you're ahead</b>. Options: one extra edX module, 30 min Sense lab, or bank it as rest.</>;
  else {
    const nxt = B.find(b => b.t > nh && isKey(b) && !plan.done[b.date + '|' + b.id]);
    txt = nxt ? <>Next: <b>{nxt.ti}</b> at {fmt(nxt.t)}. {o.st === 2 ? 'Oura shows high stress — take 5 slow breaths before it.' : ''}</>
      : <>Day complete. Reading, cacao, lights out. Tomorrow is built.</>;
  }
  return (
    <div className="card mt" id="nextCard"><h6 className="lab">SOEN SUGGESTS</h6>
      <p>{txt}</p>
      <button className="btnS" onClick={() => openSheet({ type: 'retune' })}>Retune my plan (SOEN AI)</button>
    </div>
  );
}

function HealthStrip({ cur, openSheet }: { cur: Date; openSheet: (s: SheetReq) => void }) {
  const { oura } = useApp();
  const o = oura[key(cur)] || {};
  const H: [string, string | number | null | undefined][] = [
    ['Readiness', o.r], ['Sleep', o.s], ['HRV', o.hrv ? o.hrv + 'ms' : null], ['RHR', o.rhr ? o.rhr + 'bpm' : null],
    ['Stress', o.st != null ? ['Low', 'Med', 'High'][o.st] : null], ['Steps', o.steps], ['Cals', o.cal], ['Breath', o.br ? o.br + '/min' : null],
  ];
  const cells = H.filter(x => x[1] != null);
  return (
    <div className="card mt">
      <h6 className="lab">HEALTH — OURA
        <a href="#" style={{ float: 'right', color: 'var(--green)', fontWeight: 800 }}
          onClick={async e => {
            e.preventDefault(); toast('Syncing Oura…');
            const r = await syncOura();
            if (r === 'ok') toast('Oura synced — rail + scores updated');
            else if (r === 'nokey') { toast('Add your Oura token in Settings'); openSheet({ type: 'settings' }); }
            else toast('Sync failed — check token / network');
          }}>⟳ Force sync</a>
      </h6>
      <div className="hstrip">
        {cells.length ? cells.map(x => <div className="hcell" key={x[0]}><small>{x[0]}</small><b>{x[1]}</b></div>)
          : <p style={{ fontSize: '.68rem', color: 'var(--sub)' }}>Connect Oura in Settings → data appears here after sync.</p>}
      </div>
    </div>
  );
}

function FuelToday({ cur, openSheet }: { cur: Date; openSheet: (s: SheetReq) => void }) {
  const { plan } = useApp();
  const w = weekIdx(cur), dow = cur.getDay();
  const gym = [1, 3, 4, 5].includes(dow);
  const rlink = (n: string) => {
    const r = findRecipe(n, plan.userRecipes);
    return <><b>{n}</b>{r && <span className="linkish" style={{ marginLeft: 6 }} onClick={() => openSheet({ type: 'recipe', recipe: r })}>recipe</span>}</>;
  };
  return (
    <div className="card mt"><h6 className="lab">FUEL — TODAY</h6>
      <div>
        <div className="fcat">Breakfast</div>
        <div className="row"><span className="k">7:40</span><span>Coffee + collagen · Yakult</span></div>
        <div className="row"><span className="k">8:15</span><span>{rlink(BFAST[(w + dow) % 7])}</span></div>
        <div className="fcat">Lunch</div>
        {gym ? <>
          <div className="row"><span className="k">10:45</span><span>Built Bar (pre-gym)</span></div>
          <div className="row"><span className="k">3:00</span><span>Shake + {rlink(MAIN[(w + dow) % 7])}</span></div>
        </> : <div className="row"><span className="k">1:00</span><span>{rlink(MAIN[(w + dow) % 7])}</span></div>}
        <div className="fcat">Dinner</div>
        <div className="row"><span className="k">7:00</span><span>{rlink(DINNER[(w + dow) % 7])}</span></div>
        <div className="row"><span className="k">9:00</span><span>{rlink('Cacao Ritual')}{dow === 6 ? ' — Saturday: real dessert allowed' : ''}</span></div>
      </div>
    </div>
  );
}

function Capture({ cur }: { cur: Date }) {
  const { plan } = useApp();
  const [v, setV] = useState('');
  const k = key(cur);
  const T = plan.todos[k] || [];
  const add = () => {
    if (!v.trim()) return;
    store.updatePlan(p => ({
      todos: { ...p.todos, [k]: [...(p.todos[k] || []), { x: v.replace(/^(todo|note):\s*/i, ''), d: 0 as const, n: /^note:/i.test(v) }] },
    }));
    setV('');
  };
  return (
    <div className="card mt"><h6 className="lab">CAPTURE — NOTES + TO-DOS, INSIDE THE DAY</h6>
      <div style={{ marginTop: 6 }}>
        {T.length ? T.map((t, i) => (
          <div className="row" key={i} style={{ alignItems: 'center', gap: 8 }}>
            <span className={'ckbox stat' + (t.d ? ' ok' : '')}
              onClick={() => store.updatePlan(p => {
                const list = [...(p.todos[k] || [])];
                list[i] = { ...list[i], d: list[i].d ? 0 : 1 };
                return { todos: { ...p.todos, [k]: list } };
              })} />
            <span style={{ flex: 1, ...(t.d ? { textDecoration: 'line-through', color: 'var(--dim)' } : {}) }}>
              {t.n && <em style={{ color: 'var(--sub)', fontStyle: 'normal', fontSize: '.6rem', fontWeight: 800 }}>NOTE </em>}{t.x}
            </span>
            <span style={{ color: 'var(--dim)', cursor: 'pointer', fontWeight: 800 }}
              onClick={() => store.updatePlan(p => ({ todos: { ...p.todos, [k]: (p.todos[k] || []).filter((_, j) => j !== i) } }))}>✕</span>
          </div>
        )) : <p style={{ fontSize: '.68rem', color: 'var(--dim)' }}>Nothing captured yet - todos and notes live inside the day.</p>}
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        <input value={v} onChange={e => setV(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} placeholder="todo: bring extra wraps" />
        <button style={{ flex: '0 0 auto', border: 0, background: 'var(--ink)', color: '#fff', fontWeight: 800, fontSize: '.68rem', padding: '0 16px', borderRadius: 100, cursor: 'pointer' }} onClick={add}>Add</button>
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
  const pts = base.map((v, i) => [i * 300 / 11, 60 - Math.min(56, Math.max(6, v + mod)) * 0.9] as [number, number]);
  const path = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(0) + ',' + p[1].toFixed(0)).join(' ');
  const hi = Math.max(0, Math.min(11, Math.round((h - 7) / 1.5)));
  return (
    <div className="card mt"><h6 className="lab">ENERGY FORECAST</h6>
      <p style={{ fontSize: '.7rem', color: 'var(--sub)', marginTop: 4 }}>
        {h < 11 ? 'Energy peaks now, dips after 2 PM - hardest TENET problem first.' : h < 15 ? 'Post-training bump ahead - good for build work.' : 'Descending curve - admin, content, learning fit here.'}
      </p>
      <svg viewBox="0 0 300 64" style={{ width: '100%', height: 64, marginTop: 6 }} preserveAspectRatio="none">
        <path d={`${path} L300,64 L0,64 Z`} fill="rgba(79,122,88,.1)" />
        <path d={path} fill="none" stroke="var(--green2)" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx={hi * 300 / 11} cy={pts[hi][1]} r="4" fill="var(--amber)" />
      </svg>
    </div>
  );
}

function WeeklyFlow({ cur }: { cur: Date }) {
  const { plan, oura } = useApp();
  const mon = addD(CAMP0, weekIdx(cur) * 7);
  const B2 = blocksFor(cur, plan);
  const dws = B2.filter(b => ['tGreen', 'tGreen2'].includes(b.cls));
  const dn = dws.filter(b => plan.done[b.date + '|' + b.id]).length;
  const C = 2 * Math.PI * 11;
  return (
    <div className="card mt"><h6 className="lab">WEEKLY FLOW · FOCUS GOAL</h6>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', marginTop: 10 }}>
        {[0, 1, 2, 3, 4, 5, 6].map(i => {
          const d = addD(mon, i);
          const sc = soenScore(d, plan, oura);
          const p = sc.n || 0;
          return (
            <div key={i} style={{ textAlign: 'center' }}>
              <svg width="28" height="28" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="14" cy="14" r="11" fill="none" stroke="var(--line)" strokeWidth="3" />
                <circle cx="14" cy="14" r="11" fill="none" stroke="var(--green2)" strokeWidth="3" strokeLinecap="round"
                  strokeDasharray={C} strokeDashoffset={C * (1 - p / 100)} />
              </svg>
              <div style={{ fontSize: '.52rem', fontWeight: 800, color: 'var(--sub)' }}>{'MTWTFSS'[i]}</div>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.66rem', color: 'var(--sub)', fontWeight: 700, marginTop: 14 }}>
        <span>Deep work blocks today</span><span>{dn} of {dws.length}</span>
      </div>
      <div className="pbar"><i style={{ width: (dws.length ? dn / dws.length * 100 : 0) + '%' }} /></div>
    </div>
  );
}

function BuildTracker() {
  const { plan } = useApp();
  const [repos, setRepos] = useState<RepoStatus[] | null>(null);
  useEffect(() => { void ghStatus().then(setRepos); }, [plan.prefs.repoA, plan.prefs.repoB]);
  return (
    <div className="card mt"><h6 className="lab">BUILD TRACKER — GITHUB</h6>
      <div style={{ fontSize: '.72rem', color: 'var(--sub)', marginTop: 6 }}>
        {!repos || !repos.length ? 'Add repo slugs in Settings (e.g. prxatt/SOEN). Public repos need no token.' :
          repos.map(r => (
            <div className="row" key={r.name}>
              <span className="k">{r.name}</span>
              <span>{r.ok ? <>last commit <b>{r.days === 0 ? 'today' : r.days + 'd ago'}</b> - {r.msg}</> : r.msg}</span>
            </div>
          ))}
        {repos?.some(r => r.name.includes('Boxing') && r.ok && r.days >= 2) &&
          <div className="row"><span className="k">SOEN</span><span style={{ color: '#8a5b12' }}>Boxing repo cold 2+ days — tomorrow's morning block goes there first.</span></div>}
      </div>
    </div>
  );
}

/** Record-today action card — surfaces on gym days after class. */
function RecordToday({ cur, openSheet }: { cur: Date; openSheet: (s: SheetReq) => void }) {
  const { plan } = useApp();
  const k = key(cur);
  const dow = cur.getDay();
  const isGymDay = [1, 3, 4, 5].includes(dow);
  if (!isGymDay) return null;
  const SHOTS = ['1 bag round — natural combos, full body in frame', dow === 5 ? '1 shadowbox round — cleanest form of the week' : '1 drill round — 10 clean reps: jab, cross, hook, uppercut', 'Save as ' + k.replace(/-/g, '-') + '_bag01.mov → album "TENET Sense v1"', 'Every 3rd session: one 15-sec vertical for the content bank'];
  const done = plan.shots[k] || {};
  const doneCount = SHOTS.filter((_, i) => done[i]).length;
  return (
    <div className="card mt recbox"><h6 className="lab">RECORD TODAY — TENET SENSE DATA <span style={{ float: 'right', color: doneCount === SHOTS.length ? 'var(--green)' : 'var(--sub)' }}>{doneCount}/{SHOTS.length}</span></h6>
      <div style={{ marginTop: 4 }}>
        {SHOTS.map((s, i) => (
          <div className="shot" key={i}>
            <span className={'ckbox stat' + (done[i] ? ' ok' : '')}
              onClick={() => store.updatePlan(p => {
                const day = { ...(p.shots[k] || {}) };
                if (day[i]) delete day[i]; else day[i] = 1;
                return { shots: { ...p.shots, [k]: day } };
              })} />
            <span style={done[i] ? { textDecoration: 'line-through', color: 'var(--dim)' } : undefined}>{s}</span>
          </div>
        ))}
      </div>
      <button className="btnS" onClick={() => openSheet({ type: 'shot' })}>Full shot list · rig setup</button>
    </div>
  );
}

function LogCard({ cur, openSheet }: { cur: Date; openSheet: (s: SheetReq) => void }) {
  const { plan } = useApp();
  const l = plan.logs[key(cur)];
  return (
    <div className="card mt"><h6 className="lab">LOG</h6>
      <div style={{ fontSize: '.7rem', color: 'var(--sub)', marginTop: 6 }}>
        {l ? <>Energy {l.e || '—'}/10 · Class {l.q || '—'}/10{l.n ? <><br />{l.n}</> : null}</> : 'Nothing logged yet. Weight comes from Oura automatically.'}
      </div>
      <button className="btnS" onClick={() => openSheet({ type: 'log' })}>＋ Log · energy · class quality · gym notes</button>
    </div>
  );
}

export default function DayView({ cur, openSheet }: { cur: Date; openSheet: (s: SheetReq) => void }) {
  return (
    <div className="grid g-day">
      <div>
        <ScoreCard cur={cur} />
        <Outstanding cur={cur} openSheet={openSheet} />
        <RecordToday cur={cur} openSheet={openSheet} />
        <Suggest cur={cur} openSheet={openSheet} />
        <HealthStrip cur={cur} openSheet={openSheet} />
        <FuelToday cur={cur} openSheet={openSheet} />
        <LogCard cur={cur} openSheet={openSheet} />
        <Capture cur={cur} />
        <EnergyForecast cur={cur} />
        <WeeklyFlow cur={cur} />
        <BuildTracker />
      </div>
      <Timeline cur={cur} openSheet={openSheet} />
    </div>
  );
}
