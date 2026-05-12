import { describe, expect, it, vi } from 'vitest';

import { Genre } from '../combat/genres';
import type { Combatant } from '../combat/types';
import {
  BossEncounterSchema,
  NormalEncounterSchema,
  loadEncounter,
  type EnemyLookup,
} from './load-encounter';

const makeEnemy = (id: string, genre: Genre = Genre.Blues): Combatant & { readonly genre: Genre } => ({
  id,
  name: `${id}-name`,
  hp: 100,
  maxHp: 100,
  atk: 30,
  def: 20,
  focus: 50,
  genre,
});

const makeLookup = (enemy: Combatant & { readonly genre: Genre }): EnemyLookup =>
  vi.fn((id: string) => {
    if (id !== enemy.id) {
      throw new Error(`unknown enemy: ${id}`);
    }
    return enemy;
  });

const VALID_BOSS_JSON = {
  mode: 'boss',
  enemyId: 'diminuendo',
  bpm: 90,
  soundId: 'boss-diminuendo',
  bossScript: {
    id: 'diminuendo',
    finalDefeatBeats: 8,
    phases: [
      { id: 'a', patternIntroBeats: 4, patternBeats: [0, 4], vulnerableBeats: 8 },
      { id: 'b', patternIntroBeats: 6, patternBeats: [0, 4, 6], vulnerableBeats: 6, hpThreshold: 0.66 },
      { id: 'c', patternIntroBeats: 8, patternBeats: [0, 4, 6, 8], vulnerableBeats: 4, hpThreshold: 0.33 },
    ],
  },
};

const VALID_NORMAL_JSON = {
  mode: 'normal',
  enemyId: 'bayou-mook',
  bpm: 110,
  soundId: 'battle-bayou-mook',
};

describe('BossEncounterSchema', () => {
  it('accepts a valid boss encounter document', () => {
    expect(BossEncounterSchema.parse(VALID_BOSS_JSON).mode).toBe('boss');
  });

  it('rejects a boss encounter missing the bossScript', () => {
    const bad: Record<string, unknown> = { ...VALID_BOSS_JSON };
    delete bad['bossScript'];
    expect(() => BossEncounterSchema.parse(bad)).toThrow();
  });

  it('rejects an hpThreshold outside (0, 1]', () => {
    const bad = {
      ...VALID_BOSS_JSON,
      bossScript: {
        ...VALID_BOSS_JSON.bossScript,
        phases: [
          { id: 'a', patternIntroBeats: 4, patternBeats: [0], vulnerableBeats: 4, hpThreshold: 1.5 },
        ],
      },
    };
    expect(() => BossEncounterSchema.parse(bad)).toThrow();
  });

  it('rejects extra unknown keys (strict mode)', () => {
    const bad = { ...VALID_BOSS_JSON, surprise: true };
    expect(() => BossEncounterSchema.parse(bad)).toThrow();
  });

  it('rejects an empty phases array', () => {
    const bad = {
      ...VALID_BOSS_JSON,
      bossScript: { ...VALID_BOSS_JSON.bossScript, phases: [] },
    };
    expect(() => BossEncounterSchema.parse(bad)).toThrow();
  });
});

describe('NormalEncounterSchema', () => {
  it('accepts a valid normal encounter document', () => {
    expect(NormalEncounterSchema.parse(VALID_NORMAL_JSON).mode).toBe('normal');
  });

  it('rejects a non-positive bpm', () => {
    expect(() =>
      NormalEncounterSchema.parse({ ...VALID_NORMAL_JSON, bpm: 0 }),
    ).toThrow();
  });

  it('rejects a normal encounter that includes a bossScript', () => {
    const bad = { ...VALID_NORMAL_JSON, bossScript: VALID_BOSS_JSON.bossScript };
    expect(() => NormalEncounterSchema.parse(bad)).toThrow();
  });
});

describe('loadEncounter', () => {
  it('returns a boss-mode EncounterSpec with cloned phases and resolved enemy', () => {
    const enemy = makeEnemy('diminuendo');
    const lookup = makeLookup(enemy);

    const spec = loadEncounter(VALID_BOSS_JSON, { lookupEnemy: lookup });

    expect(spec.mode).toBe('boss');
    expect(spec.bpm).toBe(90);
    expect(spec.soundId).toBe('boss-diminuendo');
    expect(spec.enemy).toBe(enemy);
    expect(lookup).toHaveBeenCalledWith('diminuendo');

    expect(spec.bossScript).toBeDefined();
    const script = spec.bossScript!;
    expect(script.id).toBe('diminuendo');
    expect(script.finalDefeatBeats).toBe(8);
    expect(script.phases).toHaveLength(3);
    expect(script.phases[0]?.hpThreshold).toBeUndefined();
    expect(script.phases[1]?.hpThreshold).toBe(0.66);
    expect(script.phases[2]?.hpThreshold).toBe(0.33);

    // patternBeats should be cloned, not aliased to the JSON literal.
    expect(script.phases[0]?.patternBeats).not.toBe(
      VALID_BOSS_JSON.bossScript.phases[0]?.patternBeats,
    );
    expect(script.phases[0]?.patternBeats).toEqual([0, 4]);
  });

  it('returns a normal-mode EncounterSpec without a bossScript', () => {
    const enemy = makeEnemy('bayou-mook', Genre.Folk);
    const spec = loadEncounter(VALID_NORMAL_JSON, { lookupEnemy: makeLookup(enemy) });

    expect(spec.mode).toBe('normal');
    expect(spec.bossScript).toBeUndefined();
    expect(spec.enemy).toBe(enemy);
  });

  it('throws if the JSON is not a recognised encounter shape', () => {
    expect(() => loadEncounter({ mode: 'wat' }, { lookupEnemy: makeLookup(makeEnemy('x')) })).toThrow();
  });

  it('propagates errors from the injected lookupEnemy', () => {
    expect(() =>
      loadEncounter(VALID_NORMAL_JSON, {
        lookupEnemy: () => {
          throw new Error('boom');
        },
      }),
    ).toThrow(/boom/);
  });
});
