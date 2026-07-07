import { useEffect, useState } from 'react';
import type { Block, Recipe } from '../core/types';
import { CAMP0, CAMP_END, DN, addD, clampToCamp, key, weekIdx, PHASE } from '../core/dates';
import { blocksFor } from '../core/schedule';
import { syncOura } from '../core/api';
import { initSync } from '../core/sync';
import { store } from '../core/store';
import { useApp, toast } from './hooks';
import Loader from './Loader';
import Toast from './Toast';
import CommandDock from './CommandDock';
import DayView from './rhythm/DayView';
import WeekView from './rhythm/WeekView';
import MonthView from './rhythm/MonthView';
import FuelPage from './fuel/FuelPage';
import RoadmapPage from './roadmap/RoadmapPage';
import EventSheet from './sheets/EventSheet';
import LogSheet from './sheets/LogSheet';
import AskSheet from './sheets/AskSheet';
import SettingsSheet from './sheets/SettingsSheet';
import RecipeSheet from './sheets/RecipeSheet';
import ShotListSheet from './sheets/ShotListSheet';
import { IcWave, IcFuel, IcRoad } from './Icons';

export type SheetReq =
  | { type: 'event'; block: Block; shownOn: string }
  | { type: 'log' } | { type: 'settings' } | { type: 'ask'; prefill?: string } | { type: 'retune' }
  | { type: 'shot' } | { type: 'recipe'; recipe: Recipe };

type Tab = 'rhythm' | 'fuel' | 'roadmap';
type Seg = 'day' | 'week' | 'month';

