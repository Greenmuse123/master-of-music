import { describe, expect, it } from 'vitest';

import { evaluateRhythmHit } from './rhythm-window';
import type { RhythmQuality } from './types';

interface BoundaryCase {
  readonly deltaMs: number;
  readonly quality: RhythmQuality;
}

const TARGET_MS = 1_000;

describe('evaluateRhythmHit', () => {
  it('returns each docs/04 §3.3 quality level with its damage and RES modifiers', () => {
    expect(evaluateRhythmHit(TARGET_MS, TARGET_MS, 0)).toEqual({
      quality: 'critical',
      damageMul: 2,
      resReturn: 6,
      deltaMs: 0,
    });

    expect(evaluateRhythmHit(TARGET_MS + 80, TARGET_MS, 0)).toMatchObject({
      quality: 'perfect',
      damageMul: 1.5,
      resReturn: 4,
    });

    expect(evaluateRhythmHit(TARGET_MS + 160, TARGET_MS, 0)).toMatchObject({
      quality: 'good',
      damageMul: 1,
      resReturn: 2,
    });

    expect(evaluateRhythmHit(TARGET_MS + 300, TARGET_MS, 0)).toMatchObject({
      quality: 'off',
      damageMul: 0.6,
      resReturn: 0,
    });

    expect(evaluateRhythmHit(TARGET_MS + 301, TARGET_MS, 0)).toMatchObject({
      quality: 'miss',
      damageMul: 0.2,
      resReturn: 0,
    });
  });

  it('classifies every focus=0 boundary on both early and late hits', () => {
    const cases: readonly BoundaryCase[] = [
      { deltaMs: -301, quality: 'miss' },
      { deltaMs: -300, quality: 'off' },
      { deltaMs: -299, quality: 'off' },
      { deltaMs: -161, quality: 'off' },
      { deltaMs: -160, quality: 'good' },
      { deltaMs: -159, quality: 'good' },
      { deltaMs: -81, quality: 'good' },
      { deltaMs: -80, quality: 'perfect' },
      { deltaMs: -79, quality: 'perfect' },
      { deltaMs: -41, quality: 'perfect' },
      { deltaMs: -40, quality: 'critical' },
      { deltaMs: -39, quality: 'critical' },
      { deltaMs: 39, quality: 'critical' },
      { deltaMs: 40, quality: 'critical' },
      { deltaMs: 41, quality: 'perfect' },
      { deltaMs: 79, quality: 'perfect' },
      { deltaMs: 80, quality: 'perfect' },
      { deltaMs: 81, quality: 'good' },
      { deltaMs: 159, quality: 'good' },
      { deltaMs: 160, quality: 'good' },
      { deltaMs: 161, quality: 'off' },
      { deltaMs: 299, quality: 'off' },
      { deltaMs: 300, quality: 'off' },
      { deltaMs: 301, quality: 'miss' },
    ];

    for (const testCase of cases) {
      const result = evaluateRhythmHit(TARGET_MS + testCase.deltaMs, TARGET_MS, 0);

      expect(result.quality).toBe(testCase.quality);
      expect(result.deltaMs).toBe(testCase.deltaMs);
    }
  });

  it('classifies every focus=100 widened boundary on both early and late hits', () => {
    const cases: readonly BoundaryCase[] = [
      { deltaMs: -451, quality: 'miss' },
      { deltaMs: -450, quality: 'off' },
      { deltaMs: -449, quality: 'off' },
      { deltaMs: -241, quality: 'off' },
      { deltaMs: -240, quality: 'good' },
      { deltaMs: -239, quality: 'good' },
      { deltaMs: -121, quality: 'good' },
      { deltaMs: -120, quality: 'perfect' },
      { deltaMs: -119, quality: 'perfect' },
      { deltaMs: -61, quality: 'perfect' },
      { deltaMs: -60, quality: 'critical' },
      { deltaMs: -59, quality: 'critical' },
      { deltaMs: 59, quality: 'critical' },
      { deltaMs: 60, quality: 'critical' },
      { deltaMs: 61, quality: 'perfect' },
      { deltaMs: 119, quality: 'perfect' },
      { deltaMs: 120, quality: 'perfect' },
      { deltaMs: 121, quality: 'good' },
      { deltaMs: 239, quality: 'good' },
      { deltaMs: 240, quality: 'good' },
      { deltaMs: 241, quality: 'off' },
      { deltaMs: 449, quality: 'off' },
      { deltaMs: 450, quality: 'off' },
      { deltaMs: 451, quality: 'miss' },
    ];

    for (const testCase of cases) {
      const result = evaluateRhythmHit(TARGET_MS + testCase.deltaMs, TARGET_MS, 100);

      expect(result.quality).toBe(testCase.quality);
      expect(result.deltaMs).toBe(testCase.deltaMs);
    }
  });

  it('caps focus at 100 for max +50% widening', () => {
    expect(evaluateRhythmHit(TARGET_MS + 60, TARGET_MS, 100).quality).toBe('critical');
    expect(evaluateRhythmHit(TARGET_MS + 61, TARGET_MS, 100).quality).toBe('perfect');
    expect(evaluateRhythmHit(TARGET_MS + 61, TARGET_MS, 1_000).quality).toBe('perfect');
  });

  it('scales finite focus linearly between 0 and 100', () => {
    expect(evaluateRhythmHit(TARGET_MS + 50, TARGET_MS, 50).quality).toBe('critical');
    expect(evaluateRhythmHit(TARGET_MS + 51, TARGET_MS, 50).quality).toBe('perfect');
  });

  it('treats negative or non-finite focus as zero', () => {
    expect(evaluateRhythmHit(TARGET_MS + 41, TARGET_MS, -1).quality).toBe('perfect');
    expect(evaluateRhythmHit(TARGET_MS + 41, TARGET_MS, Number.NaN).quality).toBe('perfect');
  });

  it('treats non-finite timestamps as misses with infinite delta', () => {
    expect(evaluateRhythmHit(Number.NaN, TARGET_MS, 0)).toEqual({
      quality: 'miss',
      damageMul: 0.2,
      resReturn: 0,
      deltaMs: Number.POSITIVE_INFINITY,
    });

    expect(evaluateRhythmHit(TARGET_MS, Number.POSITIVE_INFINITY, 0)).toEqual({
      quality: 'miss',
      damageMul: 0.2,
      resReturn: 0,
      deltaMs: Number.POSITIVE_INFINITY,
    });
  });
});
