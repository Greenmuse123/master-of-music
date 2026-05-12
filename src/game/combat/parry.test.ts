import { describe, expect, it } from 'vitest';

import { evaluateParry } from './parry';
import type { ParryResult } from './parry';

interface BoundaryCase {
  readonly deltaMs: number;
  readonly quality: ParryResult['quality'];
}

const ATTACK_CUE_MS = 1_000;

describe('evaluateParry', () => {
  it('returns every docs/04 section 3.6 quality with mitigation and cue-steal flags', () => {
    expect(evaluateParry(ATTACK_CUE_MS, ATTACK_CUE_MS, 0)).toEqual({
      quality: 'critical',
      incomingDamageMul: 0,
      stoleCue: true,
      deltaMs: 0,
    });

    expect(evaluateParry(ATTACK_CUE_MS + 80, ATTACK_CUE_MS, 0)).toEqual({
      quality: 'perfect',
      incomingDamageMul: 0.3,
      stoleCue: false,
      deltaMs: 80,
    });

    expect(evaluateParry(ATTACK_CUE_MS + 160, ATTACK_CUE_MS, 0)).toEqual({
      quality: 'good',
      incomingDamageMul: 0.6,
      stoleCue: false,
      deltaMs: 160,
    });

    expect(evaluateParry(ATTACK_CUE_MS + 161, ATTACK_CUE_MS, 0)).toEqual({
      quality: 'miss',
      incomingDamageMul: 1,
      stoleCue: false,
      deltaMs: 161,
    });
  });

  it('classifies every focus=0 boundary on both early and late parries', () => {
    const cases: readonly BoundaryCase[] = [
      { deltaMs: -161, quality: 'miss' },
      { deltaMs: -160, quality: 'good' },
      { deltaMs: -159, quality: 'good' },
      { deltaMs: -81, quality: 'good' },
      { deltaMs: -80, quality: 'perfect' },
      { deltaMs: -79, quality: 'perfect' },
      { deltaMs: -31, quality: 'perfect' },
      { deltaMs: -30, quality: 'critical' },
      { deltaMs: -29, quality: 'critical' },
      { deltaMs: 29, quality: 'critical' },
      { deltaMs: 30, quality: 'critical' },
      { deltaMs: 31, quality: 'perfect' },
      { deltaMs: 79, quality: 'perfect' },
      { deltaMs: 80, quality: 'perfect' },
      { deltaMs: 81, quality: 'good' },
      { deltaMs: 159, quality: 'good' },
      { deltaMs: 160, quality: 'good' },
      { deltaMs: 161, quality: 'miss' },
    ];

    for (const testCase of cases) {
      const result = evaluateParry(ATTACK_CUE_MS + testCase.deltaMs, ATTACK_CUE_MS, 0);

      expect(result.quality).toBe(testCase.quality);
      expect(result.deltaMs).toBe(testCase.deltaMs);
    }
  });

  it('classifies every focus=100 widened boundary on both early and late parries', () => {
    const cases: readonly BoundaryCase[] = [
      { deltaMs: -241, quality: 'miss' },
      { deltaMs: -240, quality: 'good' },
      { deltaMs: -239, quality: 'good' },
      { deltaMs: -121, quality: 'good' },
      { deltaMs: -120, quality: 'perfect' },
      { deltaMs: -119, quality: 'perfect' },
      { deltaMs: -46, quality: 'perfect' },
      { deltaMs: -45, quality: 'critical' },
      { deltaMs: -44, quality: 'critical' },
      { deltaMs: 44, quality: 'critical' },
      { deltaMs: 45, quality: 'critical' },
      { deltaMs: 46, quality: 'perfect' },
      { deltaMs: 119, quality: 'perfect' },
      { deltaMs: 120, quality: 'perfect' },
      { deltaMs: 121, quality: 'good' },
      { deltaMs: 239, quality: 'good' },
      { deltaMs: 240, quality: 'good' },
      { deltaMs: 241, quality: 'miss' },
    ];

    for (const testCase of cases) {
      const result = evaluateParry(ATTACK_CUE_MS + testCase.deltaMs, ATTACK_CUE_MS, 100);

      expect(result.quality).toBe(testCase.quality);
      expect(result.deltaMs).toBe(testCase.deltaMs);
    }
  });

  it('expands critical parry to 45ms at focus=100 and no farther', () => {
    expect(evaluateParry(ATTACK_CUE_MS + 45, ATTACK_CUE_MS, 100).quality).toBe('critical');
    expect(evaluateParry(ATTACK_CUE_MS + 46, ATTACK_CUE_MS, 100).quality).toBe('perfect');
  });

  it('sets stoleCue only for critical parries', () => {
    expect(evaluateParry(ATTACK_CUE_MS + 30, ATTACK_CUE_MS, 0).stoleCue).toBe(true);
    expect(evaluateParry(ATTACK_CUE_MS + 31, ATTACK_CUE_MS, 0).stoleCue).toBe(false);
    expect(evaluateParry(ATTACK_CUE_MS + 81, ATTACK_CUE_MS, 0).stoleCue).toBe(false);
    expect(evaluateParry(ATTACK_CUE_MS + 161, ATTACK_CUE_MS, 0).stoleCue).toBe(false);
  });

  it('caps focus at 100 for max +50% widening', () => {
    expect(evaluateParry(ATTACK_CUE_MS + 45, ATTACK_CUE_MS, 100).quality).toBe('critical');
    expect(evaluateParry(ATTACK_CUE_MS + 46, ATTACK_CUE_MS, 100).quality).toBe('perfect');
    expect(evaluateParry(ATTACK_CUE_MS + 46, ATTACK_CUE_MS, 1_000).quality).toBe('perfect');
  });

  it('scales finite focus linearly between 0 and 100', () => {
    expect(evaluateParry(ATTACK_CUE_MS + 37, ATTACK_CUE_MS, 50).quality).toBe('critical');
    expect(evaluateParry(ATTACK_CUE_MS + 38, ATTACK_CUE_MS, 50).quality).toBe('perfect');
  });

  it('treats negative, zero, or non-finite focus as zero', () => {
    expect(evaluateParry(ATTACK_CUE_MS + 31, ATTACK_CUE_MS, -1).quality).toBe('perfect');
    expect(evaluateParry(ATTACK_CUE_MS + 31, ATTACK_CUE_MS, 0).quality).toBe('perfect');
    expect(evaluateParry(ATTACK_CUE_MS + 31, ATTACK_CUE_MS, Number.NaN).quality).toBe('perfect');
  });

  it('treats non-finite timestamps as misses with infinite delta', () => {
    expect(evaluateParry(Number.NaN, ATTACK_CUE_MS, 0)).toEqual({
      quality: 'miss',
      incomingDamageMul: 1,
      stoleCue: false,
      deltaMs: Number.POSITIVE_INFINITY,
    });

    expect(evaluateParry(ATTACK_CUE_MS, Number.POSITIVE_INFINITY, 0)).toEqual({
      quality: 'miss',
      incomingDamageMul: 1,
      stoleCue: false,
      deltaMs: Number.POSITIVE_INFINITY,
    });
  });
});
