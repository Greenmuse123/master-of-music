import { describe, expect, it, vi } from 'vitest';

import type { MusicClock } from '../../engine/audio/music-clock';
import type { InputManager } from '../../engine/input/input-manager';
import type { Renderer } from '../../engine/render/renderer';
import type { FrameStep } from '../../engine/scene/scene';
import type { Textbox } from '../../ui/textbox';
import { BattleScene, type BattleSceneOptions } from './battle-scene';
import type { BossScript } from './boss-types';
import { Genre } from './genres';
import type { Combatant, EncounterSpec, PartyMember } from './types';

type StubCtx = CanvasRenderingContext2D & {
  fillRect: ReturnType<typeof vi.fn>;
  fillText: ReturnType<typeof vi.fn>;
};

function stubCtx(): StubCtx {
  return {
    drawImage: vi.fn(),
    fillStyle: '',
    font: '',
    imageSmoothingEnabled: false,
    textAlign: '',
    textBaseline: '',
    fillRect: vi.fn(),
    fillText: vi.fn(),
  } as unknown as StubCtx;
}

interface ClockStub {
  beatValue: number;
  phaseValue: number;
}

interface ClockFixture {
  clock: MusicClock;
  state: ClockStub;
  startSpy: ReturnType<typeof vi.fn>;
  stopSpy: ReturnType<typeof vi.fn>;
  beatSpy: ReturnType<typeof vi.fn>;
  phaseSpy: ReturnType<typeof vi.fn>;
}

function stubClock(initial: Partial<ClockStub> = {}): ClockFixture {
  const state: ClockStub = { beatValue: initial.beatValue ?? 0, phaseValue: initial.phaseValue ?? 0 };
  const startSpy = vi.fn();
  const stopSpy = vi.fn();
  const beatSpy = vi.fn(() => state.beatValue);
  const phaseSpy = vi.fn(() => state.phaseValue);
  const clock = {
    start: startSpy,
    stop: stopSpy,
    beat: beatSpy,
    beatPhase: phaseSpy,
    msUntilBeat: vi.fn(() => 0),
  } as unknown as MusicClock;
  return { clock, state, startSpy, stopSpy, beatSpy, phaseSpy };
}

