import { describe, expect, it } from 'vitest';

import { evaluateRhythmHit } from './rhythm-window-placeholder';

describe('evaluateRhythmHit', () => {
  it('returns perfect inside the 80ms band at focus=0', () => {
    const onBeat = evaluateRhythmHit(1000, 1000, 0);
    const early = evaluateRhythmHit(920, 1000, 0);
    const late = evaluateRhythmHit(1080, 1000, 0);

    expect(onBeat.quality).toBe('perfect');
    expect(onBeat.deltaMs).toBe(0);
    expect(onBeat.damageMul).toBe(1.5);
    expect(onBeat.resReturn).toBe(4);

    expect(early.quality).toBe('perfect');
    expect(early.deltaMs).toBe(-80);

    expect(late.quality).toBe('perfect');
    expect(late.deltaMs).toBe(80);
  });

  it('returns good in the 80–160ms band at focus=0', () => {
    const early = evaluateRhythmHit(840, 1000, 0);
    const late = evaluateRhythmHit(1160, 1000, 0);

    expect(early.quality).toBe('good');
    expect(early.damageMul).toBe(1);
    expect(early.resReturn).toBe(2);

    expect(late.quality).toBe('good');
  });

  it('returns miss past 160ms at focus=0', () => {
    const result = evaluateRhythmHit(1200, 1000, 0);

    expect(result.quality).toBe('miss');
    expect(result.damageMul).toBe(0.2);
    expect(result.resReturn).toBe(0);
    expect(result.deltaMs).toBe(200);
  });

  it('widens both windows additively up to +50% at focus=100', () => {
    // At focus=100 perfect window grows to 120ms.
    const stretched = evaluateRhythmHit(1119, 1000, 100);
    expect(stretched.quality).toBe('perfect');

    // 121ms is just outside perfect but inside good (good grows to 240ms).
    const justOutPerfect = evaluateRhythmHit(1121, 1000, 100);
    expect(justOutPerfect.quality).toBe('good');

    // 241ms drops to miss.
    const missAtFocus100 = evaluateRhythmHit(1241, 1000, 100);
    expect(missAtFocus100.quality).toBe('miss');
  });

  it('scales focus linearly between 0 and 100', () => {
    // focus=50 -> +25% widen: perfect grows to 100ms.
    const inside = evaluateRhythmHit(1099, 1000, 50);
    const outside = evaluateRhythmHit(1101, 1000, 50);

    expect(inside.quality).toBe('perfect');
    expect(outside.quality).toBe('good');
  });

  it('clamps focus above 100 to the 100 value', () => {
    const clamped = evaluateRhythmHit(1120, 1000, 1000);
    const at100 = evaluateRhythmHit(1120, 1000, 100);

    expect(clamped.quality).toBe(at100.quality);
  });

  it('treats negative or non-finite focus as zero', () => {
    const neg = evaluateRhythmHit(1100, 1000, -10);
    const nan = evaluateRhythmHit(1100, 1000, Number.NaN);
    const zero = evaluateRhythmHit(1100, 1000, 0);

    expect(neg.quality).toBe(zero.quality);
    expect(nan.quality).toBe(zero.quality);
  });

  it('treats non-finite timestamps as a miss', () => {
    const result = evaluateRhythmHit(Number.NaN, 1000, 0);

    expect(result.quality).toBe('miss');
  });
});
