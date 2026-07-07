import { completion, soenScore } from '../core/scoring';
import { blocksFor, isKey } from '../core/schedule';
import { fmt, key, PHASE, weekIdx } from '../core/dates';
import { useApp } from './hooks';

function timeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function scoreLabel(n: number | null): string {
  if (n === null) return 'Fresh day';
  if (n >= 78) return 'Optimized';
  if (n >= 60) return 'Manageable';
  return 'Go easy';
}

export default function GreetingBar({ tab }: { tab: 'rhythm' | 'plan' | 'fuel' | 'roadmap' }) {
  const { plan, oura } = useApp();
  const today = new Date();
  const sc = soenScore(today, plan, oura);
  const k = key(today);
  const B = blocksFor(today, plan);
  const keyBlocks = B.filter(isKey);
  const doneN = keyBlocks.filter(b => plan.done[b.date + '|' + b.id]).length;
  const comp = completion(today, plan);
  const nh = today.getHours() + today.getMinutes() / 60;
  const nxt = B.find(b => b.t > nh && isKey(b) && !plan.done[b.date + '|' + b.id]);

  if (tab === 'fuel') {
    return (
      <div className="greeting-bar">
        <h1 className="plan serif">Fuel</h1>
      </div>
    );
  }
  if (tab === 'roadmap') {
    return (
      <div className="greeting-bar">
        <h1 className="plan serif">Roadmap</h1>
      </div>
    );
  }
  if (tab === 'plan') {
    return (
      <div className="greeting-bar">
        <h1 className="plan serif">Plan</h1>
        <p className="greeting-sub">Week {weekIdx(today) + 1} · {PHASE[weekIdx(today)]} phase</p>
      </div>
    );
  }

  const pct = sc.n ?? 0;
  const C = 75.4;

  return (
    <div className="greeting-bar">
      <div className="greeting-row">
        <div className="greeting-ring" aria-hidden>
          <svg width="28" height="28">
            <circle cx="14" cy="14" r="12" fill="none" stroke="var(--line)" strokeWidth="3" />
            <circle cx="14" cy="14" r="12" fill="none" stroke="var(--green2)" strokeWidth="3" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)} />
          </svg>
          <span className="greeting-ring-n">{sc.n ?? '—'}</span>
        </div>
        <h1 className="plan serif greeting-title">
          {timeGreeting()}, Pratt
          {sc.n != null && <span className="greeting-score-pill">{sc.n} · {scoreLabel(sc.n)}</span>}
        </h1>
      </div>
      <p className="greeting-sub">{sc.lab}{sc.n == null ? '' : ` · ${scoreLabel(sc.n)}`}</p>
      <div className="greeting-rhythm">
        <span><b>{doneN}/{keyBlocks.length}</b> blocks done</span>
        {comp != null && <span>· <b>{comp}%</b> complete</span>}
        {nxt && <span className="greeting-next">· Next <b>{nxt.ti}</b> {fmt(nxt.t)}</span>}
      </div>
    </div>
  );
}
