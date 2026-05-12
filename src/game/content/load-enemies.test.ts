import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';

import hollowStreetlamp from '../../data/enemies/hollow-streetlamp.json';
import swampImp from '../../data/enemies/swamp-imp.json';
import sourNote from '../../data/enemies/sour-note.json';
import diminuendo from '../../data/enemies/diminuendo.json';
import { Genre } from '../combat/genres';
import { loadEnemy } from './load-enemies';

describe('loadEnemy', () => {
  it('accepts the shipped Hollow Streetlamp JSON (Phase-1 wiring)', () => {
    const enemy = loadEnemy(hollowStreetlamp);
    expect(enemy.id).toBe('hollow-streetlamp');
    expect(enemy.name).toBe('Hollow Streetlamp');
    expect(enemy.genre).toBe(Genre.Discord);
    expect(enemy.hp).toBe(30);
    expect(enemy.maxHp).toBe(30);
    expect(enemy.moves).toEqual([]);
  });

  it('accepts the Swamp Imp mook', () => {
    const enemy = loadEnemy(swampImp);
    expect(enemy.genre).toBe(Genre.Blues);
    expect(enemy.hp).toBe(25);
    expect(enemy.atk).toBe(10);
    expect(enemy.def).toBe(2);
    expect(enemy.focus).toBe(0);
  });

  it('accepts the Sour Note mook', () => {
    const enemy = loadEnemy(sourNote);
    expect(enemy.genre).toBe(Genre.Jazz);
    expect(enemy.hp).toBe(35);
    expect(enemy.atk).toBe(9);
    expect(enemy.def).toBe(4);
    expect(enemy.focus).toBe(20);
  });

  it('accepts the Diminuendo boss-instance combatant', () => {
    const enemy = loadEnemy(diminuendo);
    expect(enemy.genre).toBe(Genre.Blues);
    expect(enemy.hp).toBe(200);
    expect(enemy.maxHp).toBe(200);
    expect(enemy.atk).toBe(18);
    expect(enemy.def).toBe(10);
    expect(enemy.focus).toBe(70);
  });

  it('rejects an enemy missing a required field', () => {
    const broken: Record<string, unknown> = { ...hollowStreetlamp };
    delete broken['maxHp'];
    expect(() => loadEnemy(broken)).toThrow(ZodError);
  });

  it('rejects an enemy whose def is the wrong type', () => {
    const broken = { ...hollowStreetlamp, def: '3' };
    expect(() => loadEnemy(broken)).toThrow(ZodError);
  });

  it('rejects an enemy with an unknown genre', () => {
    const broken = { ...hollowStreetlamp, genre: 'reggae' };
    expect(() => loadEnemy(broken)).toThrow(ZodError);
  });

  it('rejects an enemy with negative hp', () => {
    const broken = { ...hollowStreetlamp, hp: -1 };
    expect(() => loadEnemy(broken)).toThrow(ZodError);
  });
});
