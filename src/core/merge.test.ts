import { describe, expect, it } from 'vitest';
import { mergePlans } from './merge';
import { emptyPlanState } from './types';

describe('mergePlans', () => {
  it('unions done keys from both devices', () => {
    const local = { ...emptyPlanState(), done: { '2026-07-10|gym': 1 as const }, updatedAt: 100 };
    const remote = { ...emptyPlanState(), done: { '2026-07-10|run': 1 as const }, updatedAt: 200 };
    const { plan } = mergePlans(local, remote, 200);
    expect(plan.done).toEqual({ '2026-07-10|gym': 1, '2026-07-10|run': 1 });
  });

  it('prefers newer side for conflicting map values', () => {
    const local = {
      ...emptyPlanState(),
      times: { '2026-07-10|gym': 7 },
      updatedAt: 300,
    };
    const remote = {
      ...emptyPlanState(),
      times: { '2026-07-10|gym': 9 },
      updatedAt: 200,
    };
    const { plan } = mergePlans(local, remote, 200);
    expect(plan.times['2026-07-10|gym']).toBe(7);
  });

  it('merges todos by text without duplicates', () => {
    const local = {
      ...emptyPlanState(),
      todos: { '2026-07-10': [{ x: 'Buy groceries', d: 0 as const }] },
      updatedAt: 100,
    };
    const remote = {
      ...emptyPlanState(),
      todos: { '2026-07-10': [{ x: 'Call mom', d: 0 as const }, { x: 'Buy groceries', d: 1 as const }] },
      updatedAt: 200,
    };
    const { plan } = mergePlans(local, remote, 200);
    expect(plan.todos['2026-07-10']).toHaveLength(2);
    expect(plan.todos['2026-07-10']!.map(t => t.x).sort()).toEqual(['Buy groceries', 'Call mom']);
  });

  it('flags conflict when both sides edited same key', () => {
    const local = {
      ...emptyPlanState(),
      edits: { '2026-07-10|gym': { ti: 'Morning lift' } },
      updatedAt: 300,
    };
    const remote = {
      ...emptyPlanState(),
      edits: { '2026-07-10|gym': { ti: 'Evening lift' } },
      updatedAt: 200,
    };
    const { hadConflict } = mergePlans(local, remote, 200);
    expect(hadConflict).toBe(true);
  });
});
