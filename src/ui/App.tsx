import { useEffect, useState } from 'react';
import type { Block, Recipe } from '../core/types';
import { clampToCamp, key } from '../core/dates';
import { getOuraError, syncOura } from '../core/api';
import { gymVisitsThisWeek, recordGeoSample } from '../core/geoLocal';
import { refreshBehavior } from '../core/habits';
import { initSync } from '../core/sync';
import { store } from '../core/store';
import { useApp } from './hooks';
import { useTouchDevice } from './hooks/useTouchDevice';
import Loader from './Loader';
import Toast from './Toast';
import CommandDock from './CommandDock';
import GreetingBar from './GreetingBar';
import LiveChip from './LiveChip';
import SoenModal from './SoenModal';
import PlanPage, { RhythmPage, type PlanSeg } from './PlanPage';
import FuelPage from './fuel/FuelPage';
import RoadmapPage from './roadmap/RoadmapPage';
import EventSheet from './sheets/EventSheet';
import LogSheet from './sheets/LogSheet';
import AskSheet from './sheets/AskSheet';
import SettingsSheet from './sheets/SettingsSheet';
import RecipeSheet from './sheets/RecipeSheet';
import ShotListSheet from './sheets/ShotListSheet';
import { IcWave, IcFuel, IcRoad, IcCal } from './Icons';

export type SheetReq =
  | { type: 'event'; block: Block; shownOn: string }
  | { type: 'log' } | { type: 'settings' } | { type: 'ask'; prefill?: string } | { type: 'retune' }
  | { type: 'shot' } | { type: 'recipe'; recipe: Recipe };

type Tab = 'rhythm' | 'plan' | 'fuel' | 'roadmap';

export default function App() {
  const app = useApp();
  const touch = useTouchDevice();
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<Tab>(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 1024px)').matches ? 'plan' : 'plan',
  );
  const [seg, setSeg] = useState<PlanSeg>('day');
  const [cur, setCur] = useState<Date>(() => clampToCamp(new Date()));
  const [sheet, setSheet] = useState<SheetReq | null>(null);
  const [soenQ, setSoenQ] = useState<string | null>(null);
  const [atGym, setAtGym] = useState(false);
  const ouraErr = getOuraError();

  useEffect(() => {
    if (touch) setTab('plan');
  }, [touch]);

  useEffect(() => {
    initSync();
    void syncOura();
    const iv = setInterval(() => { void syncOura(); }, 30 * 60 * 1000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const gl = app.plan.prefs.gymLoc;
    const hl = app.plan.prefs.homeLoc;
    if (!navigator.geolocation) return;
    const check = () => navigator.geolocation.getCurrentPosition(p => {
      const { latitude: la, longitude: lo } = p.coords;
      recordGeoSample(la, lo, gl, hl);
      refreshBehavior(gymVisitsThisWeek());
      if (gl) {
        const dLa = (la - gl.la) * 111320;
        const dLo = (lo - gl.lo) * 111320 * Math.cos(gl.la * Math.PI / 180);
        setAtGym(Math.hypot(dLa, dLo) < 250);
      }
    }, () => { /* denied */ }, { maximumAge: 120000 });
    check();
    const iv = setInterval(check, 180000);
    return () => clearInterval(iv);
  }, [app.plan.prefs.gymLoc, app.plan.prefs.homeLoc]);

  const goToDate = (d: Date) => {
    setCur(clampToCamp(d));
    setSeg('day');
    setTab(touch ? 'plan' : 'plan');
  };
  const openSheet = (s: SheetReq) => setSheet(s);
  const isGymDay = [1, 3, 4, 5].includes(new Date().getDay());
  const today = clampToCamp(new Date());

  return (
    <>
      <div id="amb"><i className="a1" /><i className="a2" /><i className="a3" /></div>
      {!loaded && <Loader onDone={() => setLoaded(true)} />}
      <div
        className={'app' + (touch && tab === 'plan' ? ' app-plan-mobile' : '')}
        data-tab={tab}
        data-touch={touch ? '1' : '0'}
      >
        <div className="top">
          <div className="brand">TENET LABS<small>POWERED BY SOEN</small></div>
          <div className="right">
            <LiveChip atGym={atGym} ouraError={ouraErr} />
            <button className="ava" onClick={() => openSheet({ type: 'settings' })}>P</button>
          </div>
        </div>

        <GreetingBar tab={tab} touch={touch} />

        {atGym && isGymDay && (
          <div id="gymBanner">
            <b>Gym Mode — you're at Bay Breakers</b>
            <p>Rig the phone before you wrap: 45° front, full body, 60 fps. One bag round is today's Sense data.</p>
            <div className="gb">
              <button onClick={() => openSheet({ type: 'shot' })}>Shot list</button>
              <button onClick={() => openSheet({ type: 'log' })}>Log class</button>
            </div>
          </div>
        )}

        <div className="tabs">
          {touch && (
            <button className={'tab' + (tab === 'rhythm' ? ' on' : '')} onClick={() => setTab('rhythm')}><IcWave />Rhythm</button>
          )}
          <button className={'tab tab-plan' + (tab === 'plan' ? ' on' : '')} onClick={() => setTab('plan')}><IcCal />Plan</button>
          <button className={'tab' + (tab === 'fuel' ? ' on' : '')} onClick={() => setTab('fuel')}><IcFuel />Fuel</button>
          <button className={'tab' + (tab === 'roadmap' ? ' on' : '')} onClick={() => setTab('roadmap')}><IcRoad />Roadmap</button>
        </div>

        <div className={'view' + (tab === 'rhythm' ? ' on' : '')}>
          {tab === 'rhythm' && touch && <RhythmPage cur={today} openSheet={openSheet} />}
        </div>
        <div className={'view' + (tab === 'plan' ? ' on' : '')}>
          {tab === 'plan' && (
            <div className="plan-shell">
              <PlanPage cur={cur} seg={seg} setSeg={setSeg} setCur={setCur} openSheet={openSheet} calendarOnly={touch} />
            </div>
          )}
        </div>
        <div className={'view' + (tab === 'fuel' ? ' on' : '')}>{tab === 'fuel' && <FuelPage openSheet={openSheet} />}</div>
        <div className={'view' + (tab === 'roadmap' ? ' on' : '')}>{tab === 'roadmap' && <RoadmapPage />}</div>
      </div>

      <CommandDock cur={cur} goToDate={goToDate} openSheet={openSheet} onSoen={q => setSoenQ(q)} />

      {soenQ && <SoenModal question={soenQ} onClose={() => setSoenQ(null)} />}

      {sheet?.type === 'event' && <EventSheet block={sheet.block} shownOn={sheet.shownOn} onClose={() => setSheet(null)} />}
      {sheet?.type === 'log' && <LogSheet cur={cur} onClose={() => setSheet(null)} />}
      {sheet?.type === 'retune' && <AskSheet cur={cur} retune onClose={() => setSheet(null)} />}
      {sheet?.type === 'settings' && <SettingsSheet onClose={() => setSheet(null)} />}
      {sheet?.type === 'recipe' && <RecipeSheet recipe={sheet.recipe} onClose={() => setSheet(null)} />}
      {sheet?.type === 'shot' && <ShotListSheet onClose={() => setSheet(null)} />}
      <Toast />
    </>
  );
}
