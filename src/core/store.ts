/**
 * App store — tiny observable, framework-free (usable from React via
 * useSyncExternalStore today and from React Native unchanged tomorrow).
 * Persists to localStorage immediately; cloud sync hooks in via onChange.
 */
import type { OuraDay, PlanState, Recipe } from './types';
import { emptyPlanState } from './types';

export interface AppState {
  plan: PlanState;
  oura: Record<string, OuraDay>;
  sync: 'local' | 'syncing' | 'ok' | 'err';
  email: string | null;
}

type Listener = () => void;

const LS_PLAN = 'tl7_plan';
const LS_OURA = 'tl7_oura';

function loadLocal(): { plan: PlanState; oura: Record<string, OuraDay> } {
  try {
    const plan = JSON.parse(localStorage.getItem(LS_PLAN) || 'null');
    const oura = JSON.parse(localStorage.getItem(LS_OURA) || 'null');
    if (plan) return { plan: { ...emptyPlanState(), ...plan }, oura: oura || {} };
  } catch { /* fall through */ }
  return { plan: migrateV6() ?? emptyPlanState(), oura: migrateV6Oura() };
}

/** One-time import of the v6 single-file app's localStorage data. */
function migrateV6(): PlanState | null {
  try {
    const g = (k: string) => JSON.parse(localStorage.getItem('ts_' + k) || 'null');
    const moves = g('moves'), times = g('times'), logs = g('logs'), done = g('done'),
      custom = g('custom'), todos = g('todos'), gymLoc = g('gymLoc');
    if (!moves && !done && !custom && !todos) return null;
    return {
      ...emptyPlanState(),
      moves: moves || {}, times: times || {}, logs: logs || {}, done: done || {},
      custom: custom || {}, todos: todos || {},
      prefs: { gymLoc: gymLoc || null },
      updatedAt: Date.now(),
    };
  } catch { return null; }
}

function migrateV6Oura(): Record<string, OuraDay> {
  try { return JSON.parse(localStorage.getItem('ts_ouraD') || 'null') || {}; } catch { return {}; }
}

class Store {
  private state: AppState;
  private listeners = new Set<Listener>();
  /** called after every plan mutation (cloud push hook) */
  onPlanChange: ((plan: PlanState) => void) | null = null;

  constructor() {
    const { plan, oura } = loadLocal();
    this.state = { plan, oura, sync: 'local', email: null };
  }

  get = (): AppState => this.state;

  subscribe = (fn: Listener): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  private emit() { this.listeners.forEach(fn => fn()); }

  /** Mutate plan state; persists + notifies + schedules cloud push. */
  updatePlan(mut: (p: PlanState) => Partial<PlanState>) {
    const next: PlanState = { ...this.state.plan, ...mut(this.state.plan), updatedAt: Date.now() };
    this.state = { ...this.state, plan: next };
    try { localStorage.setItem(LS_PLAN, JSON.stringify(next)); } catch { /* quota */ }
    this.emit();
    this.onPlanChange?.(next);
  }

  /** Replace plan wholesale (cloud pull). Does NOT re-push. */
  replacePlan(plan: PlanState) {
    this.state = { ...this.state, plan };
    try { localStorage.setItem(LS_PLAN, JSON.stringify(plan)); } catch { /* quota */ }
    this.emit();
  }

  setOura(oura: Record<string, OuraDay>, syncPlan = true) {
    this.state = { ...this.state, oura };
    try { localStorage.setItem(LS_OURA, JSON.stringify(oura)); } catch { /* quota */ }
    if (syncPlan) {
      this.state = {
        ...this.state,
        plan: { ...this.state.plan, ouraData: oura, updatedAt: Date.now() },
      };
      try { localStorage.setItem(LS_PLAN, JSON.stringify(this.state.plan)); } catch { /* quota */ }
      this.onPlanChange?.(this.state.plan);
    }
    this.emit();
  }

  setSync(sync: AppState['sync'], email?: string | null) {
    this.state = { ...this.state, sync, email: email === undefined ? this.state.email : email };
    this.emit();
  }

  /* ---- convenience mutators ---- */
  toggleDone(dk: string) {
    this.updatePlan(p => {
      const done = { ...p.done };
      if (done[dk]) delete done[dk]; else done[dk] = 1;
      return { done };
    });
    void import('./sync').then(m => m.flushPush());
    void import('./habits').then(({ refreshBehavior }) =>
      import('./geoLocal').then(({ gymVisitsThisWeek }) => refreshBehavior(gymVisitsThisWeek())),
    );
  }

  addRecipe(r: Recipe) {
    this.updatePlan(p => ({ userRecipes: [...p.userRecipes, r] }));
  }

  removeRecipe(id: string) {
    this.updatePlan(p => ({ userRecipes: p.userRecipes.filter(r => r.id !== id) }));
  }
}

export const store = new Store();
