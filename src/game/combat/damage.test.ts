import { describe, expect, it } from 'vitest';

import { computeDamage } from './damage';

describe('computeDamage', () => {
  it('returns a non-negative integer for baseline inputs', () => {
    const result = computeDamage({ attackerAtk: 50, defenderDef: 25, power: 40, damageMul: 1 });

    expect(Number.isInteger(result)).toBe(true);
    expect(result).toBe(80);
  });

  it('scales linearly with attack', () => {
    const lo = computeDamage({ attackerAtk: 10, defenderDef: 10, power: 50, damageMul: 1 });
    const hi = computeDamage({ attackerAtk: 20, defenderDef: 10, power: 50, damageMul: 1 });

    expect(hi).toBe(lo * 2);
  });

  it('scales inversely with defense', () => {
    const lo = computeDamage({ attackerAtk: 40, defenderDef: 10, power: 30, damageMul: 1 });
    const hi = computeDamage({ attackerAtk: 40, defenderDef: 20, power: 30, damageMul: 1 });

    expect(lo).toBe(hi * 2);
  });

  it('applies the rhythm multiplier', () => {
    const base = computeDamage({ attackerAtk: 30, defenderDef: 15, power: 20, damageMul: 1 });
    const perfect = computeDamage({ attackerAtk: 30, defenderDef: 15, power: 20, damageMul: 1.5 });
    const miss = computeDamage({ attackerAtk: 30, defenderDef: 15, power: 20, damageMul: 0.2 });

    expect(perfect).toBe(Math.floor(base * 1.5));
    expect(miss).toBe(Math.floor(base * 0.2));
  });

  it('floors fractional results', () => {
    const result = computeDamage({ attackerAtk: 7, defenderDef: 3, power: 5, damageMul: 1 });

    // 7*5*1 / 3 = 11.666... -> 11
    expect(result).toBe(11);
  });

  it('returns 0 when power is zero', () => {
    expect(computeDamage({ attackerAtk: 100, defenderDef: 10, power: 0, damageMul: 1 })).toBe(0);
  });

  it('returns 0 when damage multiplier is zero', () => {
    expect(computeDamage({ attackerAtk: 100, defenderDef: 10, power: 50, damageMul: 0 })).toBe(0);
  });

  it('clamps non-positive defense to 1 instead of dividing by zero', () => {
    const zero = computeDamage({ attackerAtk: 10, defenderDef: 0, power: 5, damageMul: 1 });
    const one = computeDamage({ attackerAtk: 10, defenderDef: 1, power: 5, damageMul: 1 });

    expect(zero).toBe(one);
    expect(zero).toBe(50);
  });

  it('treats negative inputs as zero', () => {
    expect(computeDamage({ attackerAtk: -10, defenderDef: 5, power: 10, damageMul: 1 })).toBe(0);
    expect(computeDamage({ attackerAtk: 10, defenderDef: 5, power: -10, damageMul: 1 })).toBe(0);
    expect(computeDamage({ attackerAtk: 10, defenderDef: 5, power: 10, damageMul: -1 })).toBe(0);
  });

  it('returns 0 for non-finite inputs', () => {
    expect(
      computeDamage({ attackerAtk: Number.NaN, defenderDef: 5, power: 10, damageMul: 1 }),
    ).toBe(0);
    expect(
      computeDamage({
        attackerAtk: 10,
        defenderDef: Number.POSITIVE_INFINITY,
        power: 10,
        damageMul: 1,
      }),
    ).toBe(0);
    expect(
      computeDamage({ attackerAtk: 10, defenderDef: 5, power: 10, damageMul: Number.NaN }),
    ).toBe(0);
  });
});
