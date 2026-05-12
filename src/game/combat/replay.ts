/**
 * Record-replay harness for Phase-2 combat.
 *
 * The harness proves combat is deterministic given inputs + seed (docs/04 §8;
 * docs/03 §4.4). It is intentionally passive: a recorder accumulates two
 * append-only streams (the player's input events and the BattleScene's
 * BattleEvent log) plus the seed and music sprite metadata; a comparator does
 * a strict deep-equal of two snapshots.
 *
 * The recorder does NOT subscribe to BattleScene. Tests feed it manually via
 * `recordInput()` on the tick they press, and `recordEvent()` (or
 * `recordEvents()`) after each scene `update()` by reading the existing
 * `BattleScene.eventLog` / `BattleScene.lastTurnEvents` accessors. This keeps
 * the recorder a pure data structure with no BattleScene coupling and avoids
 * any modification to the scene API.
 *
 * `ReplayLog` is plain JSON: every field is a number/string/array of those,
 * and every `BattleEvent` variant in `types.ts` is JSON-friendly. The shape is
 * stable as long as `BattleEvent` and `EncounterSpec` stay append-only.
 */

import type { BattleEvent, EncounterSpec } from './types';

/** A single recorded input action emitted on a specific scene tick. */
export interface ReplayInputEvent {
  /**
   * Tick index this input was observed on. The recorder accepts the index
   * verbatim from the caller; the harness does not validate ordering so a
   * test can model non-monotonic or skipped ticks if needed.
   */
  readonly tickIndex: number;
  /** Logical action from the InputManager surface. */
  readonly action: 'beat-press' | 'confirm' | 'cancel' | 'menu';
  /** `true` for a fresh press this tick; `false` for a release. */
  readonly pressed: boolean;
}

/**
 * Snapshot of one battle's deterministic inputs + outputs. Serializable to
 * JSON via `JSON.stringify(log)`.
 */
export interface ReplayLog {
  /** Seed fed to `mulberry32` (or any deterministic PRNG) for this run. */
  readonly rngSeed: number;
  /** BPM passed to `MusicClock.start()` on `BattleScene.enter()`. */
  readonly bpm: number;
  /** Sound identifier passed to `MusicClock.start()`. */
  readonly soundId: string;
  /** Ordered input stream that drove the battle. */
  readonly inputs: readonly ReplayInputEvent[];
  /** Ordered event log emitted by the battle. */
  readonly events: readonly BattleEvent[];
}

export interface BattleRecorderOptions {
  /** Seed for the PRNG used by `BattleScene`. */
  readonly rngSeed: number;
  /** Encounter spec the scene was constructed with — supplies bpm + soundId. */
  readonly encounter: EncounterSpec;
}

/**
 * Append-only collector for one battle. Construct one per battle run, feed
 * it inputs and events, then call `snapshot()` to freeze a `ReplayLog`.
 */
export class BattleRecorder {
  readonly #rngSeed: number;
  readonly #bpm: number;
  readonly #soundId: string;
  readonly #inputs: ReplayInputEvent[] = [];
  readonly #events: BattleEvent[] = [];

  constructor(options: BattleRecorderOptions) {
    if (!Number.isFinite(options.rngSeed)) {
      throw new Error('BattleRecorder: rngSeed must be a finite number.');
    }

    if (!Number.isFinite(options.encounter.bpm) || options.encounter.bpm <= 0) {
      throw new Error('BattleRecorder: encounter.bpm must be a positive number.');
    }

    this.#rngSeed = options.rngSeed;
    this.#bpm = options.encounter.bpm;
    this.#soundId = options.encounter.soundId;
  }

  /** Append a single input observation. Caller owns the tick index. */
  recordInput(tickIndex: number, action: ReplayInputEvent['action'], pressed: boolean): void {
    this.#inputs.push({ tickIndex, action, pressed });
  }

  /** Append a single battle event. Typically called once per event in `lastTurnEvents`. */
  recordEvent(event: BattleEvent): void {
    this.#events.push(event);
  }

  /** Convenience: append every event in `events`, preserving order. */
  recordEvents(events: readonly BattleEvent[]): void {
    for (const event of events) {
      this.#events.push(event);
    }
  }

  /**
   * Freeze the current state as a `ReplayLog`. The returned object is a
   * deep, defensive copy: subsequent calls to `recordInput` / `recordEvent`
   * do not mutate prior snapshots.
   */
  snapshot(): ReplayLog {
    return {
      rngSeed: this.#rngSeed,
      bpm: this.#bpm,
      soundId: this.#soundId,
      inputs: this.#inputs.map((input) => ({ ...input })),
      events: this.#events.map((event) => ({ ...event })) as readonly BattleEvent[],
    };
  }
}

/**
 * Strict deep-equal comparator for two `ReplayLog` snapshots. Returns `true`
 * iff `inputs` and `events` arrays are element-wise identical (same length,
 * same field values in the same order).
 *
 * The seed / bpm / soundId metadata is intentionally NOT compared here — the
 * point of the function is to prove that the *outputs* match given the same
 * setup. A higher-level test compares metadata separately when it cares.
 */
export function replayMatches(a: ReplayLog, b: ReplayLog): boolean {
  return arraysEqual(a.inputs, b.inputs, inputsEqual) && arraysEqual(a.events, b.events, eventsEqual);
}

function arraysEqual<T>(a: readonly T[], b: readonly T[], eq: (x: T, y: T) => boolean): boolean {
  if (a.length !== b.length) {
    return false;
  }

  for (let i = 0; i < a.length; i += 1) {
    if (!eq(a[i]!, b[i]!)) {
      return false;
    }
  }

  return true;
}

function inputsEqual(a: ReplayInputEvent, b: ReplayInputEvent): boolean {
  return a.tickIndex === b.tickIndex && a.action === b.action && a.pressed === b.pressed;
}

function eventsEqual(a: BattleEvent, b: BattleEvent): boolean {
  if (a.kind !== b.kind) {
    return false;
  }

  // The outer guard above proves `a.kind === b.kind`. Narrow `b` to the same
  // discriminant via a single typed cast per case so each branch stays
  // exhaustively reachable in tests (no unreachable defensive lines).
  switch (a.kind) {
    case 'damage': {
      const bd = b as Extract<BattleEvent, { kind: 'damage' }>;
      return (
        a.attackerId === bd.attackerId &&
        a.defenderId === bd.defenderId &&
        a.amount === bd.amount &&
        a.quality === bd.quality
      );
    }
    case 'message': {
      const bm = b as Extract<BattleEvent, { kind: 'message' }>;
      return a.text === bm.text;
    }
    case 'ko': {
      const bk = b as Extract<BattleEvent, { kind: 'ko' }>;
      return a.combatantId === bk.combatantId;
    }
  }
}
