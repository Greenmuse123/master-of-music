/**
 * End-to-end deterministic battle test.
 *
 * Proves the Phase-2 BattleScene is deterministic under a fixed seed + fixed
 * input stream + stub MusicClock/InputManager: two independent runs with
 * identical setup produce identical `BattleEvent` logs.
 *
 * The harness wires:
 *   - `mulberry32(0xdeadbeef)` — the seeded PRNG fed to `BattleScene.rng`.
 *   - A stub `MusicClock` whose `beat()`/`beatPhase()` are advanced by the
 *     test on each tick (no real audio, no Howler).
 *   - A stub `InputManager` that replays a fixed `beat-press` script.
 *   - A 1-member party (Sol, Jazz) versus a mook (Shade, Discord) — the
 *     Phase-1 placeholder encounter shape used elsewhere in the suite.
 *
 * The test feeds every press through `BattleRecorder.recordInput()` and every
 * scene event through `BattleRecorder.recordEvents(scene.lastTurnEvents)`,
 * then calls `replayMatches(snapshotA, snapshotB)`.
 */

import { describe, expect, it, vi } from 'vitest';

import { mulberry32 } from '../../../engine/util/rng';
import type { MusicClock } from '../../../engine/audio/music-clock';
import type { InputManager } from '../../../engine/input/input-manager';
import type { Renderer } from '../../../engine/render/renderer';
import type { FrameStep } from '../../../engine/scene/scene';
import type { Textbox } from '../../../ui/textbox';
import { BattleScene, type BattleSceneOptions } from '../battle-scene';
import { Genre } from '../genres';
import { BattleRecorder, replayMatches, type ReplayInputEvent } from '../replay';
import type { Combatant, EncounterSpec, PartyMember } from '../types';

const RNG_SEED = 0xdeadbeef;
const TICK_COUNT = 20;
const BPM = 120;
const SOUND_ID = 'placeholder';
const FIXED_INPUT_SCRIPT: readonly boolean[] = [
  // Indices 0..19. Roughly one press every other tick — enough presses to
  // produce damage, ko, and message events across the 20-tick window.
  true,
  false,
  true,
  false,
  true,
  false,
  true,
  false,
  true,
  false,
  true,
  false,
  true,
  false,
  true,
  false,
  true,
  false,
  true,
  false,
];

const FRAME: FrameStep = { dt: 1 / 60, now: 0, beat: 0, beatPhase: 0 };

interface ClockState {
  beatValue: number;
  phaseValue: number;
}

function stubClock(state: ClockState): MusicClock {
  return {
    start: vi.fn(),
    stop: vi.fn(),
    beat: vi.fn(() => state.beatValue),
    beatPhase: vi.fn(() => state.phaseValue),
    msUntilBeat: vi.fn(() => 0),
  } as unknown as MusicClock;
}

function stubInput(beatPressQueue: boolean[]): InputManager {
  const queue = [...beatPressQueue];
  return {
    pressed: vi.fn((action: string) => {
      if (action === 'beat-press') {
        return queue.shift() ?? false;
      }
      return false;
    }),
    held: vi.fn(() => false),
    released: vi.fn(() => false),
  } as unknown as InputManager;
}

function stubTextbox(): Textbox {
  return {
    update: vi.fn(),
    render: vi.fn(),
    confirm: vi.fn(),
    isDone: vi.fn(() => false),
  } as unknown as Textbox;
}

function stubRenderer(): Renderer {
  return { canvas: { width: 480, height: 270 } } as unknown as Renderer;
}

function makeParty(): readonly PartyMember[] {
  return [
    {
      id: 'sol',
      name: 'Sol',
      hp: 100,
      maxHp: 100,
      atk: 40,
      def: 20,
      focus: 50,
      genre: Genre.Jazz,
      moves: [{ kind: 'attack', moveId: 'brass-burst', name: 'Brass Burst', power: 30 }],
    },
  ];
}

function makeEncounter(): EncounterSpec {
  const enemy: Combatant & { readonly genre: Genre } = {
    id: 'shade',
    name: 'Shade',
    hp: 200,
    maxHp: 200,
    atk: 20,
    def: 10,
    focus: 0,
    genre: Genre.Discord,
  };
  return { mode: 'normal', bpm: BPM, soundId: SOUND_ID, enemy };
}

function runScriptedBattle(): {
  log: ReturnType<BattleRecorder['snapshot']>;
  scene: BattleScene;
} {
  const rng = mulberry32(RNG_SEED);
  const clockState: ClockState = { beatValue: 0, phaseValue: 0 };
  const clock = stubClock(clockState);
  const input = stubInput([...FIXED_INPUT_SCRIPT]);
  const encounter = makeEncounter();
  const options: BattleSceneOptions = {
    renderer: stubRenderer(),
    input,
    musicClock: clock,
    textbox: stubTextbox(),
    party: makeParty(),
    encounter,
    rng,
    onComplete: vi.fn(),
  };
  const scene = new BattleScene(options);
  const recorder = new BattleRecorder({ rngSeed: RNG_SEED, encounter });

  scene.enter();

  for (let tick = 0; tick < TICK_COUNT; tick += 1) {
    // Advance the stub clock deterministically: one beat per tick, phase 0.
    // The scene reads beat()+beatPhase() inside update(); driving them from
    // the test loop is the only timing surface we need.
    clockState.beatValue = tick;
    clockState.phaseValue = 0;

    // Mirror the input script into the recorder so the replay log captures
    // the exact press sequence the InputManager stub will report.
    const press = FIXED_INPUT_SCRIPT[tick] ?? false;
    if (press) {
      const action: ReplayInputEvent['action'] = 'beat-press';
      recorder.recordInput(tick, action, true);
    }

    scene.update(FRAME);
    recorder.recordEvents(scene.lastTurnEvents);

    if (scene.outcome !== null) {
      break;
    }
  }

  return { log: recorder.snapshot(), scene };
}

describe('scripted deterministic battle', () => {
  it('two runs with the same seed + same input stream produce identical event logs', () => {
    const a = runScriptedBattle();
    const b = runScriptedBattle();

    // Sanity: the battle actually did something — at minimum the "A wild ..."
    // greeting from enter() plus a damage event from the first beat-press.
    expect(a.log.events.length).toBeGreaterThan(1);
    expect(a.log.events.some((e) => e.kind === 'damage')).toBe(true);

    // Inputs match by construction (both runs use the same fixed script).
    expect(a.log.inputs).toEqual(b.log.inputs);

    // The core determinism contract.
    expect(replayMatches(a.log, b.log)).toBe(true);

    // Metadata sanity.
    expect(a.log.rngSeed).toBe(RNG_SEED);
    expect(a.log.bpm).toBe(BPM);
    expect(a.log.soundId).toBe(SOUND_ID);
  });
});
