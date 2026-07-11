/**
 * Field-aware plan merge for multi-device sync.
 * done keys always union; map fields merge per-key with newer plan winning conflicts.
 */
import type { PlanState, Recipe, TodoItem } from './types';

export interface MergeResult {
  plan: PlanState;
  hadConflict: boolean;
}

function mergeMaps<T extends Record<string, unknown>>(
  local: T, remote: T, localWinsConflict: boolean,
): { merged: T; conflicts: number } {
  const merged = { ...remote } as T;
  let conflicts = 0;
  for (const k of Object.keys(local)) {
    if (k in remote && JSON.stringify(local[k]) !== JSON.stringify(remote[k])) conflicts++;
    if (!(k in remote) || localWinsConflict) (merged as Record<string, unknown>)[k] = local[k];
  }
  return { merged, conflicts };
}

function mergeTodos(
  local: PlanState['todos'], remote: PlanState['todos'], localWinsConflict: boolean,
): PlanState['todos'] {
  const days = new Set([...Object.keys(local), ...Object.keys(remote)]);
  const out: PlanState['todos'] = {};
  for (const day of days) {
    const l = local[day] || [];
    const r = remote[day] || [];
    if (!l.length) { out[day] = r; continue; }
    if (!r.length) { out[day] = l; continue; }
    const byText = new Map<string, TodoItem>();
    for (const t of r) byText.set(t.x, t);
    for (const t of l) {
      const prev = byText.get(t.x);
      if (!prev) byText.set(t.x, t);
      else byText.set(t.x, localWinsConflict ? t : prev);
    }
    out[day] = [...byText.values()];
  }
  return out;
}

function mergeRecipes(local: Recipe[], remote: Recipe[]): Recipe[] {
  const byId = new Map<string, Recipe>();
  for (const r of remote) byId.set(r.id || r.n, r);
  for (const r of local) byId.set(r.id || r.n, r);
  return [...byId.values()];
}

function mergeOuraData(
  local?: PlanState['ouraData'], remote?: PlanState['ouraData'], localWins?: boolean,
): PlanState['ouraData'] {
  const l = local || {};
  const r = remote || {};
  const days = new Set([...Object.keys(l), ...Object.keys(r)]);
  const out: NonNullable<PlanState['ouraData']> = {};
  for (const day of days) {
    out[day] = localWins ? { ...r[day], ...l[day] } : { ...l[day], ...r[day] };
  }
  return out;
}

/** Merge local and remote plan states. Returns merged plan + whether key-level conflicts occurred. */
export function mergePlans(local: PlanState, remote: PlanState, remoteAt: number): MergeResult {
  const localAt = local.updatedAt || 0;
  const localWins = localAt >= remoteAt;
  let conflicts = 0;

  const done = { ...remote.done, ...local.done };

  const moves = mergeMaps(local.moves, remote.moves, localWins); conflicts += moves.conflicts;
  const times = mergeMaps(local.times, remote.times, localWins); conflicts += times.conflicts;
  const edits = mergeMaps(local.edits, remote.edits, localWins); conflicts += edits.conflicts;
  const logs = mergeMaps(local.logs, remote.logs, localWins); conflicts += logs.conflicts;
  const custom = mergeMaps(local.custom, remote.custom, localWins); conflicts += custom.conflicts;
  const shots = mergeMaps(local.shots, remote.shots, localWins); conflicts += shots.conflicts;

  const base = localWins ? { ...remote, ...local } : { ...local, ...remote };

  return {
    plan: {
      ...base,
      moves: moves.merged,
      times: times.merged,
      edits: edits.merged,
      logs: logs.merged,
      custom: custom.merged,
      shots: shots.merged,
      done,
      todos: mergeTodos(local.todos, remote.todos, localWins),
      userRecipes: mergeRecipes(local.userRecipes, remote.userRecipes),
      ouraData: mergeOuraData(local.ouraData, remote.ouraData, localWins),
      prefs: localWins ? { ...remote.prefs, ...local.prefs } : { ...local.prefs, ...remote.prefs },
      updatedAt: Math.max(localAt, remoteAt, Date.now()),
    },
    hadConflict: conflicts > 0 && localAt > 0 && remoteAt > 0,
  };
}
