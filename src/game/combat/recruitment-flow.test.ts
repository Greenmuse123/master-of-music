import { describe, expect, it, vi } from 'vitest';

import type { MusicClock } from '../../engine/audio/music-clock';
import type { InputManager } from '../../engine/input/input-manager';
import type { Renderer } from '../../engine/render/renderer';
import type { Textbox } from '../../ui/textbox';
import { BattleScene } from './battle-scene';
import { Genre } from './genres';
import { attemptRecruit, type RecruitmentFlowDefender } from './recruitment-flow';
import type { Combatant, EncounterSpec, PartyMember } from './types';

const defender: RecruitmentFlowDefender = {
  id: 'enemy-mook-001',
  name: 'Bayou Mook',
  hp: 8,
  maxHp: 100,
  atk: 10,
  def: 8,
  focus: 6,
  genre: Genre.Blues,
};

describe('attemptRecruit (flow shim)', () => {
  it('recruits when hp, signal genre, and dialogue all pass (uses defender genre default)', () => {
    expect(
      attemptRecruit({
        defender,
        enemyHpFraction: 0.1,
        signalGenre: Genre.Blues,
        dialogueOk: true,
      }),
    ).toEqual({ kind: 'recruited', combatantId: defender.id });
  });

  it('recruits when an explicit preferred genre matches the signal', () => {
    expect(
      attemptRecruit({
        defender,
        enemyHpFraction: 0.1,
        signalGenre: Genre.Jazz,
        dialogueOk: true,
        defenderPreferredGenre: Genre.Jazz,
      }),
    ).toEqual({ kind: 'recruited', combatantId: defender.id });
  });

  it('rejects when hp is at the 0.25 strict threshold', () => {
    expect(
      attemptRecruit({
        defender,
        enemyHpFraction: 0.25,
        signalGenre: Genre.Blues,
        dialogueOk: true,
      }),
    ).toEqual({ kind: 'rejected', reason: 'hp-too-high' });
  });

  it('rejects with wrong-genre when signal does not match the (defaulted) preferred genre', () => {
    expect(
      attemptRecruit({
        defender,
        enemyHpFraction: 0.1,
        signalGenre: Genre.Rock,
        dialogueOk: true,
      }),
    ).toEqual({ kind: 'rejected', reason: 'wrong-genre' });
  });

  it('rejects with wrong-genre when the explicit preferred genre does not match', () => {
    expect(
      attemptRecruit({
        defender,
        enemyHpFraction: 0.1,
        signalGenre: Genre.Blues,
        dialogueOk: true,
        defenderPreferredGenre: Genre.Jazz,
      }),
    ).toEqual({ kind: 'rejected', reason: 'wrong-genre' });
  });

  it('rejects with dialogue-failed when hp + genre pass but dialogue is bad', () => {
    expect(
      attemptRecruit({
        defender,
        enemyHpFraction: 0.1,
        signalGenre: Genre.Blues,
        dialogueOk: false,
      }),
    ).toEqual({ kind: 'rejected', reason: 'dialogue-failed' });
  });

  it('defaults the preferred genre to the defender\'s own genre when undefined', () => {
    // Same call as the first success case, but assert that omitting
    // `defenderPreferredGenre` still routes via the defender's own genre.
    const result = attemptRecruit({
      defender,
      enemyHpFraction: 0.05,
      signalGenre: defender.genre,
      dialogueOk: true,
    });
    expect(result.kind).toBe('recruited');
  });
});

/* ---------------------------------------------------------------------------
 * BattleScene integration smoke
 *
 * Drives a real BattleScene to <25% HP, then calls `attemptRecruit` with a
 * matching signal + ok dialogue and confirms the scene transitions to the
 * `'recruited'` outcome and `onComplete('recruited')` fires exactly once.
 *
 * Kept lightweight: we don't simulate the full rhythm loop, we just clamp
 * the enemy below threshold by sending one critical hit at a low-HP enemy.
 * --------------------------------------------------------------------------*/

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

function stubClock(): MusicClock {
  return {
    start: vi.fn(),
    stop: vi.fn(),
    beat: vi.fn(() => 0),
    beatPhase: vi.fn(() => 0),
    msUntilBeat: vi.fn(() => 0),
  } as unknown as MusicClock;
}

