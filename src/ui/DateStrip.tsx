import { useEffect, useRef } from 'react';
import { CAMP0, CAMP_END, DN, MN, addD, key } from '../core/dates';
import { useApp } from './hooks';

export default function DateStrip({ cur, onPick }: { cur: Date; onPick: (d: Date) => void }) {
  const { plan } = useApp();
  const scrollRef = useRef<HTMLDivElement>(null);
  const curK = key(cur);

  const days: Date[] = [];
  for (let d = new Date(CAMP0); d <= CAMP_END; d = addD(d, 1)) days.push(new Date(d));

  useEffect(() => {
    const el = scrollRef.current?.querySelector('.dchip.on');
    el?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [curK]);

  let lastMonth = -1;

  return (
    <div className="dstrip dstrip-scroll">
      <div className="dchips dchips-spring" ref={scrollRef}>
        {days.map(d => {
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
      <div className="dscroll-hint" aria-hidden><span /><span /><span /></div>
    </div>
  );
}
