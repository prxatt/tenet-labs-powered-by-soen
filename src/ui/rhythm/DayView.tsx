import { useEffect, useState } from 'react';
import { fmt, key } from '../../core/dates';
import { assignLanes, blocksFor } from '../../core/schedule';
import { store } from '../../core/store';
import { useApp, toast } from '../hooks';
import { useTouchDevice } from '../hooks/useTouchDevice';
import type { SheetReq } from '../App';
import RhythmDashboard from './RhythmDashboard';

const PX = 38, T0 = 7, T1 = 23.5;

function blockHeight(dur: number, cols: number): number {
  const slotPx = dur * PX;
  const minH = cols > 1 ? 40 : 18;
  if (slotPx < 22) return Math.max(minH, slotPx);
  return Math.max(minH, slotPx - 4);
}

export function Timeline({ cur, openSheet }: { cur: Date; openSheet: (s: SheetReq) => void }) {
  const { plan, oura } = useApp();
  const touch = useTouchDevice();
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
  const TL_LEFT = touch ? 48 : 56;
  const TL_GUTTER = touch ? 76 : 96;
  const GUT = touch ? 4 : 2;

  useEffect(() => { setFocus(null); }, [k]);

  return (
    <div className="card tlcard">
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
          const hpx = blockHeight(b.dur, cols);
          const focused = focus === dk;
          const narrow = cols > 1 && !focused;
          const showDetail = !narrow || focused || b.dur >= 0.35;
          const cls = ['blkT', b.cls,
            isDone ? 'done' : '',
            b.dur < 0.45 && narrow ? 'tiny' : '',
            cols > 1 ? 'ov' : '',
            narrow ? 'ov-narrow' : '',
            focused ? 'focus' : ''].filter(Boolean).join(' ');
          const colW = `calc((100% - ${TL_GUTTER}px - ${(cols - 1) * GUT}px) / ${cols})`;
          return (
            <div key={dk + col} className={cls} role="button" aria-label={b.ti}
              style={{
                top: (b.t - T0) * PX + 10, height: hpx,
                left: `calc(${TL_LEFT}px + ${col} * (${colW} + ${GUT}px))`,
                width: colW,
                zIndex: focused ? 60 : 10 + col + Math.round((1 / b.dur) * 5),
                ['--blk-h' as string]: hpx + 'px',
              }}
              onClick={e => {
                e.stopPropagation();
                if (cols > 1 && !focused) { setFocus(dk); return; }
                setFocus(null);
                openSheet({ type: 'event', block: b, shownOn: k });
              }}>
              <span className={'ckbox' + (isDone ? ' ok' : '')} title="Mark done"
                onClick={e => { e.stopPropagation(); store.toggleDone(dk); toast(isDone ? 'Unchecked' : 'Done — synced'); }} />
              <b title={b.ti}>{b.ti}</b>
              {showDetail && (
                <small>{fmt(b.t)}–{fmt(b.t + b.dur)}{b.su && (cols < 2 || focused) ? ' · ' + b.su : ''}</small>
              )}
              {b.dur >= 1.2 && showDetail && (cols < 3 || focused) && (
                <span className="ftag">{b.fo}{b.movedIn ? ' · moved' : ''}</span>
              )}
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

export default function DayView({ cur, openSheet, timelineOnly }: { cur: Date; openSheet: (s: SheetReq) => void; timelineOnly?: boolean }) {
  if (timelineOnly) {
    return (
      <div className="grid g-day g-day-cal">
        <Timeline cur={cur} openSheet={openSheet} />
      </div>
    );
  }
  return (
    <div className="grid g-day">
      <div>
        <RhythmDashboard cur={cur} openSheet={openSheet} />
      </div>
      <Timeline cur={cur} openSheet={openSheet} />
    </div>
  );
}
