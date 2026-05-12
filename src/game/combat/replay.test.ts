import { describe, expect, it } from 'vitest';

import { Genre } from './genres';
import { BattleRecorder, replayMatches, type ReplayLog } from './replay';
import type { BattleEvent, Combatant, EncounterSpec } from './types';

function makeEncounter(overrides: Partial<EncounterSpec> = {}): EncounterSpec {
  const enemy: Combatant & { readonly genre: Genre } = {
    id: 'shade',
    name: 'Shade',
    hp: 50,
    maxHp: 50,
    atk: 10,
    def: 5,
    focus: 0,
    genre: Genre.Discord,
  };
  return {
    mode: 'normal',
    bpm: 120,
    soundId: 'placeholder',
    enemy,
    ...overrides,
  };
}

describe('BattleRecorder', () => {
  it('captures seed, bpm, and soundId on snapshot()', () => {
    const recorder = new BattleRecorder({
      rngSeed: 0xdeadbeef,
      encounter: makeEncounter({ bpm: 140, soundId: 'song-a' }),
    });

    const log = recorder.snapshot();

    expect(log.rngSeed).toBe(0xdeadbeef);
    expect(log.bpm).toBe(140);
    expect(log.soundId).toBe('song-a');
    expect(log.inputs).toEqual([]);
    expect(log.events).toEqual([]);
  });

  it('records input events in order', () => {
    const recorder = new BattleRecorder({ rngSeed: 1, encounter: makeEncounter() });

    recorder.recordInput(0, 'beat-press', true);
    recorder.recordInput(1, 'confirm', true);
    recorder.recordInput(2, 'beat-press', false);
    recorder.recordInput(3, 'cancel', true);
    recorder.recordInput(4, 'menu', true);

    const log = recorder.snapshot();
    expect(log.inputs).toEqual([
      { tickIndex: 0, action: 'beat-press', pressed: true },
      { tickIndex: 1, action: 'confirm', pressed: true },
      { tickIndex: 2, action: 'beat-press', pressed: false },
      { tickIndex: 3, action: 'cancel', pressed: true },
      { tickIndex: 4, action: 'menu', pressed: true },
    ]);
  });

  it('records single events via recordEvent()', () => {
    const recorder = new BattleRecorder({ rngSeed: 1, encounter: makeEncounter() });

    recorder.recordEvent({ kind: 'message', text: 'hello' });
    recorder.recordEvent({
      kind: 'damage',
      attackerId: 'sol',
      defenderId: 'shade',
      amount: 12,
      quality: 'critical',
    });
    recorder.recordEvent({ kind: 'ko', combatantId: 'shade' });

    const log = recorder.snapshot();
    expect(log.events).toHaveLength(3);
    expect(log.events[0]).toEqual({ kind: 'message', text: 'hello' });
    expect(log.events[1]?.kind).toBe('damage');
    expect(log.events[2]).toEqual({ kind: 'ko', combatantId: 'shade' });
  });

  it('records batches of events via recordEvents()', () => {
    const recorder = new BattleRecorder({ rngSeed: 1, encounter: makeEncounter() });
    const batch: BattleEvent[] = [
      { kind: 'message', text: 'one' },
      { kind: 'message', text: 'two' },
    ];

    recorder.recordEvents(batch);

    expect(recorder.snapshot().events).toEqual(batch);
  });

  it('snapshot() returns a defensive copy — mutating later does not change earlier snapshots', () => {
    const recorder = new BattleRecorder({ rngSeed: 1, encounter: makeEncounter() });
    recorder.recordInput(0, 'beat-press', true);
    recorder.recordEvent({ kind: 'message', text: 'first' });

    const snap1 = recorder.snapshot();

    recorder.recordInput(1, 'confirm', true);
    recorder.recordEvent({ kind: 'message', text: 'second' });

    const snap2 = recorder.snapshot();

    expect(snap1.inputs).toHaveLength(1);
    expect(snap1.events).toHaveLength(1);
    expect(snap2.inputs).toHaveLength(2);
    expect(snap2.events).toHaveLength(2);
  });

  it('rejects a non-finite rngSeed', () => {
    expect(
      () => new BattleRecorder({ rngSeed: Number.NaN, encounter: makeEncounter() }),
    ).toThrow(/rngSeed/);
    expect(
      () =>
        new BattleRecorder({ rngSeed: Number.POSITIVE_INFINITY, encounter: makeEncounter() }),
    ).toThrow(/rngSeed/);
  });

  it('rejects a non-positive bpm', () => {
    expect(
      () => new BattleRecorder({ rngSeed: 1, encounter: makeEncounter({ bpm: 0 }) }),
    ).toThrow(/bpm/);
    expect(
      () => new BattleRecorder({ rngSeed: 1, encounter: makeEncounter({ bpm: -10 }) }),
    ).toThrow(/bpm/);
    expect(
      () => new BattleRecorder({ rngSeed: 1, encounter: makeEncounter({ bpm: Number.NaN }) }),
    ).toThrow(/bpm/);
  });
});

