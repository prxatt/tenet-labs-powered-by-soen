import { describe, expect, it } from 'vitest';
import { key, addD, clampToCamp, CAMP0, CAMP_END } from './dates';

describe('dates', () => {
  it('formats date keys', () => {
    expect(key(new Date(2026, 6, 10))).toBe('2026-07-10');
  });

  it('adds days', () => {
    expect(key(addD(new Date(2026, 6, 10), 3))).toBe('2026-07-13');
  });

  it('clamps to camp window', () => {
    expect(clampToCamp(new Date(2020, 0, 1)).getTime()).toBe(CAMP0.getTime());
    expect(clampToCamp(new Date(2030, 0, 1)).getTime()).toBe(CAMP_END.getTime());
  });
});
