/** Habit & behavior aggregates — synced to Supabase (no raw geo). */
import type { PlanState } from './types';
import { key, weekIdx, CAMP0, addD } from './dates';
import { blocksFor, isKey } from './schedule';
import { store } from './store';
import { ensureSession, hasSupabase, supa } from './sync';

export interface BehaviorData {
  completionByHour: Record<string, { done: number; total: number }>;
  gymWeeks: Record<string, number>;
  skippedBlocks: Record<string, number>;
  avgEnergyByDow: Record<string, number>;
  updatedAt: number;
}

const empty = (): BehaviorData => ({
  completionByHour: {}, gymWeeks: {}, skippedBlocks: {}, avgEnergyByDow: {}, updatedAt: 0,
});

let local: BehaviorData = empty();
let pushTimer: ReturnType<typeof setTimeout> | null = null;

export function getBehavior(): BehaviorData { return local; }

export function aggregateFromPlan(plan: PlanState, gymCountThisWeek: number): BehaviorData {
  const completionByHour: BehaviorData['completionByHour'] = {};
  const skippedBlocks: BehaviorData['skippedBlocks'] = {};
  const energySum: Record<number, { sum: number; n: number }> = {};

  for (let i = 0; i < 14; i++) {
    const d = addD(new Date(), -i);
    const dk = key(d);
    const B = blocksFor(d, plan).filter(isKey);
    B.forEach(b => {
      const hour = String(Math.floor(b.t));
      completionByHour[hour] = completionByHour[hour] || { done: 0, total: 0 };
      completionByHour[hour].total++;
      if (plan.done[b.date + '|' + b.id]) completionByHour[hour].done++;
      else {
        const id = b.id;
        skippedBlocks[id] = (skippedBlocks[id] || 0) + 1;
      }
    });
    const log = plan.logs[dk];
    if (log?.e != null) {
      const dow = d.getDay();
      energySum[dow] = energySum[dow] || { sum: 0, n: 0 };
      energySum[dow].sum += log.e;
      energySum[dow].n++;
    }
  }

  const wk = weekIdx(new Date());
  const weekKey = key(addD(CAMP0, wk * 7));
  const gymWeeks = { ...local.gymWeeks, [weekKey]: gymCountThisWeek };

  const avgEnergyByDow: Record<string, number> = {};
  Object.entries(energySum).forEach(([dow, { sum, n }]) => {
    avgEnergyByDow[dow] = Math.round((sum / n) * 10) / 10;
  });

  return { completionByHour, gymWeeks, skippedBlocks, avgEnergyByDow, updatedAt: Date.now() };
}

export function refreshBehavior(gymCountThisWeek: number): void {
  local = aggregateFromPlan(store.get().plan, gymCountThisWeek);
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => { void pushBehavior(); }, 2000);
}

async function pushBehavior(): Promise<void> {
  if (!hasSupabase()) return;
  const s = await ensureSession();
  if (!s) return;
  await supa().from('behavior_insights').upsert(
    { user_id: s.user.id, data: local, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' },
  );
}

export async function pullBehavior(): Promise<void> {
  if (!hasSupabase()) return;
  const s = await ensureSession();
  if (!s) return;
  const { data } = await supa()
    .from('behavior_insights').select('data').eq('user_id', s.user.id).maybeSingle();
  if (data?.data) local = { ...empty(), ...(data.data as BehaviorData) };
}

export function behaviorSummary(): string {
  const b = local;
  const parts: string[] = [];
  const bestHour = Object.entries(b.completionByHour)
    .filter(([, v]) => v.total >= 3)
    .sort((a, b) => (b[1].done / b[1].total) - (a[1].done / a[1].total))[0];
  if (bestHour) parts.push(`Strongest completion around ${bestHour[0]}:00`);
  const topSkip = Object.entries(b.skippedBlocks).sort((a, b) => b[1] - a[1])[0];
  if (topSkip && topSkip[1] >= 3) parts.push(`Often open: ${topSkip[0]} (${topSkip[1]}x)`);
  const wk = Object.values(b.gymWeeks).slice(-1)[0];
  if (wk != null) parts.push(`Gym days this week: ${wk}/4 target`);
  return parts.join('. ') || 'Building your habit profile…';
}
