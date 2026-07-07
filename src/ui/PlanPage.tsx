import type { SheetReq } from './App';
import DateStrip from './DateStrip';
import DayView from './rhythm/DayView';
import RhythmDashboard from './rhythm/RhythmDashboard';
import WeekView from './rhythm/WeekView';
import MonthView from './rhythm/MonthView';

export type PlanSeg = 'day' | 'week' | 'month';

export default function PlanPage({
  cur, seg, setSeg, setCur, openSheet, calendarOnly,
}: {
  cur: Date; seg: PlanSeg; setSeg: (s: PlanSeg) => void;
  setCur: (d: Date) => void; openSheet: (s: SheetReq) => void;
  calendarOnly?: boolean;
}) {
  return (
    <>
      <div className="segwrap segwrap-tight">
        <div className="seg">
          {(['day', 'week', 'month'] as PlanSeg[]).map(s => (
            <button key={s} className={seg === s ? 'on' : ''} onClick={() => setSeg(s)}>{s[0].toUpperCase() + s.slice(1)}</button>
          ))}
        </div>
      </div>
      {seg === 'day' && <DateStrip cur={cur} onPick={setCur} />}
      {seg === 'day' && (calendarOnly
        ? <DayView cur={cur} openSheet={openSheet} timelineOnly />
        : <DayView cur={cur} openSheet={openSheet} />)}
      {seg === 'week' && <WeekView cur={cur} openSheet={openSheet} />}
      {seg === 'month' && <MonthView cur={cur} onPick={d => { setCur(d); setSeg('day'); }} />}
    </>
  );
}

export function RhythmPage({ cur, openSheet }: { cur: Date; openSheet: (s: SheetReq) => void }) {
  return <RhythmDashboard cur={cur} openSheet={openSheet} />;
}