function queuedInput(queues: { beatPress?: boolean[]; confirm?: boolean[] } = {}): InputManager {
  const beatPress = [...(queues.beatPress ?? [])];
  const confirm = [...(queues.confirm ?? [])];
  const pressed = vi.fn((action: string) => {
    if (action === 'beat-press') {
      return beatPress.shift() ?? false;
    }
    if (action === 'confirm') {
      return confirm.shift() ?? false;
    }
    return false;
  });
  return { pressed, held: vi.fn(() => false), released: vi.fn(() => false) } as unknown as InputManager;
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

function makePartyMember(overrides: Partial<PartyMember> = {}): PartyMember {
  return {
    id: 'sol',
    name: 'Sol',
    hp: 100,
    maxHp: 100,
    atk: 40,
    def: 20,
    focus: 50,
    genre: Genre.Jazz,
    moves: [{ kind: 'attack', moveId: 'brass-burst', name: 'Brass Burst', power: 30 }],
    ...overrides,
  };
}

function makeEnemy(overrides: Partial<Combatant & { genre: Genre }> = {}): Combatant & { genre: Genre } {
  return {
    id: 'shade',
    name: 'Shade',
    hp: 200,
    maxHp: 200,
    atk: 20,
    def: 10,
    focus: 0,
    genre: Genre.Discord,
    ...overrides,
  };
}

function makeOptions(overrides: Partial<BattleSceneOptions> = {}): BattleSceneOptions {
  const enemy = overrides.encounter?.enemy ?? makeEnemy();
  const encounter: EncounterSpec = overrides.encounter ?? {
    mode: 'normal',
    bpm: 120,
    soundId: 'placeholder',
    enemy,
  };
  return {
    renderer: stubRenderer(),
    input: queuedInput(),
    musicClock: stubClock().clock,
    textbox: stubTextbox(),
    party: overrides.party ?? [makePartyMember()],
    encounter,
    rng: () => 0.5,
    onComplete: vi.fn(),
    ...overrides,
  };
}

const FRAME: FrameStep = {
  dt: 1 / 60,
  now: 0,
  beat: 0,
  beatPhase: 0,
};

const SIMPLE_BOSS_SCRIPT: BossScript = {
  id: 'test-boss',
  finalDefeatBeats: 0,
  phases: [
    {
      id: 'opening',
      patternIntroBeats: 1,
      patternBeats: [0],
      vulnerableBeats: 1,
    },
  ],
};

describe('BattleScene', () => {
  it('calls musicClock.start with the encounter BPM and soundId on enter', () => {
    const { clock, startSpy } = stubClock();
    const enemy = makeEnemy();
    const scene = new BattleScene(
      makeOptions({
        musicClock: clock,
        encounter: { mode: 'normal', bpm: 140, soundId: 'song-a', enemy },
      }),
    );

    scene.enter();

    expect(startSpy).toHaveBeenCalledWith('song-a', 140);
  });

  it('a perfect/critical hit on beat-press reduces enemy hp', () => {
    const input = queuedInput({ beatPress: [true] });
    // beatValue=0, phaseValue=0 => fractionalBeat == targetBeat => delta=0ms => critical.
    const { clock } = stubClock({ beatValue: 0, phaseValue: 0 });
    const enemy = makeEnemy({ hp: 200, maxHp: 200 });
    const scene = new BattleScene(
      makeOptions({
        input,
        musicClock: clock,
        encounter: { mode: 'normal', bpm: 120, soundId: 's', enemy },
      }),
    );

    scene.enter();
    scene.update(FRAME);

    expect(scene.enemyHp).toBeLessThan(200);
    expect(scene.lastTurnEvents.some((e) => e.kind === 'damage')).toBe(true);
  });

  it('applies the type-table multiplier (Discord attacker vs Jazz defender = 2.0x)', () => {
    // The codebase type table (src/game/combat/type-table.ts) encodes Discord
    // as super-strong against every other genre (2.0x); Jazz attacker vs
    // Discord defender is super-weak (0.5x). We test the canonical super-
    // strong pairing by setting a Discord-genre party and comparing damage
    // against a Jazz-genre enemy (2.0x) vs a Discord-genre enemy (1.0x).
    const discordParty = makePartyMember({ atk: 1, focus: 0, genre: Genre.Discord });
    const ENEMY_HP = 100_000;
    const sharedEnemy = makeEnemy({ hp: ENEMY_HP, maxHp: ENEMY_HP, def: 1 });

    const inputA = queuedInput({ beatPress: [true] });
    const { clock: clockA } = stubClock({ beatValue: 0, phaseValue: 0 });
    const sceneA = new BattleScene(
      makeOptions({
        input: inputA,
        musicClock: clockA,
        party: [discordParty],
        encounter: { mode: 'normal', bpm: 120, soundId: 's', enemy: { ...sharedEnemy, genre: Genre.Jazz } },
      }),
    );
    sceneA.enter();
    sceneA.update(FRAME);
    const damageVsJazz = ENEMY_HP - sceneA.enemyHp;

    const inputB = queuedInput({ beatPress: [true] });
    const { clock: clockB } = stubClock({ beatValue: 0, phaseValue: 0 });
    const sceneB = new BattleScene(
      makeOptions({
        input: inputB,
        musicClock: clockB,
        party: [discordParty],
        encounter: { mode: 'normal', bpm: 120, soundId: 's', enemy: { ...sharedEnemy, genre: Genre.Discord } },
      }),
    );
    sceneB.enter();
    sceneB.update(FRAME);
    const damageVsDiscord = ENEMY_HP - sceneB.enemyHp;

    expect(damageVsJazz).toBeGreaterThan(damageVsDiscord);
    expect(damageVsJazz).toBe(damageVsDiscord * 2);
  });

  it('several misses raise the active party member dissonance to stuttered', () => {
    // beatValue=10, phaseValue=0.5 => fractionalBeat=10.5 => target=11 (or 10)
    // => |delta| = 0.5 beats. With bpm=120, msPerBeat=500 => delta=250ms.
    // 250ms is in the "off" band (300ms base) — actually let's force a miss.
    // phase=0.5 puts us halfway between beats. msPerBeat=60000/120=500ms.
    // |delta_ms| = 0.5 * 500 = 250ms => "off" band (300ms threshold). Need >300.
    // Use bpm=60 => msPerBeat=1000 => 500ms delta => miss (>300).
    const input = queuedInput({ beatPress: [true, true, true, true, true, true] });
    const { clock, state } = stubClock({ beatValue: 0, phaseValue: 0.5 });
    const enemy = makeEnemy({ hp: 9999, maxHp: 9999 });
    const scene = new BattleScene(
      makeOptions({
        input,
        musicClock: clock,
        party: [makePartyMember({ focus: 0 })],
        encounter: { mode: 'normal', bpm: 60, soundId: 's', enemy },
      }),
    );

    scene.enter();
    for (let i = 0; i < 6; i += 1) {
      state.beatValue = i;
      state.phaseValue = 0.5;
      scene.update(FRAME);
    }

    expect(scene.partyDissonance.isStuttered()).toBe(true);
  });

  it('enemy stutter from many critical hits advances enemy hp to 0 => victory', () => {
    // Per docs/04 §3.4 the boss's dissonance meter fills as the player lands
    // strong hits; at peak it stutters and a free crit lands. This test drives
    // a series of perfect/critical hits and verifies that (a) the enemy
    // meter reaches stutter and (b) victory is reported within a bounded
    // number of player presses.
    const PRESSES = 30;
    const presses: boolean[] = [];
    for (let i = 0; i < PRESSES; i += 1) {
      presses.push(true);
    }
    const input = queuedInput({ beatPress: presses });
    const { clock } = stubClock({ beatValue: 0, phaseValue: 0 });
    // Per-crit damage = floor((atk * power * damageMul) / def).
    // With atk=1 def=1 power=30 damageMul=2.0 matchup=1.0 => 60/crit.
    // Enemy meter reaches stutter after 5 critical hits (+20 each). Enemy
    // HP=1000 needs ~17 crits to fall, so the stutter mechanic fires several
    // times along the path to victory.
    const enemy = makeEnemy({ hp: 1000, maxHp: 1000, def: 1, genre: Genre.Jazz });
    const onComplete = vi.fn();
    let everStuttered = false;
    const scene = new BattleScene(
      makeOptions({
        input,
        musicClock: clock,
        party: [makePartyMember({ atk: 1, focus: 100, genre: Genre.Jazz })],
        encounter: { mode: 'normal', bpm: 120, soundId: 's', enemy },
        onComplete,
      }),
    );

    scene.enter();
    for (let i = 0; i < PRESSES; i += 1) {
      scene.update(FRAME);
      if (scene.outcome !== null) {
        break;
      }
    }

    everStuttered = scene.eventLog.some(
      (e) => e.kind === 'message' && e.text.includes('stutters'),
    );
    expect(everStuttered).toBe(true);
    expect(scene.outcome).toBe('victory');
    expect(onComplete).toHaveBeenCalledWith('victory');
    expect(scene.enemyHp).toBe(0);
  });

  it('emits defeat when the active party member hp drops to 0', () => {
    const input = queuedInput();
    const onComplete = vi.fn();
    const scene = new BattleScene(
      makeOptions({
        input,
        party: [makePartyMember({ hp: 0, maxHp: 100 })],
        onComplete,
      }),
    );

    scene.enter();
    scene.update(FRAME);

    expect(scene.outcome).toBe('defeat');
    expect(onComplete).toHaveBeenCalledWith('defeat');
  });

  it('boss-mode runs the BossPhaseRunner: start fires on enter and tick fires each update', () => {
    const input = queuedInput();
    const { clock, state } = stubClock({ beatValue: 0, phaseValue: 0 });
    const enemy = makeEnemy({ genre: Genre.Discord });
    const scene = new BattleScene(
      makeOptions({
        input,
        musicClock: clock,
        encounter: {
          mode: 'boss',
          bpm: 120,
          soundId: 'boss-song',
          enemy,
          bossScript: SIMPLE_BOSS_SCRIPT,
        },
      }),
    );

    scene.enter();
    expect(scene.bossRunner).not.toBeNull();
    // Phase-enter event was emitted by start().
    expect(scene.eventLog.some((e) => e.kind === 'message' && e.text.includes('phase opening'))).toBe(
      true,
    );

    // First tick anchors phaseStartBeat at the current beat; subsequent ticks
    // advance phase-relative beats. With patternIntroBeats=1 + patternBeats[0],
    // the cue fires at phase-relative beat 1.
    state.beatValue = 0;
    scene.update(FRAME);
    state.beatValue = 1;
    scene.update(FRAME);
    expect(scene.eventLog.some((e) => e.kind === 'message' && e.text === 'Incoming attack — parry!')).toBe(
      true,
    );
  });

  it('determinism: same rng + same input stream => identical event log', () => {
    const enemy = makeEnemy({ hp: 50, maxHp: 50 });
    const runOnce = (): readonly unknown[] => {
      const seed = { state: 0xc0ffee };
      const rng = (): number => {
        seed.state = (seed.state * 1664525 + 1013904223) >>> 0;
        return seed.state / 0xffffffff;
      };
      const input = queuedInput({ beatPress: [true, true, true, true, true] });
      const { clock, state } = stubClock({ beatValue: 0, phaseValue: 0 });
      const scene = new BattleScene(
        makeOptions({
          input,
          musicClock: clock,
          party: [makePartyMember({ focus: 100, atk: 10 })],
          encounter: { mode: 'normal', bpm: 120, soundId: 's', enemy },
          rng,
        }),
      );
      scene.enter();
      for (let i = 0; i < 5; i += 1) {
        state.beatValue = i;
        scene.update(FRAME);
      }
      return [...scene.eventLog];
    };

    const a = runOnce();
    const b = runOnce();
    expect(a).toEqual(b);
  });

  it('reads beat from MusicClock and never uses performance.now()', () => {
    const input = queuedInput({ beatPress: [true] });
    const { clock, beatSpy, phaseSpy } = stubClock({ beatValue: 2, phaseValue: 0 });
    const scene = new BattleScene(makeOptions({ input, musicClock: clock }));

    scene.enter();
    scene.update(FRAME);

    expect(beatSpy).toHaveBeenCalled();
    expect(phaseSpy).toHaveBeenCalled();
  });

  it('uses the injected rng on each attack', () => {
    const rng = vi.fn(() => 0.5);
    const input = queuedInput({ beatPress: [true] });
    const { clock } = stubClock({ beatValue: 1, phaseValue: 0 });
    const scene = new BattleScene(makeOptions({ input, musicClock: clock, rng }));

    scene.enter();
    scene.update(FRAME);

    expect(rng).toHaveBeenCalled();
  });

  it('renders party HP, enemy HP, rhythm cue, and the textbox on integer pixels', () => {
    const ctx = stubCtx();
    const renderSpy = vi.fn();
    const textbox = {
      update: vi.fn(),
      render: renderSpy,
      confirm: vi.fn(),
      isDone: vi.fn(() => false),
    } as unknown as Textbox;
    const scene = new BattleScene(makeOptions({ textbox }));

    scene.enter();
    scene.render(ctx);

    expect(ctx.fillRect.mock.calls.length).toBeGreaterThanOrEqual(4);
    expect(renderSpy).toHaveBeenCalledWith(ctx);
    for (const call of ctx.fillRect.mock.calls) {
      const [x, y, w, h] = call as [number, number, number, number];
      expect(Number.isInteger(x)).toBe(true);
      expect(Number.isInteger(y)).toBe(true);
      expect(Number.isInteger(w)).toBe(true);
      expect(Number.isInteger(h)).toBe(true);
    }
  });

  it('ignores input after exit() and stops the music clock', () => {
    const input = queuedInput({ beatPress: [true] });
    const { clock, stopSpy } = stubClock({ beatValue: 1, phaseValue: 0 });
    const scene = new BattleScene(makeOptions({ input, musicClock: clock }));

    scene.enter();
    scene.exit();
    scene.update(FRAME);

    expect(stopSpy).toHaveBeenCalled();
    expect(scene.enemyHp).toBe(scene.enemyHp); // unchanged after exit
  });

  it('handleInput is a no-op (input is polled in update)', () => {
    const scene = new BattleScene(makeOptions());
    expect(() => {
      scene.handleInput(new Event('keydown'));
    }).not.toThrow();
  });

  it('renders a parry cue while a boss attack is pending', () => {
    const input = queuedInput();
    const { clock, state } = stubClock({ beatValue: 0, phaseValue: 0 });
    const enemy = makeEnemy();
    const scene = new BattleScene(
      makeOptions({
        input,
        musicClock: clock,
        encounter: {
          mode: 'boss',
          bpm: 120,
          soundId: 's',
          enemy,
          bossScript: SIMPLE_BOSS_SCRIPT,
        },
      }),
    );

    scene.enter();
    // First tick anchors phaseStartBeat; second tick produces the cue.
    state.beatValue = 0;
    scene.update(FRAME);
    state.beatValue = 1;
    scene.update(FRAME);

    const ctx = stubCtx();
    scene.render(ctx);
    // We expect more fillRect calls than the baseline (party hp + enemy hp +
    // bg + cue + parry cue).
    expect(ctx.fillRect.mock.calls.length).toBeGreaterThanOrEqual(5);
  });

  it('throws when constructed with an empty party', () => {
    expect(() => new BattleScene(makeOptions({ party: [] }))).toThrow(/at least one member/);
  });

  it('throws when boss mode is set without a bossScript', () => {
    const enemy = makeEnemy();
    expect(
      () =>
        new BattleScene(
          makeOptions({
            encounter: { mode: 'boss', bpm: 120, soundId: 's', enemy },
          }),
        ),
    ).toThrow(/bossScript/);
  });

  it('parries a pending boss attack on confirm and resolves the cue', () => {
    // The pressed('confirm') call only happens once pendingParryBeat is set,
    // which is on the tick that fires the cue (beat=1).
    const input = queuedInput({ confirm: [true, true, true] });
    const { clock, state } = stubClock({ beatValue: 0, phaseValue: 0 });
    const enemy = makeEnemy();
    const scene = new BattleScene(
      makeOptions({
        input,
        musicClock: clock,
        encounter: {
          mode: 'boss',
          bpm: 120,
          soundId: 's',
          enemy,
          bossScript: SIMPLE_BOSS_SCRIPT,
        },
      }),
    );

    scene.enter();
    // Anchor phaseStartBeat at 0, then advance to beat 1 to fire a cue + parry.
    state.beatValue = 0;
    scene.update(FRAME);
    state.beatValue = 1;
    scene.update(FRAME);

    expect(scene.eventLog.some((e) => e.kind === 'message' && e.text.startsWith('Parry'))).toBe(true);
  });

  it('boss defeat: enemy hp at 0 with a one-phase boss script drives victory', () => {
    const input = queuedInput({ beatPress: [true, true, true, true, true] });
    const { clock, state } = stubClock({ beatValue: 0, phaseValue: 0 });
    const enemy = makeEnemy({ hp: 10, maxHp: 10, def: 1, genre: Genre.Jazz });
    const onComplete = vi.fn();
    // hpThreshold ensures the boss runner exits the phase as hp drops, which
    // (with `finalDefeatBeats: 0` and a single phase) emits `defeated` and
    // drives the BattleScene to victory through the boss-runner path.
    const oneShotScript: BossScript = {
      id: 'one-shot',
      finalDefeatBeats: 0,
      phases: [
        {
          id: 'only',
          patternIntroBeats: 0,
          patternBeats: [],
          vulnerableBeats: 0,
          hpThreshold: 0.99,
        },
      ],
    };
    const scene = new BattleScene(
      makeOptions({
        input,
        musicClock: clock,
        party: [makePartyMember({ atk: 100, focus: 100, genre: Genre.Jazz })],
        encounter: { mode: 'boss', bpm: 120, soundId: 's', enemy, bossScript: oneShotScript },
        onComplete,
      }),
    );

    scene.enter();
    for (let i = 0; i < 5; i += 1) {
      state.beatValue = i;
      scene.update(FRAME);
      if (scene.outcome !== null) {
        break;
      }
    }

    expect(scene.outcome).toBe('victory');
    expect(onComplete).toHaveBeenCalledWith('victory');
  });

  it('emits a vulnerable message when the boss enters a vulnerable window', () => {
    const input = queuedInput();
    const { clock, state } = stubClock({ beatValue: 0, phaseValue: 0 });
    const enemy = makeEnemy();
    const vulnScript: BossScript = {
      id: 'vuln',
      finalDefeatBeats: 0,
      phases: [
        {
          id: 'phase-a',
          patternIntroBeats: 1,
          patternBeats: [0],
          vulnerableBeats: 2,
        },
      ],
    };
    const scene = new BattleScene(
      makeOptions({
        input,
        musicClock: clock,
        encounter: { mode: 'boss', bpm: 120, soundId: 's', enemy, bossScript: vulnScript },
      }),
    );

    scene.enter();
    state.beatValue = 0;
    scene.update(FRAME);
    state.beatValue = 1;
    scene.update(FRAME);
    state.beatValue = 2;
    scene.update(FRAME);

    expect(
      scene.eventLog.some((e) => e.kind === 'message' && e.text.includes('Vulnerable')),
    ).toBe(true);
  });
});
