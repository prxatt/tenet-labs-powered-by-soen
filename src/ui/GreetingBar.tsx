import { soenScore } from '../core/scoring';
import { key, PHASE, weekIdx } from '../core/dates';
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

function ouraSummary(o: { r?: number | null; s?: number | null; hrv?: number | null; rhr?: number | null; st?: number | null }): string | null {
  const parts: string[] = [];
  if (o.r != null) parts.push(`Readiness ${o.r}`);
  if (o.s != null) parts.push(`Sleep ${o.s}`);
  if (o.hrv != null) parts.push(`HRV ${o.hrv}ms`);
  if (o.rhr != null) parts.push(`RHR ${o.rhr}bpm`);
  if (o.st != null) parts.push(`Stress ${['Low', 'Med', 'High'][o.st] ?? '—'}`);
  return parts.length ? parts.join(' · ') : null;
}

export default function GreetingBar({ tab }: { tab: 'rhythm' | 'plan' | 'fuel' | 'roadmap' }) {
  const { plan, oura } = useApp();
  const today = new Date();
  const sc = soenScore(today, plan, oura);
  const k = key(today);
  const o = oura[k] || {};
  const ouraLine = ouraSummary(o);

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
        <p className="greeting-sub plan-phase">Week {weekIdx(today) + 1} · {PHASE[weekIdx(today)]} phase</p>
      </div>
    );
  }

  const pct = sc.n ?? 0;

  return (
    <div className="greeting-bar greeting-bar-rhythm">
      <div className="greeting-row">
        <div className="greeting-ring greeting-ring-lg" aria-hidden>
          <svg width="40" height="40" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r="17" fill="none" stroke="var(--line)" strokeWidth="3" />
            <circle cx="20" cy="20" r="17" fill="none" stroke="var(--green2)" strokeWidth="3" strokeLinecap="round"
              strokeDasharray="107" strokeDashoffset={107 * (1 - pct / 100)} transform="rotate(-90 20 20)" />
          </svg>
          <span className="greeting-ring-n">{sc.n ?? '—'}</span>
        </div>
        <div className="greeting-copy">
          <h1 className="plan serif greeting-title">{timeGreeting()}, Pratt</h1>
          {sc.n != null && <span className="greeting-score-pill">{sc.n} · {scoreLabel(sc.n)}</span>}
          {ouraLine && <p className="greeting-oura">{ouraLine}</p>}
        </div>
      </div>
    </div>
  );
}
