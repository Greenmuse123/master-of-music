import { describe, expect, it, vi } from 'vitest';

import { Genre } from '../combat/genres';
import type { Combatant } from '../combat/types';
import { makeDiminuendoEncounter } from './diminuendo';

const DIMINUENDO_ENEMY: Combatant & { readonly genre: Genre } = {
  id: 'diminuendo',
  name: 'Diminuendo',
  hp: 600,
  maxHp: 600,
  atk: 60,
  def: 40,
  focus: 90,
  genre: Genre.Blues,
};

describe('makeDiminuendoEncounter', () => {
  it('returns a 3-phase boss EncounterSpec at 90 bpm with sound id boss-diminuendo', () => {
    const lookupEnemy = vi.fn(() => DIMINUENDO_ENEMY);
    const spec = makeDiminuendoEncounter({ lookupEnemy });

    expect(spec.mode).toBe('boss');
    expect(spec.bpm).toBe(90);
    expect(spec.soundId).toBe('boss-diminuendo');
    expect(spec.enemy).toBe(DIMINUENDO_ENEMY);
    expect(lookupEnemy).toHaveBeenCalledWith('diminuendo');

    const script = spec.bossScript;
    expect(script).toBeDefined();
    expect(script!.id).toBe('diminuendo');
    expect(script!.finalDefeatBeats).toBe(8);
    expect(script!.phases).toHaveLength(3);
  });

  it('encodes the canonical hp thresholds [undefined, 0.66, 0.33]', () => {
    const spec = makeDiminuendoEncounter({ lookupEnemy: () => DIMINUENDO_ENEMY });
    const phases = spec.bossScript!.phases;

    expect(phases[0]?.hpThreshold).toBeUndefined();
    expect(phases[1]?.hpThreshold).toBe(0.66);
    expect(phases[2]?.hpThreshold).toBe(0.33);
  });

  it('grows pattern complexity and shrinks vulnerable windows across phases', () => {
    const spec = makeDiminuendoEncounter({ lookupEnemy: () => DIMINUENDO_ENEMY });
    const phases = spec.bossScript!.phases;

    expect(phases[0]?.patternIntroBeats).toBe(4);
    expect(phases[1]?.patternIntroBeats).toBe(6);
    expect(phases[2]?.patternIntroBeats).toBe(8);

    expect(phases[0]?.vulnerableBeats).toBe(8);
    expect(phases[1]?.vulnerableBeats).toBe(6);
    expect(phases[2]?.vulnerableBeats).toBe(4);

    // patternBeats strictly grow in cardinality phase-over-phase.
    expect(phases[0]?.patternBeats.length).toBeLessThan(phases[1]?.patternBeats.length ?? 0);
    expect(phases[1]?.patternBeats.length).toBeLessThan(phases[2]?.patternBeats.length ?? 0);
  });
});
