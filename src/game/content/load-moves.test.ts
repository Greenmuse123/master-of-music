import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';

import brassBurst from '../../data/moves/brass-burst.json';
import blueShout from '../../data/moves/blue-shout.json';
import walkingBass from '../../data/moves/walking-bass.json';
import graceNote from '../../data/moves/grace-note.json';
import blueNoteBend from '../../data/moves/blue-note-bend.json';
import syncopation from '../../data/moves/syncopation.json';
import { loadAllMoves, loadMove } from './load-moves';

describe('loadMove', () => {
  it('accepts the shipped brass-burst move JSON', () => {
    const move = loadMove(brassBurst);
    expect(move).toEqual({
      kind: 'attack',
      moveId: 'brass-burst',
      name: 'Brass Burst',
      power: 30,
    });
  });

  it('accepts every other Phase-2 move JSON', () => {
    expect(loadMove(blueShout).moveId).toBe('blue-shout');
    expect(loadMove(walkingBass).moveId).toBe('walking-bass');
    expect(loadMove(graceNote).moveId).toBe('grace-note');
    expect(loadMove(blueNoteBend).moveId).toBe('blue-note-bend');
    expect(loadMove(syncopation).moveId).toBe('syncopation');
  });

  it('rejects a move missing a required field', () => {
    const broken: Record<string, unknown> = { ...brassBurst };
    delete broken['power'];
    expect(() => loadMove(broken)).toThrow(ZodError);
  });

  it('rejects a move whose power is the wrong type', () => {
    const broken = { ...brassBurst, power: 'thirty' };
    expect(() => loadMove(broken)).toThrow(ZodError);
  });

  it('rejects a move with an unknown genre', () => {
    const broken = { ...brassBurst, genre: 'reggae' };
    expect(() => loadMove(broken)).toThrow(ZodError);
  });

  it('rejects a move with an empty ownerIds array', () => {
    const broken = { ...brassBurst, ownerIds: [] };
    expect(() => loadMove(broken)).toThrow(ZodError);
  });
});

describe('loadAllMoves', () => {
  it('returns a map keyed by move id', () => {
    const map = loadAllMoves([brassBurst, blueShout, walkingBass]);
    expect(map.size).toBe(3);
    expect(map.get('brass-burst')?.power).toBe(30);
    expect(map.get('blue-shout')?.name).toBe('Blue Shout');
    expect(map.get('walking-bass')?.power).toBe(25);
  });

  it('throws on duplicate move ids', () => {
    expect(() => loadAllMoves([brassBurst, brassBurst])).toThrow(/duplicate move id/);
  });

  it('propagates a ZodError from a malformed record', () => {
    const broken: Record<string, unknown> = { ...brassBurst };
    delete broken['displayName'];
    expect(() => loadAllMoves([broken])).toThrow(ZodError);
  });
});
