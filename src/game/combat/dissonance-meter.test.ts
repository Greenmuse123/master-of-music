import { describe, expect, it } from 'vitest';

import { DissonanceMeter } from './dissonance-meter';
import type { RhythmQuality } from './types';

describe('DissonanceMeter', () => {
  it('starts empty and unstuttered', () => {
    const meter = new DissonanceMeter();

    expect(meter.current()).toBe(0);
    expect(meter.normalized()).toBe(0);
    expect(meter.isStuttered()).toBe(false);
  });

  it('adds docs/04 section 3.4 dissonance from every rhythm quality', () => {
    const cases: ReadonlyArray<readonly [RhythmQuality, number]> = [
      ['miss', 20],
      ['off', 10],
      ['good', 0],
      ['perfect', -5],
      ['critical', -10],
    ];

    for (const [quality, expectedDelta] of cases) {
      const meter = new DissonanceMeter();
      meter.addFromQuality('miss');
      meter.addFromQuality(quality);

      expect(meter.current()).toBe(Math.max(0, 20 + expectedDelta));
    }
  });

  it('flips to stuttered exactly at max after five misses', () => {
    const meter = new DissonanceMeter();

    for (let i = 0; i < 5; i += 1) {
      meter.addFromQuality('miss');
    }

    expect(meter.current()).toBe(100);
    expect(meter.normalized()).toBe(1);
    expect(meter.isStuttered()).toBe(true);
  });

  it('ceilings accumulation at max and ignores added qualities while stuttered', () => {
    const meter = new DissonanceMeter({ max: 30 });

    meter.addFromQuality('miss');
    meter.addFromQuality('miss');
    expect(meter.current()).toBe(30);
    expect(meter.isStuttered()).toBe(true);

    meter.addFromQuality('critical');
    meter.addFromQuality('miss');

    expect(meter.current()).toBe(30);
    expect(meter.normalized()).toBe(1);
  });

  it('resets one round after default-duration stutter', () => {
    const meter = new DissonanceMeter();

    for (let i = 0; i < 5; i += 1) {
      meter.addFromQuality('miss');
    }

    meter.tickRound();

    expect(meter.current()).toBe(0);
    expect(meter.normalized()).toBe(0);
    expect(meter.isStuttered()).toBe(false);
  });

  it('decays by max over stutter duration and resets after the final stutter tick', () => {
    const meter = new DissonanceMeter({ max: 40, stutterDurationRounds: 2 });

    meter.addFromQuality('miss');
    meter.addFromQuality('miss');
    expect(meter.current()).toBe(40);
    expect(meter.isStuttered()).toBe(true);

    meter.tickRound();

    expect(meter.current()).toBe(20);
    expect(meter.normalized()).toBe(0.5);
    expect(meter.isStuttered()).toBe(true);

    meter.tickRound();

    expect(meter.current()).toBe(0);
    expect(meter.isStuttered()).toBe(false);
  });

  it('lets critical and perfect drop dissonance without going below zero', () => {
    const meter = new DissonanceMeter();

    meter.addFromQuality('miss');
    meter.addFromQuality('perfect');
    expect(meter.current()).toBe(15);

    meter.addFromQuality('critical');
    expect(meter.current()).toBe(5);

    meter.addFromQuality('critical');
    expect(meter.current()).toBe(0);

    meter.addFromQuality('perfect');
    expect(meter.current()).toBe(0);
  });

  it('keeps ticking and reset no-op behavior stable when not stuttered', () => {
    const meter = new DissonanceMeter();

    meter.tickRound();
    expect(meter.current()).toBe(0);
    expect(meter.isStuttered()).toBe(false);

    meter.addFromQuality('miss');
    meter.reset();

    expect(meter.current()).toBe(0);
    expect(meter.isStuttered()).toBe(false);
  });
});
