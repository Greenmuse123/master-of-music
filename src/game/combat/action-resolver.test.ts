import { describe, expect, it } from 'vitest';

import { resolveAction } from './action-resolver';
import type { Combatant, MoveAction, RhythmResult } from './types';

function makeCombatant(overrides: Partial<Combatant> = {}): Combatant {
  return {
    id: 'sol',
    name: 'Sol',
    hp: 100,
    maxHp: 100,
    atk: 40,
    def: 20,
    focus: 50,
    ...overrides,
  };
}

const ATTACK: MoveAction = {
  kind: 'attack',
  moveId: 'brass-burst',
  name: 'Brass Burst',
  power: 30,
};

const PERFECT: RhythmResult = {
  quality: 'perfect',
  damageMul: 1.5,
  resReturn: 4,
  deltaMs: 0,
};

const GOOD: RhythmResult = {
  quality: 'good',
  damageMul: 1,
  resReturn: 2,
  deltaMs: 120,
};

const MISS: RhythmResult = {
  quality: 'miss',
  damageMul: 0.2,
  resReturn: 0,
  deltaMs: 400,
};

describe('resolveAction', () => {
  it('emits a use message, then a damage event with the rhythm quality', () => {
    const attacker = makeCombatant({ id: 'sol', name: 'Sol' });
    const defender = makeCombatant({ id: 'shade', name: 'Shade', hp: 60 });

    const events = resolveAction(ATTACK, attacker, defender, GOOD);

    expect(events[0]).toEqual({ kind: 'message', text: 'Sol uses Brass Burst!' });
    const damage = events.find((event) => event.kind === 'damage');
    expect(damage).toBeDefined();
    expect(damage).toMatchObject({
      kind: 'damage',
      attackerId: 'sol',
      defenderId: 'shade',
      quality: 'good',
    });
  });

  it('flags perfect hits with an extra message and applies the 1.5x multiplier', () => {
    const attacker = makeCombatant();
    const defender = makeCombatant({ id: 'shade', hp: 200 });

    const events = resolveAction(ATTACK, attacker, defender, PERFECT);

    expect(events.some((event) => event.kind === 'message' && event.text === 'Perfect!')).toBe(
      true,
    );

    const damage = events.find((event) => event.kind === 'damage');
    expect(damage?.kind === 'damage' ? damage.amount : 0).toBe(
      Math.floor((40 * 30 * 1.5) / 20),
    );
  });

  it('flags misses with an "Off-beat!" message and reduced damage', () => {
    const attacker = makeCombatant();
    const defender = makeCombatant({ id: 'shade', hp: 200 });

    const events = resolveAction(ATTACK, attacker, defender, MISS);

    expect(events.some((event) => event.kind === 'message' && event.text === 'Off-beat!')).toBe(
      true,
    );

    const damage = events.find((event) => event.kind === 'damage');
    expect(damage?.kind === 'damage' ? damage.amount : -1).toBe(
      Math.floor((40 * 30 * 0.2) / 20),
    );
  });

  it('appends a ko event when defender HP would drop to zero', () => {
    const attacker = makeCombatant();
    const defender = makeCombatant({ id: 'shade', hp: 5 });

    const events = resolveAction(ATTACK, attacker, defender, PERFECT);

    expect(events.at(-1)).toEqual({ kind: 'ko', combatantId: 'shade' });
  });

  it('does NOT append a ko event when defender survives', () => {
    const attacker = makeCombatant();
    const defender = makeCombatant({ id: 'shade', hp: 999 });

    const events = resolveAction(ATTACK, attacker, defender, GOOD);

    expect(events.some((event) => event.kind === 'ko')).toBe(false);
  });

  it('is deterministic — same inputs produce identical output', () => {
    const a1 = makeCombatant();
    const d1 = makeCombatant({ id: 'shade', hp: 50 });
    const a2 = makeCombatant();
    const d2 = makeCombatant({ id: 'shade', hp: 50 });

    expect(resolveAction(ATTACK, a1, d1, GOOD)).toEqual(resolveAction(ATTACK, a2, d2, GOOD));
  });

  it('does not mutate the attacker or defender', () => {
    const attacker = makeCombatant();
    const defender = makeCombatant({ id: 'shade', hp: 5 });

    resolveAction(ATTACK, attacker, defender, PERFECT);

    expect(attacker.hp).toBe(100);
    expect(defender.hp).toBe(5);
  });
});
