import { useEffect, useMemo, useRef } from 'react';
import { CAMP0, CAMP_END, DN, MN, addD, key } from '../core/dates';
import { useApp } from './hooks';

const DAYS_PER_PAGE = 7;

function campDays(): Date[] {
  const days: Date[] = [];
  for (let d = new Date(CAMP0); d <= CAMP_END; d = addD(d, 1)) days.push(new Date(d));
  return days;
}

function chunkWeeks(days: Date[]): Date[][] {
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += DAYS_PER_PAGE) {
    weeks.push(days.slice(i, i + DAYS_PER_PAGE));
  }
  return weeks;
}

export default function DateStrip({ cur, onPick }: { cur: Date; onPick: (d: Date) => void }) {
  const { plan } = useApp();
  const scrollRef = useRef<HTMLDivElement>(null);
  const curK = key(cur);
  const weeks = useMemo(() => chunkWeeks(campDays()), []);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const week = root.querySelector('.dweek:has(.dchip.on)') as HTMLElement | null;
    week?.scrollIntoView({ inline: 'start', block: 'nearest', behavior: 'smooth' });
  }, [curK]);

  return (
    <div className="dstrip dstrip-scroll dstrip-weeks">
      <div className="dchips dchips-spring" ref={scrollRef}>
        {weeks.map((week, wi) => {
          let lastMonth = -1;
          return (
            <div key={wi} className="dweek" aria-label={`Week ${wi + 1}`}>
              {week.map(d => {
                const k = key(d);
                const on = k === curK;
                const hasCustom = (plan.custom[k] || []).length > 0;
                const showMonth = d.getMonth() !== lastMonth;
                if (showMonth) lastMonth = d.getMonth();
                return (
                  <div key={k} className="dchip-wrap">
                    {showMonth && <div className="dmonth">{MN[d.getMonth()].slice(0, 3)}</div>}
                    <div className={'dchip' + (on ? ' on' : '')} role="button" aria-label={'go to ' + k}
                      onClick={() => onPick(new Date(d))}>
                      <small>{DN[d.getDay()]}</small><b>{d.getDate()}</b>
                      {hasCustom && <div className="dot" />}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      <div className="dscroll-hint" aria-hidden><span /><span /><span /></div>
    </div>
  );
}