function stubInput(presses: boolean[]): InputManager {
  const beatPress = [...presses];
  return {
    pressed: vi.fn((action: string) => {
      if (action === 'beat-press') {
        return beatPress.shift() ?? false;
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

function jazzParty(): PartyMember {
  return {
    id: 'sol',
    name: 'Sol',
    hp: 100,
    maxHp: 100,
    atk: 200, // big atk so one critical drops the enemy below threshold
    def: 20,
    focus: 100,
    genre: Genre.Jazz,
    moves: [{ kind: 'attack', moveId: 'brass-burst', name: 'Brass Burst', power: 30 }],
  };
}

function lowHpEnemy(): Combatant & { genre: Genre } {
  return {
    id: 'mook-1',
    name: 'Mook',
    hp: 100,
    maxHp: 1000, // hp fraction = 0.1 from the start
    atk: 10,
    def: 1,
    focus: 0,
    genre: Genre.Blues,
  };
}

describe('BattleScene.attemptRecruit (integration smoke)', () => {
  it('drives a real scene below 25% hp and completes via recruitment on a matching signal', () => {
    const onComplete = vi.fn();
    const enemy = lowHpEnemy();
    const encounter: EncounterSpec = {
      mode: 'normal',
      bpm: 120,
      soundId: 'placeholder',
      enemy,
      defenderPreferredGenre: Genre.Jazz,
    };
    const scene = new BattleScene({
      renderer: stubRenderer(),
      input: stubInput([]),
      musicClock: stubClock(),
      textbox: stubTextbox(),
      party: [jazzParty()],
      encounter,
      rng: () => 0.5,
      onComplete,
    });

    scene.enter();
    // hp fraction is already 100/1000 = 0.1 (well below 0.25 threshold).
    expect(scene.enemyHp).toBe(100);

    const result = scene.attemptRecruit(Genre.Jazz, true);

    expect(result).toEqual({ kind: 'recruited', combatantId: enemy.id });
    expect(scene.outcome).toBe('recruited');
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith('recruited');
    expect(
      scene.eventLog.some(
        (e) => e.kind === 'message' && e.text.includes('joins the band'),
      ),
    ).toBe(true);

    // touch the render path so the stub-ctx mock stays exercised
    scene.render(stubCtx());
  });

  it('does not complete the battle when recruitment is rejected (hp too high)', () => {
    const onComplete = vi.fn();
    const enemy = lowHpEnemy();
    const fullHpEnemy = { ...enemy, hp: 1000, maxHp: 1000 }; // hp fraction = 1.0
    const scene = new BattleScene({
      renderer: stubRenderer(),
      input: stubInput([]),
      musicClock: stubClock(),
      textbox: stubTextbox(),
      party: [jazzParty()],
      encounter: {
        mode: 'normal',
        bpm: 120,
        soundId: 'placeholder',
        enemy: fullHpEnemy,
        defenderPreferredGenre: Genre.Jazz,
      },
      rng: () => 0.5,
      onComplete,
    });

    scene.enter();
    const result = scene.attemptRecruit(Genre.Jazz, true);

    expect(result).toEqual({ kind: 'rejected', reason: 'hp-too-high' });
    expect(scene.outcome).toBeNull();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('does not complete the battle when the signal genre is wrong', () => {
    const onComplete = vi.fn();
    const enemy = lowHpEnemy();
    const scene = new BattleScene({
      renderer: stubRenderer(),
      input: stubInput([]),
      musicClock: stubClock(),
      textbox: stubTextbox(),
      party: [jazzParty()],
      encounter: {
        mode: 'normal',
        bpm: 120,
        soundId: 'placeholder',
        enemy,
        defenderPreferredGenre: Genre.Jazz,
      },
      rng: () => 0.5,
      onComplete,
    });

    scene.enter();
    const result = scene.attemptRecruit(Genre.Rock, true);

    expect(result).toEqual({ kind: 'rejected', reason: 'wrong-genre' });
    expect(scene.outcome).toBeNull();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('does not complete the battle when the dialogue check fails', () => {
    const onComplete = vi.fn();
    const enemy = lowHpEnemy();
    const scene = new BattleScene({
      renderer: stubRenderer(),
      input: stubInput([]),
      musicClock: stubClock(),
      textbox: stubTextbox(),
      party: [jazzParty()],
      encounter: {
        mode: 'normal',
        bpm: 120,
        soundId: 'placeholder',
        enemy,
        defenderPreferredGenre: Genre.Jazz,
      },
      rng: () => 0.5,
      onComplete,
    });

    scene.enter();
    const result = scene.attemptRecruit(Genre.Jazz, false);

    expect(result).toEqual({ kind: 'rejected', reason: 'dialogue-failed' });
    expect(scene.outcome).toBeNull();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('defaults preferred genre to the enemy\'s own genre when EncounterSpec omits it', () => {
    const onComplete = vi.fn();
    const enemy = lowHpEnemy(); // Blues
    const scene = new BattleScene({
      renderer: stubRenderer(),
      input: stubInput([]),
      musicClock: stubClock(),
      textbox: stubTextbox(),
      party: [jazzParty()],
      encounter: {
        mode: 'normal',
        bpm: 120,
        soundId: 'placeholder',
        enemy,
        // no defenderPreferredGenre — fall back to enemy.genre (Blues)
      },
      rng: () => 0.5,
      onComplete,
    });

    scene.enter();

    expect(scene.attemptRecruit(Genre.Jazz, true)).toEqual({
      kind: 'rejected',
      reason: 'wrong-genre',
    });
    expect(scene.attemptRecruit(Genre.Blues, true)).toEqual({
      kind: 'recruited',
      combatantId: enemy.id,
    });
    expect(scene.outcome).toBe('recruited');
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith('recruited');
  });

  it('is idempotent after the scene already finished (does not double-fire onComplete)', () => {
    const onComplete = vi.fn();
    const enemy = lowHpEnemy();
    const scene = new BattleScene({
      renderer: stubRenderer(),
      input: stubInput([]),
      musicClock: stubClock(),
      textbox: stubTextbox(),
      party: [jazzParty()],
      encounter: {
        mode: 'normal',
        bpm: 120,
        soundId: 'placeholder',
        enemy,
        defenderPreferredGenre: Genre.Jazz,
      },
      rng: () => 0.5,
      onComplete,
    });

    scene.enter();
    scene.attemptRecruit(Genre.Jazz, true);
    expect(onComplete).toHaveBeenCalledTimes(1);

    // Second attempt: result still says recruited (pure-logic), but the scene
    // must not invoke onComplete again because the outcome is already set.
    scene.attemptRecruit(Genre.Jazz, true);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