describe('replayMatches', () => {
  function makeLog(overrides: Partial<ReplayLog> = {}): ReplayLog {
    return {
      rngSeed: 0xdeadbeef,
      bpm: 120,
      soundId: 'placeholder',
      inputs: [{ tickIndex: 0, action: 'beat-press', pressed: true }],
      events: [
        { kind: 'message', text: 'A wild Shade appears!' },
        {
          kind: 'damage',
          attackerId: 'sol',
          defenderId: 'shade',
          amount: 10,
          quality: 'perfect',
        },
      ],
      ...overrides,
    };
  }

  it('returns true for identical logs', () => {
    expect(replayMatches(makeLog(), makeLog())).toBe(true);
  });

  it('returns true for two empty logs', () => {
    const empty: ReplayLog = {
      rngSeed: 1,
      bpm: 120,
      soundId: 's',
      inputs: [],
      events: [],
    };
    expect(replayMatches(empty, empty)).toBe(true);
  });

  it('returns false when inputs arrays have different lengths', () => {
    const a = makeLog();
    const b = makeLog({
      inputs: [
        { tickIndex: 0, action: 'beat-press', pressed: true },
        { tickIndex: 1, action: 'beat-press', pressed: true },
      ],
    });
    expect(replayMatches(a, b)).toBe(false);
  });

  it('returns false on differing input tickIndex', () => {
    const a = makeLog();
    const b = makeLog({ inputs: [{ tickIndex: 1, action: 'beat-press', pressed: true }] });
    expect(replayMatches(a, b)).toBe(false);
  });

  it('returns false on differing input action', () => {
    const a = makeLog();
    const b = makeLog({ inputs: [{ tickIndex: 0, action: 'confirm', pressed: true }] });
    expect(replayMatches(a, b)).toBe(false);
  });

  it('returns false on differing input pressed flag', () => {
    const a = makeLog();
    const b = makeLog({ inputs: [{ tickIndex: 0, action: 'beat-press', pressed: false }] });
    expect(replayMatches(a, b)).toBe(false);
  });

  it('returns false when events arrays have different lengths', () => {
    const a = makeLog();
    const b = makeLog({ events: [{ kind: 'message', text: 'A wild Shade appears!' }] });
    expect(replayMatches(a, b)).toBe(false);
  });

  it('returns false on differing event kind', () => {
    const a = makeLog({ events: [{ kind: 'message', text: 'x' }] });
    const b = makeLog({ events: [{ kind: 'ko', combatantId: 'x' }] });
    expect(replayMatches(a, b)).toBe(false);
  });

  it('returns false on differing damage attackerId', () => {
    const a = makeLog({
      events: [
        {
          kind: 'damage',
          attackerId: 'sol',
          defenderId: 'shade',
          amount: 10,
          quality: 'perfect',
        },
      ],
    });
    const b = makeLog({
      events: [
        {
          kind: 'damage',
          attackerId: 'lyra',
          defenderId: 'shade',
          amount: 10,
          quality: 'perfect',
        },
      ],
    });
    expect(replayMatches(a, b)).toBe(false);
  });

  it('returns false on differing damage defenderId', () => {
    const a = makeLog({
      events: [
        {
          kind: 'damage',
          attackerId: 'sol',
          defenderId: 'shade',
          amount: 10,
          quality: 'perfect',
        },
      ],
    });
    const b = makeLog({
      events: [
        {
          kind: 'damage',
          attackerId: 'sol',
          defenderId: 'lurker',
          amount: 10,
          quality: 'perfect',
        },
      ],
    });
    expect(replayMatches(a, b)).toBe(false);
  });

  it('returns false on differing damage amount', () => {
    const a = makeLog({
      events: [
        {
          kind: 'damage',
          attackerId: 'sol',
          defenderId: 'shade',
          amount: 10,
          quality: 'perfect',
        },
      ],
    });
    const b = makeLog({
      events: [
        {
          kind: 'damage',
          attackerId: 'sol',
          defenderId: 'shade',
          amount: 11,
          quality: 'perfect',
        },
      ],
    });
    expect(replayMatches(a, b)).toBe(false);
  });

  it('returns false on differing damage quality', () => {
    const a = makeLog({
      events: [
        {
          kind: 'damage',
          attackerId: 'sol',
          defenderId: 'shade',
          amount: 10,
          quality: 'perfect',
        },
      ],
    });
    const b = makeLog({
      events: [
        {
          kind: 'damage',
          attackerId: 'sol',
          defenderId: 'shade',
          amount: 10,
          quality: 'critical',
        },
      ],
    });
    expect(replayMatches(a, b)).toBe(false);
  });

  it('returns false on differing message text', () => {
    const a = makeLog({ events: [{ kind: 'message', text: 'one' }] });
    const b = makeLog({ events: [{ kind: 'message', text: 'two' }] });
    expect(replayMatches(a, b)).toBe(false);
  });

  it('returns false on differing ko combatantId', () => {
    const a = makeLog({ events: [{ kind: 'ko', combatantId: 'shade' }] });
    const b = makeLog({ events: [{ kind: 'ko', combatantId: 'lurker' }] });
    expect(replayMatches(a, b)).toBe(false);
  });

  it('returns true when message events match exactly', () => {
    const a = makeLog({ events: [{ kind: 'message', text: 'same' }] });
    const b = makeLog({ events: [{ kind: 'message', text: 'same' }] });
    expect(replayMatches(a, b)).toBe(true);
  });

  it('returns true when ko events match exactly', () => {
    const a = makeLog({ events: [{ kind: 'ko', combatantId: 'shade' }] });
    const b = makeLog({ events: [{ kind: 'ko', combatantId: 'shade' }] });
    expect(replayMatches(a, b)).toBe(true);
  });
});
