import { CAMP0, CAMP_END, DATE_NIGHTS, MN, addD, key } from '../../core/dates';
import { blocksFor } from '../../core/schedule';
import { monthScore, soenScore } from '../../core/scoring';
import { useApp } from '../hooks';

const MILESTONES: [string, string][] = [
  ['2026-07-06', 'Camp begins'], ['2026-07-17', 'Date night'], ['2026-07-25', 'Sense: ESP32 bench'],
  ['2026-07-31', 'Date night'], ['2026-08-08', 'Banya + friend'], ['2026-08-14', 'Date night'],
  ['2026-08-16', 'CAMP TEST'], ['2026-09-01', 'TENET launch window opens'],
];

export default function MonthView({ cur, onPick }: { cur: Date; onPick: (d: Date) => void }) {
  const { plan, oura } = useApp();
  const first = new Date(cur.getFullYear(), cur.getMonth(), 1);
  const start = addD(first, -((first.getDay() + 6) % 7));
  const mAvg = monthScore(cur, plan, oura);
  const todayK = key(new Date());
  const heat = (n: number | null) =>
    n == null ? 'transparent' : n >= 78 ? 'rgba(79,122,88,.18)' : n >= 60 ? 'rgba(232,161,60,.16)' : 'rgba(198,91,78,.16)';

  return (
    <>
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="insight">
          <div className="txt"><h6 className="lab">MONTH PULSE — {MN[cur.getMonth()].toUpperCase()}</h6>
            <p style={{ fontSize: '.74rem', color: 'var(--sub)', marginTop: 4 }}>
              {mAvg == null ? 'Scores fill in as days are lived — cells tint green/amber/red by SOEN score.' :
                `Average SOEN score ${mAvg} so far. ${mAvg >= 75 ? 'The system is holding.' : mAvg >= 60 ? 'Holding, with soft spots — check the amber cells.' : 'Rough stretch — retune, do not push through.'}`}
            </p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div className="big serif" style={{ fontSize: '2rem', fontWeight: 700 }}>{mAvg ?? '—'}</div>
            <small style={{ fontSize: '.56rem', fontWeight: 800, color: 'var(--sub)' }}>MONTH SCORE</small>
          </div>
        </div>
        <div className="mstones">
          {MILESTONES.filter(m => m[0].slice(5, 7) === String(cur.getMonth() + 1).padStart(2, '0')).map(m => (
            <div className="mstone" key={m[0]}><small>{m[0].slice(8)} {MN[cur.getMonth()].slice(0, 3)}</small>{m[1]}</div>
          ))}
        </div>
      </div>
      <div className="card">
        <div className="mgrid">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <div className="mh" key={i}>{d}</div>)}
          {Array.from({ length: 42 }, (_, i) => {
            const d = addD(start, i);
            const k = key(d);
            const off = d.getMonth() !== cur.getMonth();
            const inCamp = d >= CAMP0 && d <= CAMP_END;
            const sc = inCamp && k <= todayK ? soenScore(d, plan, oura).n : null;
            const B = inCamp ? blocksFor(d, plan) : [];
            const dots = [
              B.some(b => b.cls === 'tRed') && 'var(--red)',
              B.some(b => ['tGreen', 'tGreen2'].includes(b.cls)) && 'var(--green2)',
              B.some(b => b.cls === 'tBlue') && 'var(--blue)',
              (DATE_NIGHTS.includes(k) || B.some(b => ['date', 'movie', 'banya', 'create'].includes(b.id))) && 'var(--plum)',
            ].filter(Boolean) as string[];
            return (
              <div key={k} className={'mcell' + (off ? ' off' : '') + (k === key(cur) ? ' sel' : '')} role="button" aria-label={'day ' + k}
                style={k === key(cur) ? undefined : { background: heat(sc) }}
                onClick={() => !off && onPick(d)}>
                {sc != null && k !== key(cur) && <span className="sc">{sc}</span>}
                {d.getDate()}
                <span className="dots">{dots.slice(0, 4).map((c, j) => <i key={j} style={{ background: c }} />)}</span>
              </div>
            );
          })}
        </div>
        <div className="legend">
          <span><i style={{ background: 'var(--red)' }} />Boxing</span>
          <span><i style={{ background: 'var(--green2)' }} />Deep work</span>
          <span><i style={{ background: 'var(--blue)' }} />Run/Sense</span>
          <span><i style={{ background: 'var(--plum)' }} />Life</span>
          <span><i style={{ background: 'rgba(79,122,88,.5)' }} />cell tint = SOEN score</span>
        </div>
      </div>
    </>
  );
}
