import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';

import sol from '../../data/instruments/sol.json';
import vel from '../../data/instruments/vel.json';
import pete from '../../data/instruments/pete.json';
import brassBurst from '../../data/moves/brass-burst.json';
import blueShout from '../../data/moves/blue-shout.json';
import walkingBass from '../../data/moves/walking-bass.json';
import graceNote from '../../data/moves/grace-note.json';
import blueNoteBend from '../../data/moves/blue-note-bend.json';
import syncopation from '../../data/moves/syncopation.json';
import { Genre } from '../combat/genres';
import type { MoveAction } from '../combat/types';
import { loadInstrument } from './load-instruments';
import { loadAllMoves } from './load-moves';

function makeLookup(): (id: string) => MoveAction | undefined {
  const map = loadAllMoves([
    brassBurst,
    blueShout,
    walkingBass,
    graceNote,
    blueNoteBend,
    syncopation,
  ]);
  return (id) => map.get(id);
}

describe('loadInstrument', () => {
  it('accepts Sol with the documented placeholder stats', () => {
    const member = loadInstrument(sol, makeLookup());
    expect(member.id).toBe('sol');
    expect(member.name).toBe('Sol Reed');
    expect(member.genre).toBe(Genre.Jazz);
    expect(member.hp).toBe(50);
    expect(member.maxHp).toBe(50);
    expect(member.atk).toBe(12);
    expect(member.def).toBe(5);
    expect(member.focus).toBe(50);
    expect(member.moves.map((m) => m.moveId)).toEqual(['brass-burst', 'syncopation']);
  });

  it('accepts Vel with the documented stats and resolves both moves', () => {
    const member = loadInstrument(vel, makeLookup());
    expect(member.genre).toBe(Genre.Jazz);
    expect(member.hp).toBe(40);
    expect(member.atk).toBe(16);
    expect(member.def).toBe(4);
    expect(member.focus).toBe(60);
    expect(member.moves.map((m) => m.moveId)).toEqual(['blue-shout', 'grace-note']);
  });

  it('accepts Pete with the documented stats and resolves both moves', () => {
    const member = loadInstrument(pete, makeLookup());
    expect(member.genre).toBe(Genre.Blues);
    expect(member.hp).toBe(70);
    expect(member.atk).toBe(8);
    expect(member.def).toBe(8);
    expect(member.focus).toBe(40);
    expect(member.moves.map((m) => m.moveId)).toEqual(['walking-bass', 'blue-note-bend']);
  });

  it('rejects an instrument missing a required field', () => {
    const broken: Record<string, unknown> = { ...sol };
    delete broken['atk'];
    expect(() => loadInstrument(broken, makeLookup())).toThrow(ZodError);
  });

  it('rejects an instrument whose hp is the wrong type', () => {
    const broken = { ...sol, hp: 'fifty' };
    expect(() => loadInstrument(broken, makeLookup())).toThrow(ZodError);
  });

  it('rejects an instrument with focus out of range', () => {
    const broken = { ...sol, focus: 150 };
    expect(() => loadInstrument(broken, makeLookup())).toThrow(ZodError);
  });

  it('throws on an unresolved move id', () => {
    const empty: (id: string) => MoveAction | undefined = () => undefined;
    expect(() => loadInstrument(sol, empty)).toThrow(/unknown move id/);
  });
});
