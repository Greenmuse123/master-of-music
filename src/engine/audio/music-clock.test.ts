import { describe, expect, it } from 'vitest';

import { MusicClock } from './music-clock';
import type { MusicClockBarEventPayload, MusicClockEventPayload } from './types';

function createClockHarness(bpm = 120, correctionIntervalMs = 250) {
  let nowMs = 0;
  let seekOffsetMs = 0;
  const seek = () => nowMs + seekOffsetMs;
  const clock = new MusicClock(() => seek(), {
    correctionIntervalMs,
    now: () => nowMs,
  });

  clock.start('loop-a', bpm, 0);

  return {
    clock,
    get nowMs() {
      return nowMs;
    },
    setSeekOffset(offsetMs: number) {
      seekOffsetMs = offsetMs;
    },
    step(deltaMs: number) {
      nowMs += deltaMs;
    },
  };
}

describe('MusicClock', () => {
  it('keeps anchor accuracy within 2ms when fed a perfect clock', () => {
    const harness = createClockHarness(120);

    harness.step(1_234);

    expect(harness.clock.beat()).toBe(2);
    expect(Math.abs(harness.clock.beatPhase() * 500 - 234)).toBeLessThanOrEqual(2);
  });

  it('recovers from 50ms position jitter within 500ms', () => {
    const harness = createClockHarness(120, 250);

    harness.step(250);
    harness.setSeekOffset(50);
    expect(harness.clock.beatPhase()).toBeCloseTo(0.6);

    harness.step(250);
    harness.setSeekOffset(0);
    expect(harness.clock.beatPhase()).toBeCloseTo(0);

    harness.step(250);
    expect(harness.clock.beatPhase()).toBeCloseTo(0.5);
  });

  it('keeps beat monotonic across a 10s simulation with backward reanchors', () => {
    const harness = createClockHarness(120);
    const beats: number[] = [];

    for (let elapsedMs = 0; elapsedMs <= 10_000; elapsedMs += 100) {
      harness.step(elapsedMs === 0 ? 0 : 100);
      beats.push(harness.clock.beat());

      if (elapsedMs === 3_000) {
        harness.clock.reanchor(1_000, 120);
      }
    }

    for (let index = 1; index < beats.length; index += 1) {
      expect(beats[index]).toBeGreaterThanOrEqual(beats[index - 1]!);
    }
  });

  it('returns correct milliseconds for sub-beat queries', () => {
    const harness = createClockHarness(120);

    harness.step(125);

    expect(harness.clock.msUntilBeat(0.5)).toBe(125);
    expect(harness.clock.msUntilBeat(1)).toBe(375);
    expect(harness.clock.msUntilBeat(0.1)).toBe(0);
  });

  it('emits beat, bar, and phase events', () => {
    const harness = createClockHarness(120);
    const beats: MusicClockEventPayload[] = [];
    const bars: MusicClockBarEventPayload[] = [];
    const phases: MusicClockEventPayload[] = [];

    const offBeat = harness.clock.on('beat', (payload) => beats.push(payload));
    harness.clock.on('bar', (payload) => bars.push(payload));
    harness.clock.on('phase', (payload) => phases.push(payload));

    harness.step(2_050);
    expect(harness.clock.beat()).toBe(4);
    offBeat();
    harness.step(500);
    expect(harness.clock.beat()).toBe(5);

    expect(beats.map((payload) => payload.beat)).toEqual([1, 2, 3, 4]);
    expect(bars.map((payload) => payload.bar)).toEqual([1]);
    expect(phases.length).toBeGreaterThan(0);
    expect(phases[0]).toMatchObject({ beatMs: 500, bpm: 120, soundId: 'loop-a' });
  });

  it('supports configurable bar length', () => {
    let nowMs = 0;
    const clock = new MusicClock(() => nowMs, {
      barBeats: 3,
      now: () => nowMs,
    });
    const bars: MusicClockBarEventPayload[] = [];

    clock.on('bar', (payload) => bars.push(payload));
    clock.start('waltz', 120, 0);
    nowMs = 1_500;
    expect(clock.beat()).toBe(3);

    expect(bars.map((payload) => payload.bar)).toEqual([1]);
  });

  it('uses the position getter for default start anchors and periodic correction', () => {
    let nowMs = 1_000;
    let seekMs = 2_000;
    const clock = new MusicClock(() => seekMs, {
      correctionIntervalMs: 100,
      now: () => nowMs,
    });

    clock.start('sprite', 60);
    nowMs = 1_100;
    seekMs = 2_250;

    expect(clock.beatPhase()).toBeCloseTo(0.25);
  });

  it('defaults missing position getter to a zero anchor', () => {
    const clock = new MusicClock();

    clock.start('silent', 120);

    expect(clock.beat()).toBe(0);
  });

  it('ignores reanchor and preserves reads after stop', () => {
    const harness = createClockHarness(120);

    harness.step(1_000);
    expect(harness.clock.beat()).toBe(2);

    harness.clock.stop();
    harness.step(10_000);
    harness.clock.reanchor(20_000, 120);

    expect(harness.clock.beat()).toBe(2);
    expect(harness.clock.beatPhase()).toBe(0);
  });

  it('validates constructor and method inputs', () => {
    expect(() => new MusicClock(undefined, { barBeats: 1.5 })).toThrow(
      'MusicClock barBeats must be an integer.',
    );
    expect(() => new MusicClock(undefined, { correctionIntervalMs: 0 })).toThrow(
      'MusicClock correctionIntervalMs must be positive.',
    );

    const clock = new MusicClock();

    expect(() => clock.start('bad', 0, 0)).toThrow('MusicClock bpm must be positive.');
    expect(() => clock.start('bad', 120, Number.NaN)).toThrow('MusicClock anchorMs must be finite.');
    expect(() => clock.msUntilBeat(Number.POSITIVE_INFINITY)).toThrow(
      'MusicClock target must be finite.',
    );

    clock.start('good', 120, 0);
    expect(() => clock.reanchor(Number.NaN, 120)).toThrow('MusicClock seekMs must be finite.');
    expect(() => clock.reanchor(0, -1)).toThrow('MusicClock bpm must be positive.');
  });
});
