import { describe, expect, it, vi } from 'vitest';

import { Genre } from '../combat/genres';
import type { Combatant } from '../combat/types';
import { makeBayouMookEncounter } from './bayou-mook';

const BAYOU_MOOK_ENEMY: Combatant & { readonly genre: Genre } = {
  id: 'bayou-mook',
  name: 'Bayou Crooner',
  hp: 60,
  maxHp: 60,
  atk: 18,
  def: 10,
  focus: 35,
  genre: Genre.Folk,
};

describe('makeBayouMookEncounter', () => {
  it('returns a normal-mode EncounterSpec with no boss script', () => {
    const lookupEnemy = vi.fn(() => BAYOU_MOOK_ENEMY);
    const spec = makeBayouMookEncounter({ lookupEnemy });

    expect(spec.mode).toBe('normal');
    expect(spec.bossScript).toBeUndefined();
    expect(spec.enemy).toBe(BAYOU_MOOK_ENEMY);
    expect(lookupEnemy).toHaveBeenCalledWith('bayou-mook');
  });

  it('pulls bpm and soundId from the encounter JSON', () => {
    const spec = makeBayouMookEncounter({ lookupEnemy: () => BAYOU_MOOK_ENEMY });

    expect(spec.bpm).toBeGreaterThan(0);
    expect(spec.soundId).toBe('battle-bayou-mook');
  });

  it('propagates lookup errors', () => {
    expect(() =>
      makeBayouMookEncounter({
        lookupEnemy: () => {
          throw new Error('enemy not found');
        },
      }),
    ).toThrow(/enemy not found/);
  });
});