export default function App() {
  const app = useApp();
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<Tab>('rhythm');
  const [seg, setSeg] = useState<Seg>('day');
  const [cur, setCur] = useState<Date>(() => clampToCamp(new Date()));
  const [sheet, setSheet] = useState<SheetReq | null>(null);
  const [atGym, setAtGym] = useState(false);

  useEffect(() => {
    initSync();
    void syncOura();
    const iv = setInterval(() => { void syncOura(); }, 30 * 60 * 1000);
    return () => clearInterval(iv);
  }, []);

  // gym proximity check
  useEffect(() => {
    const gl = app.plan.prefs.gymLoc;
    if (!gl || !navigator.geolocation) return;
    const check = () => navigator.geolocation.getCurrentPosition(p => {
      const dLa = (p.coords.latitude - gl.la) * 111320;
      const dLo = (p.coords.longitude - gl.lo) * 111320 * Math.cos(gl.la * Math.PI / 180);
      setAtGym(Math.hypot(dLa, dLo) < 250);
    }, () => { /* denied */ }, { maximumAge: 120000 });
    check();
    const iv = setInterval(check, 180000);
    return () => clearInterval(iv);
  }, [app.plan.prefs.gymLoc]);

  const goToDate = (d: Date) => { setCur(clampToCamp(d)); setTab('rhythm'); setSeg('day'); };
  const openSheet = (s: SheetReq) => setSheet(s);
  const w = weekIdx(cur);
  const isGymDay = [1, 3, 4, 5].includes(new Date().getDay());

  const dayChips = (() => {
    const out: Date[] = [];
    for (let d = new Date(CAMP0); d <= CAMP_END; d = addD(d, 1)) out.push(new Date(d));
    return out;
  })();

  return (
    <>
      <div id="amb"><i className="a1" /><i className="a2" /><i className="a3" /></div>
      {!loaded && <Loader onDone={() => setLoaded(true)} />}
      <div className="app">
        <div className="top">
          <div className="brand">TENET LABS<small>POWERED BY SOEN</small></div>
          <div className="right">
            <span id="geoChip" className={atGym ? 'gym' : ''}>{atGym ? 'AT THE GYM' : 'Wk ' + (w + 1) + ' · ' + PHASE[w]}</span>
            <span className={'syncdot ' + (app.sync === 'ok' ? 'ok' : app.sync === 'err' ? 'err' : 'local')}
              title={app.sync === 'ok' ? 'Synced — ' + app.email : app.sync === 'local' ? 'This device only' : app.sync} />
            <button className="ava" onClick={() => openSheet({ type: 'settings' })}>P</button>
          </div>
        </div>

        <h1 className="plan serif" id="pageTitle">
          {tab === 'rhythm'
            ? (new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening') + ', Pratt'
            : tab === 'fuel' ? 'Fuel' : 'Roadmap'}
        </h1>
        <div className="tagline" id="pageTag">
          {tab === 'rhythm' ? 'Your rhythm — plan, calendar, health, progress. One page.'
            : tab === 'fuel' ? 'Breakfast · lunch · dinner — recipes, prep, and the protein system.'
            : 'TENET Boxing · Sense · filming · what the numbers should do.'}
        </div>

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
          <button className={'tab' + (tab === 'rhythm' ? ' on' : '')} onClick={() => setTab('rhythm')}><IcWave />Rhythm</button>
          <button className={'tab' + (tab === 'fuel' ? ' on' : '')} onClick={() => setTab('fuel')}><IcFuel />Fuel</button>
          <button className={'tab' + (tab === 'roadmap' ? ' on' : '')} onClick={() => setTab('roadmap')}><IcRoad />Roadmap</button>
        </div>

        <div className={'view' + (tab === 'rhythm' ? ' on' : '')}>
          {tab === 'rhythm' && (
            <>
              <div className="segwrap">
                <div className="seg">
                  {(['day', 'week', 'month'] as Seg[]).map(s => (
                    <button key={s} className={seg === s ? 'on' : ''} onClick={() => setSeg(s)}>{s[0].toUpperCase() + s.slice(1)}</button>
                  ))}
                </div>
              </div>
              {seg === 'day' && (
                <div className="dstrip">
                  <button className="navb" onClick={() => setCur(c => clampToCamp(addD(c, -1)))}>‹</button>
                  <div className="dchips">
                    {dayChips.map(d => {
                      const k = key(d);
                      const on = k === key(cur);
                      const hasCustom = (app.plan.custom[k] || []).length > 0;
                      return (
                        <div key={k} className={'dchip' + (on ? ' on' : '')} role="button" aria-label={'go to ' + k} onClick={() => setCur(new Date(d))}
                          ref={el => { if (on && el) el.scrollIntoView({ inline: 'center', block: 'nearest' }); }}>
                          <small>{DN[d.getDay()]}</small><b>{d.getDate()}</b>
                          {hasCustom && <div className="dot" />}
                        </div>
                      );
                    })}
                  </div>
                  <button className="navb" onClick={() => setCur(c => clampToCamp(addD(c, 1)))}>›</button>
                </div>
              )}
              {seg === 'day' && <DayView cur={cur} openSheet={openSheet} />}
              {seg === 'week' && <WeekView cur={cur} openSheet={openSheet} />}
              {seg === 'month' && <MonthView cur={cur} onPick={d => { setCur(d); setSeg('day'); }} />}
            </>
          )}
        </div>
        <div className={'view' + (tab === 'fuel' ? ' on' : '')}>{tab === 'fuel' && <FuelPage openSheet={openSheet} />}</div>
        <div className={'view' + (tab === 'roadmap' ? ' on' : '')}>{tab === 'roadmap' && <RoadmapPage />}</div>
      </div>

      {loaded && tab === 'rhythm' && <CommandDock cur={cur} goToDate={goToDate} openSheet={openSheet} />}

      {sheet?.type === 'event' && <EventSheet block={sheet.block} shownOn={sheet.shownOn} onClose={() => setSheet(null)} />}
      {sheet?.type === 'log' && <LogSheet cur={cur} onClose={() => setSheet(null)} />}
      {(sheet?.type === 'ask' || sheet?.type === 'retune') && (
        <AskSheet cur={cur} retune={sheet.type === 'retune'} prefill={sheet.type === 'ask' ? sheet.prefill : undefined} onClose={() => setSheet(null)} />
      )}
      {sheet?.type === 'settings' && <SettingsSheet onClose={() => setSheet(null)} />}
      {sheet?.type === 'recipe' && <RecipeSheet recipe={sheet.recipe} onClose={() => setSheet(null)} />}
      {sheet?.type === 'shot' && <ShotListSheet onClose={() => setSheet(null)} />}
      <Toast />
    </>
  );
}
